from django.urls import path
from . import views

urlpatterns = [

    # Auth endpoints
    path('auth/login/', views.login_view, name='auth-login'),
    path('auth/register/', views.register_view, name='auth-register'),
    path('auth/logout/', views.logout_view, name='auth-logout'),
    path('auth/me/', views.me_view, name='auth-me'),

    # User management endpoints
    path('manage/users/', views.manage_list_users, name='manage-list-users'),
    path('manage/users/create-authority/', views.manage_create_authority, name='manage-create-authority'),
    path('manage/users/create-worker/', views.manage_create_worker, name='manage-create-worker'),
    path('manage/users/<int:user_id>/toggle/', views.manage_toggle_user, name='manage-toggle-user'),
    path('manage/users/<int:user_id>/', views.manage_update_user, name='manage-update-user'),

    # Village & GIS endpoints
    path('villages/', views.get_villages_for_gis_map, name='villages'),
    path('villages/<int:village_id>/', views.village_detail, name='village-detail'),

    # Water Sources & Water Quality endpoints
    path('water-sources/', views.water_sources_list_create, name='water-sources-list-create'),
    path('water-quality/', views.water_quality_list_create, name='water-quality-list-create'),

    # Health Surveillance Case Records (Strict RBAC: Health Workers & Authority only)
    path('health-records/', views.health_records_list_create, name='health-records-list-create'),
    path('health-records/<int:pk>/', views.health_record_detail, name='health-record-detail'),

    # Community Health Reports (Citizen reporting & Worker review)
    path('community-reports/', views.community_reports_list_create, name='community-reports-list-create'),
    path('community-reports/<int:pk>/', views.community_report_detail, name='community-report-detail'),
    path('community-reports/<int:pk>/review/', views.community_report_review, name='community-report-review'),

    # Alerts & Advisories (Strict RBAC: Authority broadcast)
    path('alerts/', views.alerts_list_create, name='alerts-list-create'),
    path('alerts/<int:pk>/resolve/', views.alert_resolve, name='alert-resolve'),
    path('alerts/<int:pk>/acknowledge/', views.alert_acknowledge, name='alert-acknowledge'),

    # Dashboard Summary Statistics
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),
]