from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User,
    Village,
    WaterSource,
    WaterQualityTest,
    HealthRecord,
    CommunityReport,
    RiskPrediction,
    Alert,
    AlertAcknowledgement
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'get_full_name', 'role', 'village', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active', 'preferred_language')
    search_fields = ('username', 'first_name', 'last_name', 'email', 'phone', 'organization')
    filter_horizontal = ('assigned_villages', 'groups', 'user_permissions')

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role & Organization', {
            'fields': ('role', 'phone', 'organization', 'address')
        }),
        ('Geographic Assignment', {
            'fields': ('village', 'assigned_villages')
        }),
        ('Preferences', {
            'fields': ('preferred_language', 'notification_alerts')
        }),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Role & Demographics', {
            'fields': ('role', 'phone', 'organization', 'village')
        }),
    )


@admin.register(Village)
class VillageAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'district', 'state', 'population', 'risk_level', 'risk_score', 'active_alerts_count')
    list_filter = ('risk_level', 'district', 'state')
    search_fields = ('name', 'code', 'district', 'block', 'pincode')
    ordering = ('name',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(WaterSource)
class WaterSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'village', 'source_type', 'status', 'is_public', 'installed_year')
    list_filter = ('source_type', 'status', 'is_public', 'village__district')
    search_fields = ('name', 'village__name', 'notes')
    ordering = ('village', 'name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(WaterQualityTest)
class WaterQualityTestAdmin(admin.ModelAdmin):
    list_display = ('water_source', 'village', 'sample_date', 'ph', 'turbidity', 'tds', 'temperature', 'status', 'wqi')
    list_filter = ('status', 'e_coli_detected', 'sample_date', 'village__district')
    search_fields = ('water_source__name', 'village__name', 'notes')
    date_hierarchy = 'sample_date'
    readonly_fields = ('created_at', 'updated_at')


@admin.register(HealthRecord)
class HealthRecordAdmin(admin.ModelAdmin):
    list_display = ('disease_type', 'village', 'patient_identifier', 'age', 'gender', 'severity', 'status', 'date_recorded')
    list_filter = ('disease_type', 'severity', 'status', 'gender', 'village__district', 'date_recorded')
    search_fields = ('patient_identifier', 'patient_name', 'village__name', 'notes', 'treatment_administered')
    date_hierarchy = 'date_recorded'
    readonly_fields = ('created_at', 'updated_at')


@admin.register(CommunityReport)
class CommunityReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'village', 'reporter_name', 'people_affected', 'age_group', 'status', 'created_at')
    list_filter = ('status', 'age_group', 'village__district', 'created_at')
    search_fields = ('reporter_name', 'reporter_phone', 'village__name', 'description', 'water_issue_observed')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at', 'updated_at')


@admin.register(RiskPrediction)
class RiskPredictionAdmin(admin.ModelAdmin):
    list_display = ('village', 'risk_score', 'risk_level', 'outbreak_probability', 'predicted_disease', 'is_latest', 'prediction_date')
    list_filter = ('risk_level', 'is_latest', 'prediction_date', 'village__district')
    search_fields = ('village__name', 'predicted_disease', 'model_name')
    date_hierarchy = 'prediction_date'
    readonly_fields = ('created_at',)


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('title', 'village', 'severity', 'alert_type', 'target_audience', 'is_active', 'created_at')
    list_filter = ('severity', 'alert_type', 'target_audience', 'is_active', 'village__district')
    search_fields = ('title', 'message', 'village__name')
    date_hierarchy = 'created_at'


@admin.register(AlertAcknowledgement)
class AlertAcknowledgementAdmin(admin.ModelAdmin):
    list_display = ('alert', 'user', 'acknowledged_at')
    search_fields = ('alert__title', 'user__username')
    date_hierarchy = 'acknowledged_at'
