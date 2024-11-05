from django.urls import path
from . import views

urlpatterns = [
    path('view/', views.ProfileView.as_view(), name='view_profile'),
    path('edit/', views.EditProfileView.as_view(), name='edit_profile'),
]
