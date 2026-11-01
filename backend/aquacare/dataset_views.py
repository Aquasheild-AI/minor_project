import os
import csv
import logging
import duckdb
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from . import ml_service

logger = logging.getLogger(__name__)

_DATASET_CACHE = None

def get_status_from_wqi(wqi):
    if wqi >= 70:
        return 'Safe'
    elif wqi >= 50:
        return 'Warning'
    elif wqi >= 25:
        return 'Unsafe'
    else:
        return 'Critical'

def _resolve_dataset_path():
    candidates = [
        os.path.join(str(settings.BASE_DIR), 'data', 'waterborne_disease_dataset.csv'),
        os.path.join(str(settings.BASE_DIR), 'backend', 'data', 'waterborne_disease_dataset.csv'),
        os.path.join(str(settings.BASE_DIR.parent), 'data', 'waterborne_disease_dataset.csv'),
        os.path.join(str(settings.BASE_DIR.parent), 'backend', 'data', 'waterborne_disease_dataset.csv'),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c.replace('\\', '/')
    return candidates[0].replace('\\', '/')

def _get_evaluated_dataset():
    """
    Loads and runs real-time Module A Machine Learning risk classification
    over the water quality records, caching the result in memory so that
    table display, AI Analyze modal, and filter queries use unified, 100% consistent
    risk scoring.
    """
    global _DATASET_CACHE
    if _DATASET_CACHE is not None:
        return _DATASET_CACHE

    dataset_path = _resolve_dataset_path()
    raw_rows = []

    # 1. Attempt reading via DuckDB if file exists on disk
    if os.path.exists(dataset_path):
        try:
            conn = duckdb.connect(database=':memory:', read_only=False)
            query = f"""
                SELECT 
                    state, district, region, latitude, longitude, 
                    water_source, water_treatment, water_quality_index, 
                    ph, turbidity_ntu, dissolved_oxygen_mg_l, bod_mg_l, 
                    fecal_coliform_per_100ml, total_coliform_per_100ml, 
                    tds_mg_l, nitrate_mg_l, fluoride_mg_l, arsenic_ug_l, 
                    month, avg_temperature_c, avg_rainfall_mm, avg_humidity_pct, flooding
                FROM read_csv_auto('{dataset_path}')
            """
            results = conn.execute(query).fetchall()
            columns = [desc[0] for desc in conn.description]
            raw_rows = [dict(zip(columns, row)) for row in results]
        except Exception as e:
            logger.warning("DuckDB read failed: %s, falling back to csv.DictReader", e)
            raw_rows = []

    # 2. Resilient fallback: Python standard library csv.DictReader
    if not raw_rows and os.path.exists(dataset_path):
        try:
            with open(dataset_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    raw_rows.append({
                        'state': row.get('state'),
                        'district': row.get('district'),
                        'region': row.get('region'),
                        'latitude': float(row.get('latitude', 0)) if row.get('latitude') else None,
                        'longitude': float(row.get('longitude', 0)) if row.get('longitude') else None,
                        'water_source': row.get('water_source'),
                        'water_treatment': row.get('water_treatment'),
                        'water_quality_index': float(row.get('water_quality_index', 0)) if row.get('water_quality_index') else 0,
                        'ph': float(row.get('ph', 7.0)) if row.get('ph') else 7.0,
                        'turbidity_ntu': float(row.get('turbidity_ntu', 0)) if row.get('turbidity_ntu') else 0,
                        'dissolved_oxygen_mg_l': float(row.get('dissolved_oxygen_mg_l', 0)) if row.get('dissolved_oxygen_mg_l') else 0,
                        'bod_mg_l': float(row.get('bod_mg_l', 0)) if row.get('bod_mg_l') else 0,
                        'fecal_coliform_per_100ml': float(row.get('fecal_coliform_per_100ml', 0)) if row.get('fecal_coliform_per_100ml') else 0,
                        'total_coliform_per_100ml': float(row.get('total_coliform_per_100ml', 0)) if row.get('total_coliform_per_100ml') else 0,
                        'tds_mg_l': float(row.get('tds_mg_l', 0)) if row.get('tds_mg_l') else 0,
                        'nitrate_mg_l': float(row.get('nitrate_mg_l', 0)) if row.get('nitrate_mg_l') else 0,
                        'fluoride_mg_l': float(row.get('fluoride_mg_l', 0)) if row.get('fluoride_mg_l') else 0,
                        'arsenic_ug_l': float(row.get('arsenic_ug_l', 0)) if row.get('arsenic_ug_l') else 0,
                        'month': row.get('month'),
                        'avg_temperature_c': float(row.get('avg_temperature_c', 25.0)) if row.get('avg_temperature_c') else 25.0,
                        'avg_rainfall_mm': float(row.get('avg_rainfall_mm', 0)) if row.get('avg_rainfall_mm') else 0,
                        'avg_humidity_pct': float(row.get('avg_humidity_pct', 0)) if row.get('avg_humidity_pct') else 0,
                        'flooding': row.get('flooding'),
                    })
        except Exception as e:
            logger.warning("csv.DictReader failed: %s", e)

    # 3. Cloud deployment fallback: Populate from live database WaterQualityTest
    if not raw_rows:
        try:
            from .models import WaterQualityTest
            db_tests = WaterQualityTest.objects.select_related('village', 'water_source').all()
            for t in db_tests:
                raw_rows.append({
                    'state': t.village.state if t.village else 'Bihar',
                    'district': t.village.district if t.village else 'Patna',
                    'region': 'Central',
                    'latitude': float(t.village.latitude) if t.village and t.village.latitude else 25.6,
                    'longitude': float(t.village.longitude) if t.village and t.village.longitude else 85.1,
                    'water_source': t.water_source.name if t.water_source else 'Community Water Point',
                    'water_treatment': 'Chlorinated' if t.chlorine_residual else 'Raw / Untreated',
                    'water_quality_index': float(t.wqi or 75.0),
                    'ph': float(t.ph or 7.2),
                    'turbidity_ntu': float(t.turbidity or 2.5),
                    'dissolved_oxygen_mg_l': float(t.dissolved_oxygen or 6.5),
                    'bod_mg_l': 2.0,
                    'fecal_coliform_per_100ml': float(t.coliform_bacteria or 0),
                    'total_coliform_per_100ml': float(t.coliform_bacteria or 0),
                    'tds_mg_l': float(t.tds or 320),
                    'nitrate_mg_l': float(t.nitrate or 8.0),
                    'fluoride_mg_l': 0.8,
                    'arsenic_ug_l': 0.0,
                    'month': 10,
                    'avg_temperature_c': float(t.temperature or 25.0),
                    'avg_rainfall_mm': 20.0,
                    'avg_humidity_pct': 55.0,
                    'flooding': 0,
                })
        except Exception as e:
            logger.warning("Database fallback for water quality failed: %s", e)

    records = []
    ml_status_map = {
        'LOW': 'safe',
        'MEDIUM': 'warning',
        'HIGH': 'unsafe',
        'CRITICAL': 'critical',
    }

    for idx, row_dict in enumerate(raw_rows):
        wqi = row_dict.get('water_quality_index', 0)

        # Real-time evaluation using Module A CPCB Machine Learning Model
        try:
            eval_res = ml_service.evaluate_water_reading(
                ph=float(row_dict.get('ph')) if row_dict.get('ph') is not None else 7.2,
                temperature=float(row_dict.get('avg_temperature_c')) if row_dict.get('avg_temperature_c') is not None else 25.0,
                tds=float(row_dict.get('tds_mg_l')) if row_dict.get('tds_mg_l') is not None else 300.0,
                dissolved_oxygen=float(row_dict.get('dissolved_oxygen_mg_l')) if row_dict.get('dissolved_oxygen_mg_l') is not None else 6.0,
                nitrate=float(row_dict.get('nitrate_mg_l')) if row_dict.get('nitrate_mg_l') is not None else 10.0,
                source_type=row_dict.get('water_source', 'HANDPUMP'),
                fecal_coliform=float(row_dict.get('fecal_coliform_per_100ml')) if row_dict.get('fecal_coliform_per_100ml') is not None else None,
            )
            ml_risk_level = eval_res.get('risk_level', 'LOW')
            ml_risk_score = eval_res.get('risk_score', 0.0)
            status_val = ml_status_map.get(ml_risk_level, 'safe')
        except Exception:
            status_val = get_status_from_wqi(wqi).lower()
            ml_risk_level = 'LOW' if wqi >= 70 else ('MEDIUM' if wqi >= 50 else ('HIGH' if wqi >= 25 else 'CRITICAL'))
            ml_risk_score = 100.0 - float(wqi)

        records.append({
            'id': f'dataset-rec-{idx + 1}',
            'state': row_dict.get('state'),
            'district': row_dict.get('district'),
            'region': row_dict.get('region'),
            'latitude': row_dict.get('latitude'),
            'longitude': row_dict.get('longitude'),
            'waterSource': row_dict.get('water_source'),
            'waterTreatment': row_dict.get('water_treatment'),
            'waterQualityIndex': wqi,
            'ph': row_dict.get('ph'),
            'turbidity': row_dict.get('turbidity_ntu'),
            'dissolvedOxygen': row_dict.get('dissolved_oxygen_mg_l'),
            'bod': row_dict.get('bod_mg_l'),
            'fecalColiform': row_dict.get('fecal_coliform_per_100ml'),
            'totalColiform': row_dict.get('total_coliform_per_100ml'),
            'tds': row_dict.get('tds_mg_l'),
            'nitrate': row_dict.get('nitrate_mg_l'),
            'fluoride': row_dict.get('fluoride_mg_l'),
            'arsenic': row_dict.get('arsenic_ug_l'),
            'month': row_dict.get('month'),
            'temperature': row_dict.get('avg_temperature_c'),
            'rainfall': row_dict.get('avg_rainfall_mm'),
            'humidity': row_dict.get('avg_humidity_pct'),
            'flooding': row_dict.get('flooding'),
            'status': status_val,
            'mlRiskLevel': ml_risk_level,
            'mlRiskScore': ml_risk_score,
        })

    _DATASET_CACHE = records
    return _DATASET_CACHE


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_water_quality_dataset(request):
    try:
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 10))
        offset = (page - 1) * limit

        state = request.query_params.get('state')
        district = request.query_params.get('district')
        month = request.query_params.get('month')
        water_source = request.query_params.get('water_source')
        water_treatment = request.query_params.get('water_treatment')
        status_filter = request.query_params.get('status')

        records = _get_evaluated_dataset()
        filtered = records

        if state:
            filtered = [r for r in filtered if r.get('state') and state.lower() in str(r['state']).lower()]
        if district:
            filtered = [r for r in filtered if r.get('district') and district.lower() in str(r['district']).lower()]
        if month:
            filtered = [r for r in filtered if r.get('month') and str(month).lower() in str(r['month']).lower()]
        if water_source:
            filtered = [r for r in filtered if r.get('waterSource') and water_source.lower() in str(r['waterSource']).lower()]
        if water_treatment:
            filtered = [r for r in filtered if r.get('waterTreatment') and water_treatment.lower() in str(r['waterTreatment']).lower()]
        if status_filter:
            s_filt = status_filter.lower()
            level_synonyms = {
                'safe': {'safe', 'low'},
                'low': {'safe', 'low'},
                'warning': {'warning', 'medium', 'moderate'},
                'medium': {'warning', 'medium', 'moderate'},
                'moderate': {'warning', 'medium', 'moderate'},
                'unsafe': {'unsafe', 'high'},
                'high': {'unsafe', 'high'},
                'critical': {'critical'},
            }
            allowed = level_synonyms.get(s_filt, {s_filt})
            filtered = [r for r in filtered if r['status'].lower() in allowed or r['mlRiskLevel'].lower() in allowed]

        total_count = len(filtered)
        page_data = filtered[offset : offset + limit]

        return Response({
            'data': page_data,
            'page': page,
            'limit': limit,
            'total': total_count
        })
    except Exception as e:
        logger.exception("Error in get_water_quality_dataset: %s", e)
        return Response({
            'data': [],
            'page': 1,
            'limit': 10,
            'total': 0
        })
