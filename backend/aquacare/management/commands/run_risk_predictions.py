from django.core.management.base import BaseCommand

from aquacare import ml_service


class Command(BaseCommand):
    help = (
        "Re-run the ML risk models: water contamination risk for every village "
        "(from its latest water tests) and outbreak risk for every district "
        "(needs internet for live NASA POWER climate)."
    )

    def add_arguments(self, parser):
        parser.add_argument('--water-only', action='store_true', help='Only refresh village water risk.')
        parser.add_argument('--disease-only', action='store_true', help='Only refresh district outbreak risk.')

    def handle(self, *args, **options):
        water = not options['disease_only']
        disease = not options['water_only']
        summary = ml_service.refresh_all(water=water, disease=disease)
        if water:
            w = summary['water']
            self.stdout.write(f"Water risk: {w['updated']} villages updated, {w['skipped']} without tests")
            for err in w['errors']:
                self.stderr.write(f"  {err}")
        if disease:
            d = summary['disease']
            self.stdout.write(f"Outbreak risk: {d['updated']} districts updated")
            for err in d['errors']:
                self.stderr.write(f"  {err}")
