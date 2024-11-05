from django.urls import path, include

urlpatterns = [
    path('api/accounts/auth/',			include('aauth.urls')),					# URLs para autenticación básica
    path('api/accounts/oauth/', 		include('oauth.urls')),					# URLs para autenticación OAuth
    path('api/accounts/two-factor/',	include('two_factor_auth.urls')),		# URLs para 2FA
    path('api/accounts/profile/',		include('profiles.urls')),				# URLs para gestión de perfil
]
