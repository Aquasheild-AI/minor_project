from django.shortcuts import render, get_object_or_404
from django.contrib.auth import authenticate
from django.utils import timezone
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token

from .models import (
    User,
    Village,
    WaterSource,
    WaterQualityTest,
    HealthRecord,
    CommunityReport,
    RiskPrediction,
    Alert,
    AlertAcknowledgement,
)
from .serializers import (
    UserSerializer,
    VillageSerializer,
    VillageDetailSerializer,
    WaterSourceSerializer,
    WaterQualityTestSerializer,
    HealthRecordSerializer,
    CommunityReportSerializer,
    CommunityReportReviewSerializer,
    RiskPredictionSerializer,
    AlertSerializer,
)
from .permissions import (
    IsAuthority,
    IsHealthWorkerOrAuthority,
    has_village_access,
)


# ─── Public / Web Views ────────────────────────────────────────────

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
    """
    data = request.data
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    phone = data.get('phone', '').strip()
    village_id = data.get('village')

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

    village = None
    if village_id:
        try:
            village = Village.objects.get(id=village_id)
        except Village.DoesNotExist:
            pass

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role='COMMUNITY',
        phone=phone or None,
        village=village,
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

def _is_authority(user):
    return user.is_authenticated and user.role == 'AUTHORITY'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def manage_list_users(request):
    """
    GET /api/manage/users/?role=AUTHORITY|HEALTH_WORKER|COMMUNITY
    """
    if not _is_authority(request.user):
        return Response(
            {'error': 'Permission denied. Authority role required.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    role_filter = request.query_params.get('role', '').upper()

    if role_filter == 'HEALTH_WORKER':
        users = User.objects.filter(role='HEALTH_WORKER').order_by('-date_joined')
    elif role_filter == 'AUTHORITY':
        users = User.objects.filter(role='AUTHORITY').order_by('-date_joined')
    elif role_filter == 'COMMUNITY':
        users = User.objects.filter(role='COMMUNITY').order_by('-date_joined')
    else:
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

    if target.id == request.user.id:
        return Response(
            {'error': 'You cannot deactivate your own account.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if target.role not in ('AUTHORITY', 'HEALTH_WORKER'):
        return Response(
            {'error': 'You can only manage Authority and Health Worker accounts.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    target.is_active = not target.is_active
    target.save(update_fields=['is_active'])

    if not target.is_active:
        Token.objects.filter(user=target).delete()

    serializer = UserSerializer(target)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def manage_update_user(request, user_id):
    """
    PATCH /api/manage/users/<id>/
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

    if 'password' in data and data['password']:
        target.set_password(data['password'])

    if 'assigned_villages' in data and target.role == 'HEALTH_WORKER':
        villages = Village.objects.filter(id__in=data['assigned_villages'])
        target.assigned_villages.set(villages)

    target.save()
    serializer = UserSerializer(target)
    return Response(serializer.data)


# ─── Villages & GIS Endpoints ─────────────────────────────────────

@api_view(['GET'])
def get_villages_for_gis_map(request):
    """
    GET /api/villages/
    Returns list of all monitored villages.
    """
    villages = Village.objects.all()
    serializer = VillageSerializer(villages, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def village_detail(request, village_id):
    """
    GET /api/villages/<village_id>/
    Returns comprehensive village details including water sources and active alerts.
    """
    village = get_object_or_404(Village, id=village_id)
    serializer = VillageDetailSerializer(village)
    return Response(serializer.data)


# ─── Water Sources & Water Quality Endpoints ───────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def water_sources_list_create(request):
    """
    GET /api/water-sources/?village_id=...&status=...
    POST /api/water-sources/ (Health Workers & Authorities only)
    """
    if request.method == 'GET':
        qs = WaterSource.objects.select_related('village').all()
        village_id = request.query_params.get('village_id')
        status_filter = request.query_params.get('status')
        source_type = request.query_params.get('source_type')

        if village_id:
            qs = qs.filter(village_id=village_id)
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        if source_type:
            qs = qs.filter(source_type=source_type.upper())

        serializer = WaterSourceSerializer(qs, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        if not IsHealthWorkerOrAuthority().has_permission(request, None):
            return Response(
                {'error': 'Permission denied. Only Health Workers and Authorities can add water sources.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = WaterSourceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        village = serializer.validated_data.get('village')
        if not has_village_access(request.user, village):
            return Response(
                {'error': 'You do not have jurisdiction to add water sources in this village.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def water_quality_list_create(request):
    """
    GET /api/water-quality/?village_id=...&status=...
    POST /api/water-quality/ (Logs sample, auto-calculates WQI and updates WaterSource status)
    """
    if request.method == 'GET':
        qs = WaterQualityTest.objects.select_related('water_source', 'village', 'tested_by').all()
        village_id = request.query_params.get('village_id')
        water_source_id = request.query_params.get('water_source_id')
        status_filter = request.query_params.get('status')

        if village_id:
            qs = qs.filter(village_id=village_id)
        if water_source_id:
            qs = qs.filter(water_source_id=water_source_id)
        if status_filter:
            qs = qs.filter(status=status_filter.upper())

        serializer = WaterQualityTestSerializer(qs, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        if not IsHealthWorkerOrAuthority().has_permission(request, None):
            return Response(
                {'error': 'Permission denied. Only Health Workers and Authorities can record water quality tests.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = WaterQualityTestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        water_source = serializer.validated_data.get('water_source')
        target_village = serializer.validated_data.get('village') or (water_source.village if water_source else None)

        if target_village and not has_village_access(request.user, target_village):
            return Response(
                {'error': 'You do not have jurisdiction to test water sources in this village.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        test = serializer.save(
            tested_by=request.user,
            village=target_village,
        )
        return Response(WaterQualityTestSerializer(test).data, status=status.HTTP_201_CREATED)


# ─── Health Surveillance Records (Clinical Cases) ──────────────────
# STRICT RBAC: Citizens get 403 Forbidden.
# Health workers are restricted to assigned villages.
# ───────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsHealthWorkerOrAuthority])
def health_records_list_create(request):
    """
    GET /api/health-records/?village_id=...&disease_type=...
    POST /api/health-records/
    """
    if request.method == 'GET':
        qs = HealthRecord.objects.select_related('village', 'recorded_by').all()

        # RBAC: Health workers only see records for their assigned villages
        if request.user.role == 'HEALTH_WORKER' and request.user.assigned_villages.exists():
            qs = qs.filter(village__in=request.user.assigned_villages.all())

        village_id = request.query_params.get('village_id')
        disease_type = request.query_params.get('disease_type')
        severity = request.query_params.get('severity')
        status_filter = request.query_params.get('status')

        if village_id:
            qs = qs.filter(village_id=village_id)
        if disease_type:
            qs = qs.filter(disease_type=disease_type.upper())
        if severity:
            qs = qs.filter(severity=severity.upper())
        if status_filter:
            qs = qs.filter(status=status_filter.upper())

        serializer = HealthRecordSerializer(qs, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = HealthRecordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        village = serializer.validated_data.get('village')
        if not has_village_access(request.user, village):
            return Response(
                {'error': 'You do not have jurisdiction to log health records for this village.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        record = serializer.save(recorded_by=request.user)
        return Response(HealthRecordSerializer(record).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated, IsHealthWorkerOrAuthority])
def health_record_detail(request, pk):
    """
    GET /api/health-records/<pk>/
    DELETE /api/health-records/<pk>/
    """
    record = get_object_or_404(HealthRecord, pk=pk)

    if not has_village_access(request.user, record.village):
        return Response(
            {'error': 'You do not have permission to access health records for this village.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == 'GET':
        serializer = HealthRecordSerializer(record)
        return Response(serializer.data)

    elif request.method == 'DELETE':
        record.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Community Reports (Citizen Reporting & Review) ───────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def community_reports_list_create(request):
    """
    GET /api/community-reports/?village_id=...&status=...
    POST /api/community-reports/
    """
    if request.method == 'GET':
        qs = CommunityReport.objects.select_related('village', 'citizen', 'reviewed_by').all()

        # RBAC: Citizens only see their own reports or reports in their village
        if request.user.role == 'COMMUNITY':
            q_filter = Q(citizen=request.user)
            if request.user.village:
                q_filter |= Q(village=request.user.village)
            qs = qs.filter(q_filter)
        elif request.user.role == 'HEALTH_WORKER' and request.user.assigned_villages.exists():
            qs = qs.filter(village__in=request.user.assigned_villages.all())

        village_id = request.query_params.get('village_id')
        status_filter = request.query_params.get('status')
        if village_id:
            qs = qs.filter(village_id=village_id)
        if status_filter:
            qs = qs.filter(status=status_filter.upper())

        serializer = CommunityReportSerializer(qs, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        data = request.data.copy()

        # Default village to citizen's assigned village if not specified
        if not data.get('village') and request.user.village_id:
            data['village'] = request.user.village_id

        serializer = CommunityReportSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        report = serializer.save(
            citizen=request.user,
            status='SUBMITTED',
            reporter_name=data.get('reporter_name') or request.user.get_full_name() or request.user.username,
            reporter_phone=data.get('reporter_phone') or request.user.phone or '',
        )
        return Response(CommunityReportSerializer(report).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def community_report_detail(request, pk):
    """
    GET /api/community-reports/<pk>/
    """
    report = get_object_or_404(CommunityReport, pk=pk)

    if request.user.role == 'COMMUNITY':
        if report.citizen_id != request.user.id and report.village_id != getattr(request.user.village, 'id', None):
            return Response(
                {'error': 'Permission denied.'},
                status=status.HTTP_403_FORBIDDEN,
            )
    elif request.user.role == 'HEALTH_WORKER':
        if not has_village_access(request.user, report.village):
            return Response(
                {'error': 'Permission denied.'},
                status=status.HTTP_403_FORBIDDEN,
            )

    serializer = CommunityReportSerializer(report)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsHealthWorkerOrAuthority])
def community_report_review(request, pk):
    """
    PATCH /api/community-reports/<pk>/review/
    Allows Health Workers and Authorities to review, verify, and resolve citizen reports.
    """
    report = get_object_or_404(CommunityReport, pk=pk)

    if not has_village_access(request.user, report.village):
        return Response(
            {'error': 'You do not have jurisdiction to review reports in this village.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = CommunityReportReviewSerializer(report, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer.save(
        reviewed_by=request.user,
        reviewed_at=timezone.now(),
    )
    return Response(CommunityReportSerializer(report).data)


# ─── Alerts & Advisories Endpoints ─────────────────────────────────
# STRICT RBAC: Only AUTHORITY can broadcast/post emergency alerts.
# ───────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def alerts_list_create(request):
    """
    GET /api/alerts/?village_id=...&is_active=...
    POST /api/alerts/ (AUTHORITY only)
    """
    if request.method == 'GET':
        qs = Alert.objects.select_related('village').all()

        # Filter by audience visibility based on role
        if request.user.role == 'COMMUNITY':
            qs = qs.filter(target_audience__in=['ALL', 'COMMUNITY'])
        elif request.user.role == 'HEALTH_WORKER':
            qs = qs.filter(target_audience__in=['ALL', 'HEALTH_WORKER'])

        village_id = request.query_params.get('village_id')
        is_active = request.query_params.get('is_active')
        severity = request.query_params.get('severity')

        if village_id:
            qs = qs.filter(village_id=village_id)
        if is_active is not None:
            active_bool = is_active.lower() in ('true', '1')
            qs = qs.filter(is_active=active_bool)
        if severity:
            qs = qs.filter(severity=severity.upper())

        serializer = AlertSerializer(qs, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # STRICT RBAC: Only Authorities can broadcast high-level emergency alerts
        if request.user.role != 'AUTHORITY':
            return Response(
                {'error': 'Permission denied. Only Health Authorities can broadcast emergency alerts.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AlertSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        alert = serializer.save()
        return Response(AlertSerializer(alert).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAuthority])
def alert_resolve(request, pk):
    """
    PATCH /api/alerts/<pk>/resolve/
    Only Authority can resolve an active alert.
    """
    alert = get_object_or_404(Alert, pk=pk)
    alert.is_active = False
    alert.resolved_at = timezone.now()
    alert.save(update_fields=['is_active', 'resolved_at'])
    return Response(AlertSerializer(alert).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def alert_acknowledge(request, pk):
    """
    POST /api/alerts/<pk>/acknowledge/
    Acknowledge an alert receipt.
    """
    alert = get_object_or_404(Alert, pk=pk)
    AlertAcknowledgement.objects.get_or_create(alert=alert, user=request.user)
    return Response({'detail': f'Alert {alert.id} acknowledged successfully.'})


# ─── Dashboard Summary Statistics API ──────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    GET /api/dashboard/stats/
    Provides live counts and surveillance metrics.
    """
    user = request.user
    thirty_days_ago = timezone.now() - timezone.timedelta(days=30)

    # Base querysets
    villages_qs = Village.objects.all()
    water_sources_qs = WaterSource.objects.all()
    health_records_qs = HealthRecord.objects.all()
    community_reports_qs = CommunityReport.objects.all()
    alerts_qs = Alert.objects.filter(is_active=True)

    # Scoping for Health Worker with assigned villages
    if user.role == 'HEALTH_WORKER' and user.assigned_villages.exists():
        assigned = user.assigned_villages.all()
        villages_qs = villages_qs.filter(id__in=assigned)
        water_sources_qs = water_sources_qs.filter(village__in=assigned)
        health_records_qs = health_records_qs.filter(village__in=assigned)
        community_reports_qs = community_reports_qs.filter(village__in=assigned)
        alerts_qs = alerts_qs.filter(village__in=assigned)
    elif user.role == 'COMMUNITY' and user.village:
        villages_qs = villages_qs.filter(id=user.village_id)
        water_sources_qs = water_sources_qs.filter(village=user.village)
        alerts_qs = alerts_qs.filter(village=user.village)

    data = {
        'total_villages': villages_qs.count(),
        'high_risk_villages': villages_qs.filter(risk_level__in=['HIGH', 'CRITICAL']).count(),
        'medium_risk_villages': villages_qs.filter(risk_level='MEDIUM').count(),
        'low_risk_villages': villages_qs.filter(risk_level='LOW').count(),
        'total_water_sources': water_sources_qs.count(),
        'safe_water_sources': water_sources_qs.filter(status='SAFE').count(),
        'contaminated_water_sources': water_sources_qs.filter(status='CONTAMINATED').count(),
        'moderate_risk_water_sources': water_sources_qs.filter(status='MODERATE').count(),
        'total_water_tests': WaterQualityTest.objects.count(),
        'recent_cases_30d': health_records_qs.filter(date_recorded__gte=thirty_days_ago).count(),
        'total_cases': health_records_qs.count(),
        'active_alerts': alerts_qs.count(),
        'pending_community_reports': community_reports_qs.filter(status__in=['SUBMITTED', 'UNDER_REVIEW']).count(),
        'resolved_community_reports': community_reports_qs.filter(status='RESOLVED').count(),
    }
    return Response(data)
