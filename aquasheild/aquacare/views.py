from django.shortcuts import render
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import User, Village
from .serializers import UserSerializer, VillageSerializer


@api_view(['GET'])
def get_villages_for_gis_map(request):
    villages = Village.objects.all()
    serializer = VillageSerializer(villages, many=True)
    return Response(serializer.data)


# Create your views here.
def home(request):
    return render(request, 'home.html')


# ─── Auth API Views ────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    POST /api/auth/login/
    Body: { "username": "...", "password": "..." }
    Returns: { "token": "...", "user": { ... } }
    """
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    if not username or not password:
        return Response(
            {'error': 'Username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=username, password=password)
    if user is None:
        return Response(
            {'error': 'Invalid username or password.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {'error': 'This account has been deactivated. Contact your administrator.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    token, _ = Token.objects.get_or_create(user=user)
    serializer = UserSerializer(user)
    return Response({'token': token.key, 'user': serializer.data})


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    POST /api/auth/register/
    Public self-registration — ALWAYS creates a COMMUNITY user.
    Any role sent by the client is ignored for security.
    """
    data = request.data
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    phone = data.get('phone', '').strip()

    if not username or not password:
        return Response(
            {'error': 'Username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'A user with this username already exists.'},
            status=status.HTTP_409_CONFLICT,
        )

    if email and User.objects.filter(email=email).exists():
        return Response(
            {'error': 'A user with this email already exists.'},
            status=status.HTTP_409_CONFLICT,
        )

    # SECURITY: Always force COMMUNITY role on public registration
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role='COMMUNITY',
        phone=phone or None,
    )

    token, _ = Token.objects.get_or_create(user=user)
    serializer = UserSerializer(user)
    return Response(
        {'token': token.key, 'user': serializer.data},
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    POST /api/auth/logout/
    Deletes the user's auth token.
    """
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    return Response({'detail': 'Logged out successfully.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    GET /api/auth/me/
    Returns the currently authenticated user's profile.
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


# ─── User Management API Views ────────────────────────────────────
# Admin (AUTHORITY role) can manage other AUTHORITY accounts.
# Authority can manage HEALTH_WORKER accounts.
# ──────────────────────────────────────────────────────────────────

def _is_authority(user):
    """Check if user has AUTHORITY role."""
    return user.is_authenticated and user.role == 'AUTHORITY'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def manage_list_users(request):
    """
    GET /api/manage/users/?role=AUTHORITY|HEALTH_WORKER|COMMUNITY
    - Admin (AUTHORITY + is_superuser or is_staff): can see all roles
    - Authority: can see HEALTH_WORKER only
    """
    if not _is_authority(request.user):
        return Response(
            {'error': 'Permission denied. Authority role required.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    role_filter = request.query_params.get('role', '').upper()

    # Authority users can only see HEALTH_WORKERs they manage
    if role_filter == 'HEALTH_WORKER':
        users = User.objects.filter(role='HEALTH_WORKER').order_by('-date_joined')
    elif role_filter == 'AUTHORITY':
        users = User.objects.filter(role='AUTHORITY').order_by('-date_joined')
    elif role_filter == 'COMMUNITY':
        users = User.objects.filter(role='COMMUNITY').order_by('-date_joined')
    else:
        # Default: show authorities + health workers (not community for admin panel)
        users = User.objects.filter(
            role__in=['AUTHORITY', 'HEALTH_WORKER']
        ).order_by('-date_joined')

    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def manage_create_authority(request):
    """
    POST /api/manage/users/create-authority/
    Only AUTHORITY users can create other AUTHORITY accounts.
    """
    if not _is_authority(request.user):
        return Response(
            {'error': 'Permission denied. Authority role required.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    data = request.data
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    phone = data.get('phone', '').strip()
    organization = data.get('organization', '').strip()

    if not username or not password:
        return Response(
            {'error': 'Username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'A user with this username already exists.'},
            status=status.HTTP_409_CONFLICT,
        )

    if email and User.objects.filter(email=email).exists():
        return Response(
            {'error': 'A user with this email already exists.'},
            status=status.HTTP_409_CONFLICT,
        )

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role='AUTHORITY',
        phone=phone or None,
        organization=organization or None,
    )

    serializer = UserSerializer(user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def manage_create_worker(request):
    """
    POST /api/manage/users/create-worker/
    Only AUTHORITY users can create HEALTH_WORKER accounts.
    """
    if not _is_authority(request.user):
        return Response(
            {'error': 'Permission denied. Authority role required.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    data = request.data
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    phone = data.get('phone', '').strip()
    organization = data.get('organization', '').strip()

    if not username or not password:
        return Response(
            {'error': 'Username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'A user with this username already exists.'},
            status=status.HTTP_409_CONFLICT,
        )

    if email and User.objects.filter(email=email).exists():
        return Response(
            {'error': 'A user with this email already exists.'},
            status=status.HTTP_409_CONFLICT,
        )

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role='HEALTH_WORKER',
        phone=phone or None,
        organization=organization or None,
    )

    # Handle assigned villages (list of village IDs)
    village_ids = data.get('assigned_villages', [])
    if village_ids:
        villages = Village.objects.filter(id__in=village_ids)
        user.assigned_villages.set(villages)

    serializer = UserSerializer(user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def manage_toggle_user(request, user_id):
    """
    PATCH /api/manage/users/<id>/toggle/
    Toggle is_active status. Permission rules:
    - Authority can toggle HEALTH_WORKER and AUTHORITY accounts
    - Nobody can deactivate themselves
    """
    if not _is_authority(request.user):
        return Response(
            {'error': 'Permission denied. Authority role required.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Cannot deactivate yourself
    if target.id == request.user.id:
        return Response(
            {'error': 'You cannot deactivate your own account.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Authority can toggle AUTHORITY and HEALTH_WORKER
    if target.role not in ('AUTHORITY', 'HEALTH_WORKER'):
        return Response(
            {'error': 'You can only manage Authority and Health Worker accounts.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    target.is_active = not target.is_active
    target.save(update_fields=['is_active'])

    # If deactivated, also delete their auth token
    if not target.is_active:
        Token.objects.filter(user=target).delete()

    serializer = UserSerializer(target)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def manage_update_user(request, user_id):
    """
    PATCH /api/manage/users/<id>/
    Edit user details. Same permission rules as toggle.
    """
    if not _is_authority(request.user):
        return Response(
            {'error': 'Permission denied. Authority role required.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if target.role not in ('AUTHORITY', 'HEALTH_WORKER'):
        return Response(
            {'error': 'You can only manage Authority and Health Worker accounts.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    data = request.data

    # Update allowed fields
    if 'first_name' in data:
        target.first_name = data['first_name'].strip()
    if 'last_name' in data:
        target.last_name = data['last_name'].strip()
    if 'email' in data:
        new_email = data['email'].strip()
        if new_email and new_email != target.email:
            if User.objects.filter(email=new_email).exclude(id=target.id).exists():
                return Response(
                    {'error': 'A user with this email already exists.'},
                    status=status.HTTP_409_CONFLICT,
                )
            target.email = new_email
    if 'phone' in data:
        target.phone = data['phone'].strip() or None
    if 'organization' in data:
        target.organization = data['organization'].strip() or None

    # Handle password change
    if 'password' in data and data['password']:
        target.set_password(data['password'])

    # Handle assigned villages for health workers
    if 'assigned_villages' in data and target.role == 'HEALTH_WORKER':
        villages = Village.objects.filter(id__in=data['assigned_villages'])
        target.assigned_villages.set(villages)

    target.save()
    serializer = UserSerializer(target)
    return Response(serializer.data)
