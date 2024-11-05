from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.OAuthLoginView.as_view(), name='oauth_login'),
    path('callback/', views.OAuthCallbackView.as_view(), name='oauth_callback'),
]
