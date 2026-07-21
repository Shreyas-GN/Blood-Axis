import os
import jwt
from jwt import PyJWKClient
from rest_framework import authentication, exceptions
from django.contrib.auth.models import User

# Module-level singleton so the JWKS client and its key cache survive across requests.
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = os.getenv('CLERK_JWKS_URL', '')
        if not jwks_url:
            raise exceptions.AuthenticationFailed(
                'Server misconfiguration: CLERK_JWKS_URL not set'
            )
        # cache_jwk_set=True (default) keeps the JWKS response cached for `lifespan`
        # seconds (default 300 s).  On a cache miss or kid mismatch the client
        # re-fetches automatically.
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


class ClerkAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]

        try:
            client = _get_jwks_client()
            signing_key = client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token, 
                signing_key.key, 
                algorithms=['RS256'],
                options={'verify_iat': False, 'verify_nbf': False},
                leeway=300
            )
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError as exc:
            raise exceptions.AuthenticationFailed(f'Invalid token: {exc}')
        except exceptions.AuthenticationFailed:
            raise
        except Exception as exc:
            raise exceptions.AuthenticationFailed(f'Authentication error: {exc}')

        clerk_id = payload.get('sub')
        if not clerk_id:
            raise exceptions.AuthenticationFailed('Invalid Clerk token: no sub claim')

        user, _ = User.objects.get_or_create(username=clerk_id)

        from .models import DonorProfile
        DonorProfile.objects.get_or_create(
            id=clerk_id,
            defaults={
                "full_name": payload.get('name', 'Clerk User'),
                "phone": payload.get('phone_number', '+919999999999'),
                "blood_group": payload.get('blood_group', 'O+'),
                "is_donor": True
            }
        )
        return (user, None)
