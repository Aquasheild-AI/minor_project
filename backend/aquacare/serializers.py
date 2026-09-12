from rest_framework import serializers
from .models import (
    User,
    Village,
    WaterSource,
    WaterQualityTest,
    HealthRecord,
    CommunityReport,
    WaterRiskPrediction,
    DiseaseRiskPrediction,
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
            'assigned_villages', 'preferred_language', 'notification_alerts', 'is_active'
        ]
        read_only_fields = ['id']


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone', 'organization', 'password', 'assigned_villages']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'email': {'required': False},
            'first_name': {'required': False},
            'last_name': {'required': False},
            'phone': {'required': False},
            'organization': {'required': False},
            'assigned_villages': {'required': False},
        }

    def validate_email(self, value):
        if not value:
            return value
        # Ensure email is unique, excluding the current instance being updated
        user_id = getattr(self.instance, 'id', None)
        if User.objects.filter(email=value).exclude(id=user_id).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value


# 2. Village Serializer (used by Dashboard & GIS Leaflet Map)
class VillageSerializer(serializers.ModelSerializer):
    active_alerts_count = serializers.IntegerField(read_only=True)
    recent_cases_count = serializers.IntegerField(read_only=True)
    risk_level = serializers.SerializerMethodField()
    risk_score = serializers.SerializerMethodField()

    class Meta:
        model = Village
        fields = [
            'id', 'name', 'code', 'district', 'block', 'state', 'pincode',
            'latitude', 'longitude', 'population', 'household_count',
            'primary_water_source', 'risk_level', 'risk_score',
            'active_alerts_count', 'recent_cases_count', 'created_at', 'updated_at'
        ]

    def _get_latest_prediction(self, obj):
        if not hasattr(obj, '_cached_latest_prediction'):
            if hasattr(obj, '_prefetched_objects_cache') and 'water_risk_predictions' in getattr(obj, '_prefetched_objects_cache', {}):
                preds = obj.water_risk_predictions.all()
                latest = [p for p in preds if p.is_latest]
                obj._cached_latest_prediction = latest[0] if latest else None
            else:
                obj._cached_latest_prediction = obj.water_risk_predictions.filter(is_latest=True).first()
        return obj._cached_latest_prediction

    def get_risk_level(self, obj):
        pred = self._get_latest_prediction(obj)
        return pred.risk_level if pred else 'LOW'

    def get_risk_score(self, obj):
        pred = self._get_latest_prediction(obj)
        return pred.risk_score if pred else 0.0


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
    village = serializers.PrimaryKeyRelatedField(queryset=Village.objects.all(), required=False)

    class Meta:
        model = WaterQualityTest
        fields = [
            'id', 'water_source', 'water_source_name', 'village', 'village_name',
            'tested_by', 'tested_by_name', 'sample_date',
            'ph', 'turbidity', 'tds', 'temperature',
            'coliform_bacteria', 'e_coli_detected', 'chlorine_residual',
            'dissolved_oxygen', 'nitrate', 'wqi', 'status', 'notes', 'created_at'
        ]
        read_only_fields = ['wqi', 'status', 'tested_by', 'created_at']


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
        read_only_fields = ['recorded_by', 'date_recorded']


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
        read_only_fields = ['citizen', 'status', 'reviewed_by', 'review_notes', 'reviewed_at', 'created_at']


class CommunityReportReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityReport
        fields = ['status', 'review_notes']


# 7. AI/ML Risk Prediction Serializers
class WaterRiskPredictionSerializer(serializers.ModelSerializer):
    village_name = serializers.CharField(source='village.name', read_only=True)

    class Meta:
        model = WaterRiskPrediction
        fields = [
            'id', 'village', 'village_name', 'prediction_date',
            'risk_score', 'risk_level', 'contributing_factors',
            'plain_language_explanation', 'recommended_actions',
            'model_name', 'is_latest', 'created_at'
        ]


class DiseaseRiskPredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiseaseRiskPrediction
        fields = [
            'id', 'district', 'prediction_date',
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


# 9. Detailed Village Serializer with nested relations
class VillageDetailSerializer(serializers.ModelSerializer):
    active_alerts_count = serializers.IntegerField(read_only=True)
    recent_cases_count = serializers.IntegerField(read_only=True)
    water_sources = WaterSourceSerializer(many=True, read_only=True)
    active_alerts = serializers.SerializerMethodField()
    latest_prediction = serializers.SerializerMethodField()
    risk_level = serializers.SerializerMethodField()
    risk_score = serializers.SerializerMethodField()

    class Meta:
        model = Village
        fields = [
            'id', 'name', 'code', 'district', 'block', 'state', 'pincode',
            'latitude', 'longitude', 'population', 'household_count',
            'primary_water_source', 'risk_level', 'risk_score',
            'active_alerts_count', 'recent_cases_count',
            'water_sources', 'active_alerts', 'latest_prediction',
            'created_at', 'updated_at'
        ]

    def _get_latest_prediction(self, obj):
        if not hasattr(obj, '_cached_latest_prediction'):
            if hasattr(obj, '_prefetched_objects_cache') and 'water_risk_predictions' in getattr(obj, '_prefetched_objects_cache', {}):
                preds = obj.water_risk_predictions.all()
                latest = [p for p in preds if p.is_latest]
                obj._cached_latest_prediction = latest[0] if latest else None
            else:
                obj._cached_latest_prediction = obj.water_risk_predictions.filter(is_latest=True).first()
        return obj._cached_latest_prediction

    def get_active_alerts(self, obj):
        alerts = obj.alerts.filter(is_active=True)
        return AlertSerializer(alerts, many=True).data

    def get_latest_prediction(self, obj):
        pred = self._get_latest_prediction(obj)
        if pred:
            return WaterRiskPredictionSerializer(pred).data
        return None

    def get_risk_level(self, obj):
        pred = self._get_latest_prediction(obj)
        return pred.risk_level if pred else 'LOW'

    def get_risk_score(self, obj):
        pred = self._get_latest_prediction(obj)
        return pred.risk_score if pred else 0.0