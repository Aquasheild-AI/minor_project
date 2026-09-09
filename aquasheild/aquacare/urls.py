from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),

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

    # Data endpoints
    path('villages/', views.get_villages_for_gis_map, name='villages'),
]