from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import connection
from .models import BloodRequest, DonorProfile
from .serializers import BloodRequestSerializer, DonorProfileSerializer
from .services import MatchingEngineClient

class DonorProfileViewSet(viewsets.ModelViewSet):
    queryset = DonorProfile.objects.all()
    serializer_class = DonorProfileSerializer

    @action(detail=False, methods=['post'], url_path='upsert')
    def upsert(self, request):
        user_id = request.data.get('id')
        if not user_id:
            return Response({"error": "id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # update or create
        profile, created = DonorProfile.objects.update_or_create(
            id=user_id,
            defaults={
                'full_name': request.data.get('full_name'),
                'phone': request.data.get('phone'),
                'blood_group': request.data.get('blood_group'),
                'is_donor': request.data.get('is_donor', False),
                'is_available_donor': request.data.get('is_available_donor', False),
                'city': request.data.get('city'),
                'profile_completed': request.data.get('profile_completed', False),
                'location': request.data.get('location'),
                'latitude': request.data.get('latitude'),
                'longitude': request.data.get('longitude'),
            }
        )
        serializer = self.get_serializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)


class BloodRequestViewSet(viewsets.ModelViewSet):
    queryset = BloodRequest.objects.all()
    serializer_class = BloodRequestSerializer

    def create(self, request, *args, **kwargs):
        # Frontend sends 'requester_id' but DRF ModelSerializer expects 'requester' (FK field name)
        data = dict(request.data)
        if 'requester_id' in data and 'requester' not in data:
            data['requester'] = data.pop('requester_id')

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        lat = request.data.get('latitude')
        lng = request.data.get('longitude')

        blood_request = serializer.save()

        matching_result = None
        if lat is not None and lng is not None:
            client = MatchingEngineClient()
            matching_result = client.trigger_matching(blood_request, lat, lng)

        return Response({
            "request": serializer.data,
            "matching_triggered": matching_result is not None,
            "matching_engine_response": matching_result
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='cancel')
    def cancel(self, request, pk=None):
        blood_request = self.get_object()
        requester_id = request.user.username  # Clerk ID stored as Django username

        if blood_request.requester_id != requester_id:
            return Response(
                {"success": False, "error": {"code": "ACCESS_DENIED", "message": "You can only cancel your own requests."}},
                status=status.HTTP_403_FORBIDDEN
            )

        if blood_request.status in ('fulfilled', 'cancelled', 'expired'):
            return Response(
                {"success": False, "error": {"code": "REQUEST_ALREADY_CLOSED", "message": "This request is already closed."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        blood_request.status = 'cancelled'
        blood_request.save(update_fields=['status'])

        return Response({"success": True, "message": "Request cancelled"})

    @action(detail=True, methods=['patch'], url_path='fulfill')
    def fulfill(self, request, pk=None):
        blood_request = self.get_object()
        requester_id = request.user.username

        if blood_request.requester_id != requester_id:
            return Response(
                {"success": False, "error": {"code": "ACCESS_DENIED", "message": "You can only fulfill your own requests."}},
                status=status.HTTP_403_FORBIDDEN
            )

        if blood_request.status in ('fulfilled', 'cancelled', 'expired'):
            return Response(
                {"success": False, "error": {"code": "REQUEST_ALREADY_CLOSED", "message": "This request is already closed."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        blood_request.status = 'fulfilled'
        blood_request.save(update_fields=['status'])

        return Response({"success": True, "message": "Request fulfilled"})

    @action(detail=True, methods=['post'], url_path='accept')
    def accept(self, request, pk=None):
        blood_request = self.get_object()
        donor_id = request.user.username

        if blood_request.requester_id == donor_id:
            return Response(
                {"success": False, "error": {"code": "ACCESS_DENIED", "message": "You cannot accept your own request."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        if blood_request.status in ('fulfilled', 'cancelled', 'expired'):
            return Response(
                {"success": False, "error": {"code": "REQUEST_ALREADY_CLOSED", "message": "This request is no longer active."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO donor_responses (id, request_id, donor_id, status, responded_at, created_at)
                VALUES (gen_random_uuid(), %s, %s, 'ACCEPTED', now(), now())
                ON CONFLICT (request_id, donor_id)
                DO UPDATE SET status = 'ACCEPTED', responded_at = now()
            """, [str(pk), donor_id])

            cursor.execute("""
                UPDATE blood_requests
                SET confirmed_count = confirmed_count + 1,
                    status = 'donor_accepted'
                WHERE id = %s
                  AND status NOT IN ('fulfilled', 'cancelled', 'expired')
            """, [str(pk)])

        return Response({"success": True, "message": "Accepted"})

    @action(detail=True, methods=['post'], url_path='decline')
    def decline(self, request, pk=None):
        blood_request = self.get_object()
        donor_id = request.user.username

        if blood_request.status in ('fulfilled', 'cancelled', 'expired'):
            return Response(
                {"success": False, "error": {"code": "REQUEST_ALREADY_CLOSED", "message": "This request is no longer active."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE donor_responses
                SET status = 'CANCELLED'
                WHERE request_id = %s AND donor_id = %s
            """, [str(pk), donor_id])

        return Response({"success": True, "message": "Declined"})
