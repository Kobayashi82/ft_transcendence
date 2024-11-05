from django.urls import path
from . import views

urlpatterns = [
    path('enable/', views.Enable2FAView.as_view(), name='enable_2fa'),
    path('verify/', views.Verify2FAView.as_view(), name='verify_2fa'),
]
