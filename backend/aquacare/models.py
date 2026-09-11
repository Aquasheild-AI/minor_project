from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class User(AbstractUser):
    """
    Custom User model with role-based access control supporting:
    - COMMUNITY: Citizens / village residents reporting symptoms and viewing local advisories
    - HEALTH_WORKER: Field health workers logging clinical cases and testing water sources
    - AUTHORITY: Health administrators / district officers monitoring GIS maps and managing alerts
    """
    ROLE_CHOICES = (
        ('COMMUNITY', 'Community User / Citizen'),
        ('HEALTH_WORKER', 'Health Worker'),
        ('AUTHORITY', 'Health Authority / Admin'),
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='COMMUNITY',
        help_text="Role determining user permissions and available portal interface"
    )
    phone = models.CharField(max_length=15, blank=True, null=True, help_text="Contact telephone number")
    address = models.TextField(blank=True, null=True)
    organization = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Primary Health Centre (PHC), District Hospital, or Administrative department"
    )

    # Geographic linkage
    village = models.ForeignKey(
        'Village',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='residents',
        help_text="Primary residential village for Community Users"
    )
    assigned_villages = models.ManyToManyField(
        'Village',
        blank=True,
        related_name='health_workers',
        help_text="Villages assigned to this Health Worker for field surveillance"
    )

    # Preferences
    preferred_language = models.CharField(
        max_length=10,
        choices=(('en', 'English'), ('hi', 'Hindi')),
        default='en',
        help_text="Preferred language for UI and advisory notifications"
    )
    notification_alerts = models.BooleanField(
        default=True,
        help_text="Receive critical health warnings and boil-water advisories"
    )

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        full_name = self.get_full_name()
        display = full_name if full_name else self.username
        return f"{display} ({self.get_role_display()})"


class Village(models.Model):
    """
    Administrative and geographical unit monitored in GIS map and predictive surveillance.
    """
    RISK_LEVEL_CHOICES = (
        ('LOW', 'Low Risk'),
        ('MEDIUM', 'Medium Risk'),
        ('HIGH', 'High Risk'),
        ('CRITICAL', 'Critical Outbreak Risk'),
    )

    name = models.CharField(max_length=150, help_text="Village or locality name")
    code = models.CharField(max_length=50, unique=True, help_text="Census / administrative village code")
    district = models.CharField(max_length=100)
    block = models.CharField(max_length=100, blank=True, null=True, help_text="Sub-district / Block / Tehsil")
    state = models.CharField(max_length=100, default='State')
    pincode = models.CharField(max_length=10, blank=True, null=True)

    # Coordinates for GIS mapping (Leaflet compatible)
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        help_text="Latitude in decimal degrees (e.g. 26.8467)"
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        help_text="Longitude in decimal degrees (e.g. 80.9462)"
    )

    # Demographics
    population = models.PositiveIntegerField(default=1000, help_text="Estimated resident population")
    household_count = models.PositiveIntegerField(default=200, help_text="Total number of households")
    primary_water_source = models.CharField(
        max_length=100,
        blank=True,
        default='Borewell',
        help_text="Primary drinking water source (e.g. Borewell, River, Municipal Tap, Handpump)"
    )

    # AI Early Warning Risk Status
    risk_level = models.CharField(
        max_length=20,
        choices=RISK_LEVEL_CHOICES,
        default='LOW',
        help_text="Current aggregated disease outbreak risk level"
    )
    risk_score = models.FloatField(
        default=0.0,
        help_text="Current ML calculated risk score from 0.0 (safest) to 100.0 (highest risk)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Village'
        verbose_name_plural = 'Villages'
        ordering = ['name']
        indexes = [
            models.Index(fields=['district', 'name']),
            models.Index(fields=['risk_level']),
        ]

    def __str__(self):
        return f"{self.name} ({self.district}) - Risk: {self.risk_level}"

    @property
    def active_alerts_count(self):
        return self.alerts.filter(is_active=True).count()

    @property
    def recent_cases_count(self):
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        return self.health_records.filter(date_recorded__gte=thirty_days_ago).count()


class WaterSource(models.Model):
    """
    Physical water point / supply asset located within a village.
    """
    SOURCE_TYPE_CHOICES = (
        ('WELL', 'Open Well'),
        ('TUBEWELL', 'Tube Well / Borewell'),
        ('HANDPUMP', 'Hand Pump'),
        ('RIVER', 'River / Stream / Canal'),
        ('TAP', 'Piped / Tap Water Supply'),
        ('POND', 'Pond / Tank / Lake'),
        ('OTHER', 'Other Water Source'),
    )

    STATUS_CHOICES = (
        ('SAFE', 'Safe / Potable'),
        ('MODERATE', 'Moderate Risk'),
        ('CONTAMINATED', 'Contaminated / Unsafe'),
        ('UNDER_TREATMENT', 'Under Treatment / Chlorination'),
        ('INACTIVE', 'Inactive / Broken / Dry'),
    )

    village = models.ForeignKey(
        Village,
        on_delete=models.CASCADE,
        related_name='water_sources',
        help_text="Village where this water source is situated"
    )
    name = models.CharField(
        max_length=150,
        help_text="Identifier (e.g. 'Community Handpump #3', 'North Well')"
    )
    source_type = models.CharField(
        max_length=20,
        choices=SOURCE_TYPE_CHOICES,
        default='HANDPUMP'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='SAFE',
        help_text="Current operational and safety status"
    )

    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Precise GPS latitude of the water point"
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Precise GPS longitude of the water point"
    )

    is_public = models.BooleanField(
        default=True,
        help_text="Whether this water source is accessible for public community use"
    )
    depth_meters = models.FloatField(blank=True, null=True, help_text="Well/borewell depth in meters")
    installed_year = models.PositiveIntegerField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Water Source'
        verbose_name_plural = 'Water Sources'
        ordering = ['village', 'name']

    def __str__(self):
        return f"{self.name} - {self.village.name} ({self.get_source_type_display()})"


class WaterQualityTest(models.Model):
    """
    Periodic water sampling test records measuring physical, chemical, and microbiological parameters.
    Directly reflects the frontend parameters: pH, Turbidity, TDS, Temperature, Coliform, and E. Coli.
    """
    STATUS_CHOICES = (
        ('EXCELLENT', 'Excellent (WQI >= 90)'),
        ('GOOD', 'Good / Safe (70 <= WQI < 90)'),
        ('POOR', 'Poor / Caution (50 <= WQI < 70)'),
        ('VERY_POOR', 'Very Poor / High Risk (25 <= WQI < 50)'),
        ('UNSAFE', 'Unsafe / Critical Contamination (WQI < 25)'),
    )

    water_source = models.ForeignKey(
        WaterSource,
        on_delete=models.CASCADE,
        related_name='quality_tests'
    )
    village = models.ForeignKey(
        Village,
        on_delete=models.CASCADE,
        related_name='water_quality_tests'
    )
    tested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conducted_water_tests',
        help_text="Health Worker or Lab Technician who conducted the sample test"
    )
    sample_date = models.DateTimeField(default=timezone.now, help_text="Date and time when sample was collected")

    # 4 Core Dashboard Parameters
    ph = models.FloatField(help_text="pH value (Standard safe range: 6.5 to 8.5)")
    turbidity = models.FloatField(help_text="Turbidity in NTU (Standard safe: < 5.0 NTU, ideal < 1.0)")
    tds = models.FloatField(help_text="Total Dissolved Solids in mg/L or ppm (Standard safe: < 500 mg/L)")
    temperature = models.FloatField(help_text="Water temperature in °C")

    # Microbiological & Chemical Contamination Indicators
    coliform_bacteria = models.FloatField(
        default=0.0,
        help_text="Total Coliform count (CFU/100mL or MPN/100mL, standard is 0)"
    )
    e_coli_detected = models.BooleanField(
        default=False,
        help_text="Whether pathogenic Escherichia coli was detected in sample"
    )
    chlorine_residual = models.FloatField(
        blank=True,
        null=True,
        help_text="Residual free chlorine in mg/L (Standard: 0.2 - 0.5 mg/L)"
    )
    dissolved_oxygen = models.FloatField(blank=True, null=True, help_text="Dissolved Oxygen (DO) in mg/L")
    nitrate = models.FloatField(blank=True, null=True, help_text="Nitrate concentration in mg/L (Safe: < 45 mg/L)")

    # Overall Water Quality Index (WQI) & Classification
    wqi = models.FloatField(
        blank=True,
        null=True,
        help_text="Water Quality Index score from 0 (heavily polluted) to 100 (pristine)"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='GOOD'
    )
    notes = models.TextField(blank=True, null=True, help_text="Field notes, odor, color, or sampling observations")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Water Quality Test'
        verbose_name_plural = 'Water Quality Tests'
        ordering = ['-sample_date']
        indexes = [
            models.Index(fields=['village', '-sample_date']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.water_source.name} on {self.sample_date.strftime('%Y-%m-%d')} - {self.get_status_display()}"

    def calculate_wqi_and_status(self):
        """
        Heuristic calculation of Water Quality Index (0-100) based on WHO/BIS guidelines.
        """
        score = 100.0

        if self.ph < 6.5:
            score -= min(35.0, (6.5 - self.ph) * 20.0)
        elif self.ph > 8.5:
            score -= min(35.0, (self.ph - 8.5) * 20.0)

        if self.turbidity > 5.0:
            score -= min(30.0, (self.turbidity - 5.0) * 3.0)

        if self.tds > 500:
            score -= min(25.0, (self.tds - 500) / 40.0)

        if self.e_coli_detected:
            score -= 45.0
        elif self.coliform_bacteria > 0:
            score -= min(35.0, self.coliform_bacteria * 2.0)

        calculated_wqi = max(0.0, min(100.0, round(score, 1)))

        if self.e_coli_detected or calculated_wqi < 25:
            computed_status = 'UNSAFE'
        elif calculated_wqi < 50:
            computed_status = 'VERY_POOR'
        elif calculated_wqi < 70:
            computed_status = 'POOR'
        elif calculated_wqi < 90:
            computed_status = 'GOOD'
        else:
            computed_status = 'EXCELLENT'

        return calculated_wqi, computed_status

    def save(self, *args, **kwargs):
        if self.water_source and not self.village_id:
            self.village = self.water_source.village

        calc_wqi, calc_status = self.calculate_wqi_and_status()
        if self.wqi is None:
            self.wqi = calc_wqi
        if not self.status or self.status == 'GOOD' or not self.pk:
            self.status = calc_status

        super().save(*args, **kwargs)

        # Update water source status
        if self.water_source_id:
            if self.status == 'UNSAFE':
                self.water_source.status = 'CONTAMINATED'
            elif self.status in ['POOR', 'VERY_POOR']:
                self.water_source.status = 'MODERATE'
            elif self.status in ['GOOD', 'EXCELLENT']:
                self.water_source.status = 'SAFE'
            self.water_source.save(update_fields=['status', 'updated_at'])


class HealthRecord(models.Model):
    """
    Clinical and epidemiological case surveillance records recorded by Health Workers.
    Tracks water-borne diseases such as Cholera, Typhoid, Diarrhea, and Dysentery.
    """
    DISEASE_CHOICES = (
        ('CHOLERA', 'Cholera'),
        ('TYPHOID', 'Typhoid Fever'),
        ('ACUTE_DIARRHEA', 'Acute Diarrhea'),
        ('DYSENTERY', 'Dysentery'),
        ('HEPATITIS_A', 'Hepatitis A'),
        ('HEPATITIS_E', 'Hepatitis E'),
        ('GASTROENTERITIS', 'Gastroenteritis'),
        ('OTHER', 'Other Water-Borne Disease'),
    )

    SEVERITY_CHOICES = (
        ('MILD', 'Mild'),
        ('MODERATE', 'Moderate'),
        ('SEVERE', 'Severe'),
        ('CRITICAL', 'Critical / ICU Required'),
    )

    STATUS_CHOICES = (
        ('UNDER_TREATMENT', 'Under Treatment'),
        ('RECOVERED', 'Recovered'),
        ('HOSPITALIZED', 'Hospitalized / Referred'),
        ('DECEASED', 'Deceased'),
    )

    village = models.ForeignKey(
        Village,
        on_delete=models.CASCADE,
        related_name='health_records',
        help_text="Village where the patient resides or contracted the illness"
    )
    recorded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_cases',
        help_text="Health Worker logging this clinical record"
    )

    patient_identifier = models.CharField(
        max_length=50,
        blank=True,
        help_text="Anonymized ID / token for patient privacy (e.g. PT-2026-0041)"
    )
    patient_name = models.CharField(max_length=120, blank=True, null=True)
    age = models.PositiveIntegerField(help_text="Patient age in years")
    gender = models.CharField(
        max_length=10,
        choices=(('M', 'Male'), ('F', 'Female'), ('O', 'Other'))
    )

    disease_type = models.CharField(
        max_length=30,
        choices=DISEASE_CHOICES,
        default='ACUTE_DIARRHEA'
    )
    symptoms = models.JSONField(
        default=list,
        help_text="List of observed symptoms (e.g. ['Diarrhea', 'Vomiting', 'Dehydration', 'High Fever'])"
    )
    severity = models.CharField(
        max_length=15,
        choices=SEVERITY_CHOICES,
        default='MODERATE'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='UNDER_TREATMENT'
    )

    date_of_onset = models.DateField(help_text="Date when symptoms first started")
    date_recorded = models.DateTimeField(default=timezone.now, help_text="Date and time when case was logged")

    suspected_water_source = models.ForeignKey(
        WaterSource,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='associated_cases',
        help_text="Suspected contaminated water point consumed by the patient"
    )
    treatment_administered = models.TextField(
        blank=True,
        null=True,
        help_text="Treatment given (e.g. Oral Rehydration Salts, Antibiotics, Zinc, IV Infusion)"
    )
    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Health Surveillance Record'
        verbose_name_plural = 'Health Surveillance Records'
        ordering = ['-date_recorded']
        indexes = [
            models.Index(fields=['village', '-date_recorded']),
            models.Index(fields=['disease_type']),
            models.Index(fields=['severity']),
        ]

    def __str__(self):
        return f"{self.get_disease_type_display()} ({self.village.name}) - {self.date_recorded.strftime('%Y-%m-%d')}"


class CommunityReport(models.Model):
    """
    Citizen reports submitted via Community Portal ("Report Health Issue").
    Allows villagers to report family/community illness clusters and water irregularities.
    """
    STATUS_CHOICES = (
        ('SUBMITTED', 'Submitted'),
        ('UNDER_REVIEW', 'Under Review by Health Worker'),
        ('VERIFIED', 'Verified / Confirmed Outbreak'),
        ('ACTION_TAKEN', 'Action Taken / Treated'),
        ('RESOLVED', 'Resolved'),
        ('DISMISSED', 'Dismissed / False Alarm'),
    )

    AGE_GROUP_CHOICES = (
        ('CHILD', 'Children (< 12 yrs)'),
        ('TEEN', 'Teenagers (12-18 yrs)'),
        ('ADULT', 'Adults (18-60 yrs)'),
        ('ELDERLY', 'Senior Citizens (60+ yrs)'),
        ('ALL_AGES', 'Multiple / All Age Groups'),
    )

    citizen = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='community_reports',
        help_text="Registered Community User reporting the issue (null if reported anonymously)"
    )
    village = models.ForeignKey(
        Village,
        on_delete=models.CASCADE,
        related_name='community_reports',
        help_text="Village where the health issue occurred"
    )

    reporter_name = models.CharField(max_length=100, blank=True, null=True)
    reporter_phone = models.CharField(max_length=20, blank=True, null=True)

    symptoms = models.JSONField(
        default=list,
        help_text="Selectable symptom chips (e.g. ['Diarrhea', 'Vomiting', 'Stomach Pain', 'High Fever'])"
    )
    people_affected = models.PositiveIntegerField(
        default=1,
        help_text="Number of household or community members experiencing these symptoms"
    )
    age_group = models.CharField(
        max_length=15,
        choices=AGE_GROUP_CHOICES,
        default='ADULT'
    )

    water_source_suspected = models.ForeignKey(
        WaterSource,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Suspected contaminated well/handpump/tap"
    )
    water_issue_observed = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="e.g. 'Foul smell', 'Cloudy muddy water', 'Unusual taste'"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Additional observations or context provided by the citizen"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='SUBMITTED'
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_citizen_reports',
        help_text="Health Worker or Authority who inspected the report"
    )
    review_notes = models.TextField(blank=True, null=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Community Health Report'
        verbose_name_plural = 'Community Health Reports'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['village', 'status']),
        ]

    def __str__(self):
        return f"Report #{self.id} - {self.village.name} ({self.people_affected} affected) - {self.status}"


class RiskPrediction(models.Model):
    """
    Machine Learning early warning model output for villages.
    Stores forecasted risk score, outbreak probability, contributing factors, and plain-language recommendations.
    """
    RISK_LEVEL_CHOICES = (
        ('LOW', 'Low Risk (0-30)'),
        ('MEDIUM', 'Medium Risk (31-60)'),
        ('HIGH', 'High Risk (61-80)'),
        ('CRITICAL', 'Critical Outbreak Risk (81-100)'),
    )

    village = models.ForeignKey(
        Village,
        on_delete=models.CASCADE,
        related_name='risk_predictions'
    )
    prediction_date = models.DateTimeField(default=timezone.now)

    risk_score = models.FloatField(
        help_text="Calculated continuous risk score (0.0 to 100.0)"
    )
    risk_level = models.CharField(
        max_length=20,
        choices=RISK_LEVEL_CHOICES,
        default='LOW'
    )
    outbreak_probability = models.FloatField(
        default=0.0,
        help_text="Predicted statistical probability of an outbreak within next 14 days (0.0 to 1.0)"
    )
    predicted_disease = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Most probable water-borne pathogen (e.g. Diarrhea, Cholera, Typhoid)"
    )

    contributing_factors = models.JSONField(
        default=dict,
        help_text="Feature impact breakdown: {'water_contamination': 45, 'case_surge': 30, 'temperature': 15, 'rainfall': 10}"
    )

    plain_language_explanation = models.TextField(
        blank=True,
        null=True,
        help_text="Non-technical explanation for community citizens"
    )
    recommended_actions = models.JSONField(
        default=list,
        help_text="List of actionable recommendations (e.g. ['Boil water before consumption', 'Chlorinate Community Well #1'])"
    )

    model_name = models.CharField(
        max_length=100,
        default='WaterBorne-Ensemble-v1',
        help_text="Identifier of the ML algorithm/version used"
    )
    is_latest = models.BooleanField(
        default=True,
        help_text="Flag indicating this is the most current prediction for the village"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Risk Prediction / Early Warning'
        verbose_name_plural = 'Risk Predictions & Early Warnings'
        ordering = ['-prediction_date']
        indexes = [
            models.Index(fields=['village', 'is_latest']),
            models.Index(fields=['risk_level']),
        ]

    def __str__(self):
        return f"{self.village.name}: {self.risk_score:.1f} ({self.risk_level}) on {self.prediction_date.strftime('%Y-%m-%d')}"

    def save(self, *args, **kwargs):
        if self.is_latest and self.village_id:
            RiskPrediction.objects.filter(village=self.village, is_latest=True).exclude(pk=self.pk).update(is_latest=False)
            self.village.risk_score = self.risk_score
            self.village.risk_level = self.risk_level
            self.village.save(update_fields=['risk_score', 'risk_level', 'updated_at'])

        super().save(*args, **kwargs)


class Alert(models.Model):
    """
    Targeted health warnings and advisories broadcast to Citizens, Health Workers, and Authorities.
    """
    SEVERITY_CHOICES = (
        ('INFO', 'Informational Notice'),
        ('WARNING', 'Warning / Caution'),
        ('HIGH', 'High Alert'),
        ('CRITICAL', 'Critical Emergency'),
    )

    ALERT_TYPE_CHOICES = (
        ('OUTBREAK_WARNING', 'Disease Outbreak Warning'),
        ('WATER_CONTAMINATION', 'Water Contamination Detected'),
        ('CASE_SPIKE', 'Unusual Health Case Spike'),
        ('BOIL_WATER_ADVISORY', 'Boil Water Advisory'),
        ('WEATHER_EVENT', 'Flood / Heavy Rainfall Risk'),
        ('MAINTENANCE', 'Water Supply Maintenance'),
    )

    TARGET_AUDIENCE_CHOICES = (
        ('ALL', 'All Users (Community, Health Workers, Authority)'),
        ('COMMUNITY', 'Community / Citizens Only'),
        ('HEALTH_WORKER', 'Health Workers Only'),
        ('AUTHORITY', 'Health Authorities Only'),
    )

    village = models.ForeignKey(
        Village,
        on_delete=models.CASCADE,
        related_name='alerts',
        help_text="Village where alert applies"
    )
    title = models.CharField(max_length=200, help_text="Short alert headline (e.g. 'Boil Water Advisory: North Well #2')")
    message = models.TextField(help_text="Detailed alert text and instructions")
    severity = models.CharField(
        max_length=15,
        choices=SEVERITY_CHOICES,
        default='WARNING'
    )
    alert_type = models.CharField(
        max_length=30,
        choices=ALERT_TYPE_CHOICES,
        default='OUTBREAK_WARNING'
    )
    target_audience = models.CharField(
        max_length=20,
        choices=TARGET_AUDIENCE_CHOICES,
        default='ALL'
    )
    action_required = models.TextField(
        blank=True,
        null=True,
        help_text="Recommended immediate actions for citizens or field workers"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Active alerts display banner and warnings in the portals"
    )
    generated_by_ai = models.BooleanField(
        default=False,
        help_text="True if automatically generated by ML Risk Prediction threshold breach"
    )
    related_prediction = models.ForeignKey(
        RiskPrediction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_alerts'
    )

    acknowledged_users = models.ManyToManyField(
        User,
        through='AlertAcknowledgement',
        blank=True,
        related_name='acknowledged_alerts'
    )

    created_at = models.DateTimeField(default=timezone.now)
    resolved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = 'Alert & Advisory'
        verbose_name_plural = 'Alerts & Advisories'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['village', 'is_active']),
            models.Index(fields=['severity']),
        ]

    def __str__(self):
        status_label = "ACTIVE" if self.is_active else "RESOLVED"
        return f"[{status_label}] {self.title} ({self.village.name}) - {self.severity}"


class AlertAcknowledgement(models.Model):
    """
    Tracking read / acknowledgement receipts when a user reviews an alert.
    """
    alert = models.ForeignKey(Alert, on_delete=models.CASCADE, related_name='acknowledgements')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alert_acknowledgements')
    acknowledged_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Alert Acknowledgement'
        verbose_name_plural = 'Alert Acknowledgements'
        unique_together = ('alert', 'user')

    def __str__(self):
        return f"{self.user.username} acknowledged {self.alert.title}"
