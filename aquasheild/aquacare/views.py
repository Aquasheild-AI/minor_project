from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Village
from .serializers import VillageSerializer

@api_view(['GET'])
def get_villages_for_gis_map(request):
    villages = Village.objects.all()
    # Serialize the query set into JSON:
    serializer = VillageSerializer(villages, many=True)
    return Response(serializer.data)

# Create your views here.
def home(request):
    return render(request, 'home.html')
