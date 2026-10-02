from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
import random
from aquacare.models import (
    User, District, Village, WaterSource, WaterQualityTest,
    HealthRecord, Alert
)

DISTRICTS_DATA = [
    {
        'name': 'Varanasi',
        'code': 'DIST-VAR',
        'lat': 25.3176,
        'lon': 82.9739,
        'cmo_name': ('Dr. Rajesh', 'Srivastava'),
        'cmo_user': 'cmo_varanasi',
        'villages': [
            'Ramnagar', 'Shivpur', 'Cholapur', 'Rohaniya',
            'Harahua', 'Kashi Vidyapeeth', 'Pindra', 'Arajiline',
            'Sewapuri', 'Baragaon', 'Lohta', 'Phulpur'
        ],
        'workers': [
            ('Anita', 'Devi', 'worker_var_1'),
            ('Sunita', 'Singh', 'worker_var_2'),
            ('Ramesh', 'Patel', 'worker_var_3'),
            ('Pooja', 'Kumari', 'worker_var_4'),
        ]
    },
    {
        'name': 'Prayagraj',
        'code': 'DIST-PRY',
        'lat': 25.4358,
        'lon': 81.8463,
        'cmo_name': ('Dr. Vandana', 'Mishra'),
        'cmo_user': 'cmo_prayagraj',
        'villages': [
            'Naini', 'Phaphamau', 'Jhunsi', 'Shankargarh',
            'Koraon', 'Meja', 'Jasra', 'Soraon',
            'Mauaima', 'Holagarh', 'Bahria', 'Chaka'
        ],
        'workers': [
            ('Geeta', 'Yadav', 'worker_pry_1'),
            ('Manoj', 'Tiwari', 'worker_pry_2'),
            ('Kavita', 'Shukla', 'worker_pry_3'),
            ('Dinesh', 'Verma', 'worker_pry_4'),
        ]
    },
    {
        'name': 'Lucknow',
        'code': 'DIST-LKO',
        'lat': 26.8467,
        'lon': 80.9462,
        'cmo_name': ('Dr. Alok', 'Saxena'),
        'cmo_user': 'cmo_lucknow',
        'villages': [
            'Bakshi Ka Talab', 'Malihabad', 'Mohanlalganj', 'Gosainganj',
            'Sarojini Nagar', 'Chinhat', 'Kakori', 'Itaunja',
            'Banthra', 'Nagram', 'Mall', 'Bijnor'
        ],
        'workers': [
            ('Sushma', 'Pandey', 'worker_lko_1'),
            ('Vikas', 'Chauhan', 'worker_lko_2'),
            ('Rashmi', 'Gupta', 'worker_lko_3'),
            ('Amit', 'Srivastava', 'worker_lko_4'),
        ]
    },
    {
        'name': 'Gorakhpur',
        'code': 'DIST-GKP',
        'lat': 26.7606,
        'lon': 83.3732,
        'cmo_name': ('Dr. Pradeep', 'Tripathi'),
        'cmo_user': 'cmo_gorakhpur',
        'villages': [
            'Sahjanwa', 'Bansgaon', 'Campierganj', 'Pipraich',
            'Chauri Chaura', 'Gola', 'Barhalganj', 'Khorabar',
            'Chargawan', 'Bhalluan', 'Belghat', 'Uruwa'
        ],
        'workers': [
            ('Mamta', 'Dwivedi', 'worker_gkp_1'),
            ('Rakesh', 'Prasad', 'worker_gkp_2'),
            ('Suman', 'Maurya', 'worker_gkp_3'),
            ('Deepak', 'Nath', 'worker_gkp_4'),
        ]
    },
    {
        'name': 'Ayodhya',
        'code': 'DIST-AYO',
        'lat': 26.7922,
        'lon': 82.1998,
        'cmo_name': ('Dr. Meenakshi', 'Dubey'),
        'cmo_user': 'cmo_ayodhya',
        'villages': [
            'Rudauli', 'Sohawal', 'Milkipur', 'Bikapur',
            'Masodha', 'Maya Bazar', 'Haringtonganj', 'Amaniganj',
            'Pura Bazar', 'Tarun', 'Mawai', 'Bhadarsa'
        ],
        'workers': [
            ('Sangeeta', 'Pande', 'worker_ayo_1'),
            ('Santosh', 'Shukla', 'worker_ayo_2'),
            ('Neelam', 'Yadav', 'worker_ayo_3'),
            ('Suresh', 'Dubey', 'worker_ayo_4'),
        ]
    },
    {
        'name': 'Jhansi',
        'code': 'DIST-JHS',
        'lat': 25.4484,
        'lon': 78.5685,
        'cmo_name': ('Dr. Ashok', 'Parihar'),
        'cmo_user': 'cmo_jhansi',
        'villages': [
            'Babina', 'Moth', 'Garautha', 'Mauranipur',
            'Chirgaon', 'Badaagaon', 'Gursarai', 'Erich',
            'Ranipur', 'Baruasagar', 'Samthar', 'Tohri'
        ],
        'workers': [
            ('Kalpana', 'Rajput', 'worker_jhs_1'),
            ('Hemant', 'Kushwaha', 'worker_jhs_2'),
            ('Rekha', 'Bundela', 'worker_jhs_3'),
            ('Arjun', 'Ahirwar', 'worker_jhs_4'),
        ]
    },
    {
        'name': 'Mirzapur',
        'code': 'DIST-MZP',
        'lat': 25.1337,
        'lon': 82.5644,
        'cmo_name': ('Dr. Shailendra', 'Singh'),
        'cmo_user': 'cmo_mirzapur',
        'villages': [
            'Chunar', 'Vindhyachal', 'Kachhwa', 'Ahraura',
            'Rajgarh', 'Marihan', 'Lalganj', 'Halia',
            'Pahari', 'City Block', 'Kon', 'Majhawa'
        ],
        'workers': [
            ('Urmila', 'Bind', 'worker_mzp_1'),
            ('Kamlesh', 'Keshari', 'worker_mzp_2'),
            ('Priyanka', 'Kol', 'worker_mzp_3'),
            ('Satish', 'Pandey', 'worker_mzp_4'),
        ]
    }
]

class Command(BaseCommand):
    help = 'Seeds 7 Districts with 1 Authority per district, 12 Villages each, and 4 Workers each covering 3 villages'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Beginning hierarchy database seeding...'))
        total_villages = 0
        total_workers = 0
        total_sources = 0

        for dist_data in DISTRICTS_DATA:
            # 1. Authority User
            cmo_first, cmo_last = dist_data['cmo_name']
            cmo_username = dist_data['cmo_user']
            cmo_email = f'{cmo_username}@uphealth.gov.in'

            authority_user, created = User.objects.get_or_create(
                username=cmo_username,
                defaults={
                    'email': cmo_email,
                    'first_name': cmo_first,
                    'last_name': cmo_last,
                    'role': 'AUTHORITY',
                    'organization': f"Chief Medical Officer (CMO) Office, {dist_data['name']}",
                    'phone': '9876543210',
                }
            )
            authority_user.set_password('password123')
            authority_user.role = 'AUTHORITY'
            authority_user.save()

            # 2. District
            district, _ = District.objects.get_or_create(
                code=dist_data['code'],
                defaults={
                    'name': dist_data['name'],
                    'state': 'Uttar Pradesh',
                    'authority': authority_user,
                }
            )
            district.authority = authority_user
            district.save()

            # 3. 4 Health Workers
            hw_objs = []
            for hw_first, hw_last, hw_user in dist_data['workers']:
                hw_email = f'{hw_user}@uphealth.gov.in'
                worker, _ = User.objects.get_or_create(
                    username=hw_user,
                    defaults={
                        'email': hw_email,
                        'first_name': hw_first,
                        'last_name': hw_last,
                        'role': 'HEALTH_WORKER',
                        'organization': f"PHC Surveillance, {dist_data['name']}",
                        'phone': '9123456780',
                    }
                )
                worker.set_password('password123')
                worker.role = 'HEALTH_WORKER'
                worker.save()
                hw_objs.append(worker)
                total_workers += 1

            # 4. 12 Villages (3 per worker)
            base_lat = dist_data['lat']
            base_lon = dist_data['lon']
            random.seed(dist_data['code'])

            risk_choices = [
                ('LOW', 18.5), ('LOW', 22.0), ('LOW', 25.0),
                ('MEDIUM', 45.0), ('MEDIUM', 52.0), ('MEDIUM', 58.0),
                ('HIGH', 72.0), ('CRITICAL', 88.0),
            ]

            for idx, v_name in enumerate(dist_data['villages']):
                # Each worker covers 3 villages (idx // 3)
                assigned_worker = hw_objs[min(idx // 3, len(hw_objs) - 1)]
                v_num = idx + 1
                v_code = f"{dist_data['code']}-V{v_num:02d}"

                # Jitter coordinates slightly for GIS map
                offset_lat = (random.random() - 0.5) * 0.16
                offset_lon = (random.random() - 0.5) * 0.16
                v_lat = round(base_lat + offset_lat, 4)
                v_lon = round(base_lon + offset_lon, 4)

                pop = random.randint(1400, 4800)
                risk_lvl, risk_sc = risk_choices[idx % len(risk_choices)]

                village, _ = Village.objects.get_or_create(
                    code=v_code,
                    defaults={
                        'name': v_name,
                        'district': district,
                        'authority': authority_user,
                        'assigned_worker': assigned_worker,
                        'block': f'{v_name} Block',
                        'state': 'Uttar Pradesh',
                        'pincode': f'221{idx:03d}',
                        'latitude': v_lat,
                        'longitude': v_lon,
                        'population': pop,
                        'household_count': pop // 5,
                        'risk_level': risk_lvl,
                        'risk_score': risk_sc,
                    }
                )
                village.district = district
                village.authority = authority_user
                village.assigned_worker = assigned_worker
                village.risk_level = risk_lvl
                village.risk_score = risk_sc
                village.save()
                total_villages += 1

                # 5. Water Sources per Village (2 sources each)
                ws1, _ = WaterSource.objects.get_or_create(
                    village=village,
                    name=f'{v_name} Primary Handpump #1',
                    defaults={
                        'source_type': 'HANDPUMP',
                        'status': 'CONTAMINATED' if risk_lvl in ['HIGH', 'CRITICAL'] else 'SAFE',
                        'latitude': v_lat + 0.001,
                        'longitude': v_lon + 0.001,
                        'depth_meters': 35.0,
                    }
                )
                ws2, _ = WaterSource.objects.get_or_create(
                    village=village,
                    name=f'{v_name} Central Tubewell',
                    defaults={
                        'source_type': 'TUBEWELL',
                        'status': 'MODERATE' if risk_lvl == 'MEDIUM' else 'SAFE',
                        'latitude': v_lat - 0.001,
                        'longitude': v_lon - 0.001,
                        'depth_meters': 65.0,
                    }
                )
                total_sources += 2

                # Water Quality Tests
                is_contaminated = risk_lvl in ['HIGH', 'CRITICAL']
                WaterQualityTest.objects.get_or_create(
                    water_source=ws1,
                    village=village,
                    defaults={
                        'tested_by': assigned_worker,
                        'ph': 5.8 if is_contaminated else 7.2,
                        'turbidity': 9.2 if is_contaminated else 1.5,
                        'tds': 680.0 if is_contaminated else 210.0,
                        'temperature': 25.0,
                        'coliform_bacteria': 32.0 if is_contaminated else 0.0,
                        'e_coli_detected': is_contaminated,
                        'wqi': 24.5 if is_contaminated else 88.0,
                        'status': 'UNSAFE' if is_contaminated else 'SAFE',
                    }
                )

                # Health Record for high/critical villages
                if risk_lvl in ['HIGH', 'CRITICAL']:
                    HealthRecord.objects.get_or_create(
                        village=village,
                        patient_name=f'Resident of {v_name}',
                        defaults={
                            'recorded_by': assigned_worker,
                            'age': random.randint(12, 58),
                            'gender': 'M' if idx % 2 == 0 else 'F',
                            'disease_type': 'CHOLERA' if risk_lvl == 'CRITICAL' else 'ACUTE_DIARRHEA',
                            'symptoms': ['Severe Diarrhea', 'Dehydration', 'Vomiting'],
                            'severity': 'SEVERE' if risk_lvl == 'CRITICAL' else 'MODERATE',
                            'date_of_onset': timezone.now().date(),
                        }
                    )
                    Alert.objects.get_or_create(
                        village=village,
                        title=f'Boil Water Advisory: {v_name}',
                        defaults={
                            'message': f'High bacterial coliform detected in {v_name} drinking sources. Disinfect and boil water before consumption.',
                            'severity': 'HIGH' if risk_lvl == 'HIGH' else 'CRITICAL',
                            'alert_type': 'BOIL_WATER_ADVISORY',
                            'target_audience': 'ALL',
                            'action_required': 'Boil water for 5 minutes and avoid open wells.',
                            'is_active': True,
                            'generated_by_ai': True,
                        }
                    )

        self.stdout.write(self.style.SUCCESS(
            f'Seeding successfully completed!\n'
            f'- Districts: {len(DISTRICTS_DATA)}\n'
            f'- Authorities: {len(DISTRICTS_DATA)}\n'
            f'- Health Workers: {total_workers} (4 per district, each covering 3 villages)\n'
            f'- Villages: {total_villages} (12 per district)\n'
            f'- Water Sources: {total_sources}'
        ))
