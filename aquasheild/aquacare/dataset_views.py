import os
import duckdb
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

DATASET_PATH = os.path.join(settings.BASE_DIR, 'data', 'waterborne_disease_dataset.csv')

def get_status_from_wqi(wqi):
    if wqi >= 70:
        return 'Safe'
    elif wqi >= 50:
        return 'Warning'
    elif wqi >= 25:
        return 'Unsafe'
    else:
        return 'Critical'

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_water_quality_dataset(request):
    # Parameters
    page = int(request.query_params.get('page', 1))
    limit = int(request.query_params.get('limit', 10))
    offset = (page - 1) * limit

    state = request.query_params.get('state')
    district = request.query_params.get('district')
    month = request.query_params.get('month')
    water_source = request.query_params.get('water_source')
    water_treatment = request.query_params.get('water_treatment')
    status_filter = request.query_params.get('status')

    # Build SQL query
    conditions = []
    params = []
    
    if state:
        conditions.append("LOWER(state) LIKE LOWER(?)")
        params.append(f"%{state}%")
    if district:
        conditions.append("LOWER(district) LIKE LOWER(?)")
        params.append(f"%{district}%")
    if month:
        conditions.append("LOWER(month) = LOWER(?)")
        params.append(month)
    if water_source:
        conditions.append("LOWER(water_source) LIKE LOWER(?)")
        params.append(f"%{water_source}%")
    if water_treatment:
        conditions.append("LOWER(water_treatment) LIKE LOWER(?)")
        params.append(f"%{water_treatment}%")
    
    if status_filter:
        status_filter = status_filter.lower()
        if status_filter == 'safe':
            conditions.append("water_quality_index >= 70")
        elif status_filter == 'warning':
            conditions.append("water_quality_index >= 50 AND water_quality_index < 70")
        elif status_filter == 'unsafe':
            conditions.append("water_quality_index >= 25 AND water_quality_index < 50")
        elif status_filter == 'critical':
            conditions.append("water_quality_index < 25")

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)
    
    query = f"""
        SELECT 
            state, district, region, latitude, longitude, 
            water_source, water_treatment, water_quality_index, 
            ph, turbidity_ntu, dissolved_oxygen_mg_l, bod_mg_l, 
            fecal_coliform_per_100ml, total_coliform_per_100ml, 
            tds_mg_l, nitrate_mg_l, fluoride_mg_l, arsenic_ug_l, 
            month, avg_temperature_c, avg_rainfall_mm, avg_humidity_pct, flooding
        FROM read_csv_auto('{DATASET_PATH}')
        {where_clause}
        LIMIT {limit} OFFSET {offset}
    """
    
    count_query = f"""
        SELECT COUNT(*) 
        FROM read_csv_auto('{DATASET_PATH}')
        {where_clause}
    """
    
    conn = duckdb.connect(database=':memory:', read_only=False)
    
    total_count = conn.execute(count_query, params).fetchone()[0]
    results = conn.execute(query, params).fetchall()
    columns = [desc[0] for desc in conn.description]
    
    data = []
    for row in results:
        row_dict = dict(zip(columns, row))
        
        wqi = row_dict.get('water_quality_index', 0)
        status_val = get_status_from_wqi(wqi)
        
        import uuid
        data.append({
            'id': str(uuid.uuid4()),
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
            'status': status_val.lower(),
        })
        
    return Response({
        'data': data,
        'page': page,
        'limit': limit,
        'total': total_count
    })
