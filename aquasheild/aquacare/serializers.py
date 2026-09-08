from rest_framework import serializers
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


# 1. User & Auth Serializer
class UserSerializer(serializers.ModelSerializer):
    village_name = serializers.CharField(source='village.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'organization', 'village', 'village_name',
            'assigned_villages', 'preferred_language', 'notification_alerts'
        ]
        read_only_fields = ['id']


# 2. Village Serializer (used by Dashboard & GIS Leaflet Map)
class VillageSerializer(serializers.ModelSerializer):
    active_alerts_count = serializers.IntegerField(read_only=True)
    recent_cases_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Village
        fields = [
            'id', 'name', 'code', 'district', 'block', 'state', 'pincode',
            'latitude', 'longitude', 'population', 'household_count',
            'primary_water_source', 'risk_level', 'risk_score',
            'active_alerts_count', 'recent_cases_count', 'created_at', 'updated_at'
        ]


# 3. Water Source Serializer (Wells, Handpumps, Taps)
class WaterSourceSerializer(serializers.ModelSerializer):
    village_name = serializers.CharField(source='village.name', read_only=True)
    source_type_display = serializers.CharField(source='get_source_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = WaterSource
        fields = [
            'id', 'village', 'village_name', 'name', 'source_type',
            'source_type_display', 'status', 'status_display',
            'latitude', 'longitude', 'is_public', 'depth_meters',
            'installed_year', 'notes', 'created_at'
        ]


# 4. Water Quality Test Serializer (pH, Turbidity, TDS, Temp, Coliform, WQI)
class WaterQualityTestSerializer(serializers.ModelSerializer):
    water_source_name = serializers.CharField(source='water_source.name', read_only=True)
    village_name = serializers.CharField(source='village.name', read_only=True)
    tested_by_name = serializers.CharField(source='tested_by.get_full_name', read_only=True)

    class Meta:
        model = WaterQualityTest
        fields = [
            'id', 'water_source', 'water_source_name', 'village', 'village_name',
            'tested_by', 'tested_by_name', 'sample_date',
            'ph', 'turbidity', 'tds', 'temperature',
            'coliform_bacteria', 'e_coli_detected', 'chlorine_residual',
            'dissolved_oxygen', 'nitrate', 'wqi', 'status', 'notes', 'created_at'
        ]
        read_only_fields = ['wqi', 'status', 'created_at']


# 5. Health Surveillance Case Record Serializer (Logged by Health Workers)
class HealthRecordSerializer(serializers.ModelSerializer):
    village_name = serializers.CharField(source='village.name', read_only=True)
    disease_type_display = serializers.CharField(source='get_disease_type_display', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)

    class Meta:
        model = HealthRecord
        fields = [
            'id', 'village', 'village_name', 'recorded_by', 'recorded_by_name',
            'patient_identifier', 'patient_name', 'age', 'gender',
            'disease_type', 'disease_type_display', 'symptoms', 'severity',
            'status', 'date_of_onset', 'date_recorded',
            'suspected_water_source', 'treatment_administered', 'notes'
        ]


# 6. Community Report Serializer (Citizen Issue Submissions)
class CommunityReportSerializer(serializers.ModelSerializer):
    village_name = serializers.CharField(source='village.name', read_only=True)
    water_source_name = serializers.CharField(source='water_source_suspected.name', read_only=True)

    class Meta:
        model = CommunityReport
        fields = [
            'id', 'citizen', 'village', 'village_name', 'reporter_name', 'reporter_phone',
            'symptoms', 'people_affected', 'age_group',
            'water_source_suspected', 'water_source_name', 'water_issue_observed',
            'description', 'status', 'reviewed_by', 'review_notes',
            'reviewed_at', 'created_at'
        ]
        read_only_fields = ['status', 'reviewed_by', 'review_notes', 'reviewed_at', 'created_at']


# 7. AI/ML Risk Prediction Serializer
class RiskPredictionSerializer(serializers.ModelSerializer):
    village_name = serializers.CharField(source='village.name', read_only=True)

    class Meta:
        model = RiskPrediction
        fields = [
            'id', 'village', 'village_name', 'prediction_date',
            'risk_score', 'risk_level', 'outbreak_probability', 'predicted_disease',
            'contributing_factors', 'plain_language_explanation',
            'recommended_actions', 'model_name', 'is_latest', 'created_at'
        ]


# 8. Alert & Advisories Serializer
class AlertSerializer(serializers.ModelSerializer):
    village_name = serializers.CharField(source='village.name', read_only=True)

    class Meta:
        model = Alert
        fields = [
            'id', 'village', 'village_name', 'title', 'message',
            'severity', 'alert_type', 'target_audience', 'action_required',
            'is_active', 'generated_by_ai', 'created_at', 'resolved_at'
        ]