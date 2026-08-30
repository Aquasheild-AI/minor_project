from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_CHOICES = (
        ('COMMUNITY', 'Community User'),
        ('HEALTH_WORKER', 'Health Worker'),
        ('AUTHORITY', 'Health Authority'),
    )
    role = models.CharField(max_length=20,choices=ROLE_CHOICES,default='COMMUNITY')
    phone = models.CharField(max_length=15,blank=True,null=True)
    address = models.TextField(blank=True,null=True)
    organization = models.CharField(max_length=200,blank=True,null=True
    )
    def __str__(self):
        return f"{self.username} - {self.role}"
