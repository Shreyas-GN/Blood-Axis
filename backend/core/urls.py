from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BloodRequestViewSet, DonorProfileViewSet

router = DefaultRouter()
router.register(r'requests', BloodRequestViewSet)
router.register(r'profiles', DonorProfileViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
