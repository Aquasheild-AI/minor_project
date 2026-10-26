"""
Risk prediction API (Module A: village water contamination, Module B:
district outbreak risk). Predictions are produced by aquacare/ml_service.py.
"""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import ml_service
from .models import DiseaseRiskPrediction, Village, WaterRiskPrediction
from .permissions import IsAuthority, IsHealthWorkerOrAuthority, has_village_access
from .serializers import DiseaseRiskPredictionSerializer, WaterRiskPredictionSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def water_risk_list(request):
    """
    GET /api/risk/water/?village_id=...&district=...
    Latest water contamination prediction for each village.
    """
    qs = WaterRiskPrediction.objects.filter(is_latest=True).select_related('village')
    village_id = request.query_params.get('village_id')
    district = request.query_params.get('district')
    if village_id:
        qs = qs.filter(village_id=village_id)
    if district:
        qs = qs.filter(village__district__iexact=district)
    return Response(WaterRiskPredictionSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def water_risk_history(request, village_id):
    """
    GET /api/risk/water/<village_id>/history/?limit=30
    Past water risk predictions for a village, newest first.
    """
    village = get_object_or_404(Village, id=village_id)
    limit = min(int(request.query_params.get('limit', 30)), 200)
    qs = village.water_risk_predictions.all()[:limit]
    return Response(WaterRiskPredictionSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsHealthWorkerOrAuthority])
def water_risk_refresh_village(request, village_id):
    """
    POST /api/risk/water/<village_id>/refresh/
    Re-score the village from its latest water quality tests.
    """
    village = get_object_or_404(Village, id=village_id)
    if not has_village_access(request.user, village):
        return Response({'error': 'You do not have jurisdiction over this village.'},
                        status=status.HTTP_403_FORBIDDEN)
    try:
        prediction = ml_service.refresh_village_water_risk(village)
    except ml_service.PredictionUnavailable as exc:
        return Response({'status': 'MODEL_UNAVAILABLE', 'error': str(exc)},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)
    if prediction is None:
        return Response({'status': 'NO_DATA', 'error': 'No water quality tests recorded for this village yet.'},
                        status=status.HTTP_404_NOT_FOUND)
    return Response(WaterRiskPredictionSerializer(prediction).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def disease_risk_list(request):
    """
    GET /api/risk/disease/?district=...
    Latest district outbreak risk prediction for each district.
    """
    qs = DiseaseRiskPrediction.objects.filter(is_latest=True)
    district = request.query_params.get('district')
    if district:
        qs = qs.filter(district__iexact=district)
    return Response(DiseaseRiskPredictionSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def disease_risk_history(request):
    """
    GET /api/risk/disease/history/?district=...&limit=30
    """
    district = request.query_params.get('district')
    if not district:
        return Response({'error': 'district query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)
    limit = min(int(request.query_params.get('limit', 30)), 200)
    qs = DiseaseRiskPrediction.objects.filter(district__iexact=district)[:limit]
    return Response(DiseaseRiskPredictionSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAuthority])
def risk_refresh_all(request):
    """
    POST /api/risk/refresh/  {"water": true, "disease": true}
    Re-run both models for every village and district (Authority only).
    Outbreak risk needs internet access for live NASA POWER climate.
    """
    water = bool(request.data.get('water', True))
    disease = bool(request.data.get('disease', True))
    summary = ml_service.refresh_all(water=water, disease=disease)
    return Response(summary)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def risk_model_info(request):
    """
    GET /api/risk/models/
    Model names, training dates and validation metrics, for transparency in the UI.
    """
    return Response(ml_service.model_info())


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def risk_evaluate_reading(request):
    """
    POST /api/risk/evaluate/
    Evaluate an individual water sample reading (from dataset or custom input)
    using the Module A machine learning model.
    """
    data = request.data or {}
    try:
        ph = float(data.get('ph'))
    except (TypeError, ValueError):
        return Response({'error': 'Valid pH value is required.'}, status=status.HTTP_400_BAD_REQUEST)

    def _to_float(key, default=None):
        val = data.get(key)
        if val is None or val == '':
            return default
        try:
            return float(val)
        except (TypeError, ValueError):
            return default

    temperature = _to_float('temperature', 25.0)
    tds = _to_float('tds', 300.0)
    dissolved_oxygen = _to_float('dissolved_oxygen', None)
    if dissolved_oxygen is None:
        dissolved_oxygen = _to_float('dissolvedOxygen', 6.0)

    nitrate = _to_float('nitrate', 10.0)
    fecal_coliform = _to_float('fecal_coliform', None)
    if fecal_coliform is None:
        fecal_coliform = _to_float('fecalColiform', None)

    e_coli_detected = bool(data.get('e_coli_detected', False))
    source_type = data.get('source_type') or data.get('waterSource') or 'HANDPUMP'
    source_name = data.get('source_name') or data.get('district') or 'Water Sample'

    try:
        evaluation = ml_service.evaluate_water_reading(
            ph=ph,
            temperature=temperature,
            tds=tds,
            dissolved_oxygen=dissolved_oxygen,
            nitrate=nitrate,
            source_type=source_type,
            e_coli_detected=e_coli_detected,
            fecal_coliform=fecal_coliform,
            source_name=source_name,
        )
        return Response(evaluation, status=status.HTTP_200_OK)
    except ml_service.PredictionUnavailable as exc:
        return Response({'error': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as exc:
        return Response({'error': f'Failed to evaluate reading: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

