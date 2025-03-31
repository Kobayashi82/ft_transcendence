◦ Major module: Use a framework to build the backend.
◦ Minor module: Use a framework or a toolkit to build the frontend.
◦ Minor module: Use a database for the backend.
◦ Major module: Designing the backend as microservices.
◦ Minor module: Support on all devices.
◦ Minor module: Expanding browser compatibility.

◦ Major module: Standard user management, authentication.
◦ Major module: Implement Two-Factor Authentication (2FA) and JWT.
◦ Major module: Implementing a remote authentication (Google).

◦ Minor module: Game customization options.
◦ Major module: Introduce an AI opponent.
◦ Major module: Remote player.
◦ Major module: Replace basic Pong with server-side Pong.

# Endpoints para Auth Service

## Registro y verificación

- **POST /api/register**: Recibe credenciales básicas y crea registro de autenticación
- **POST /api/verify-code**: Verifica el código enviado por email
- **POST /api/resend-verification**: Reenvía el código de verificación

## Autenticación básica

- **POST /api/login**: Autentica con credenciales y devuelve tokens
- **POST /api/refresh**: Renueva un token JWT usando el refresh token
- **POST /api/logout**: Invalida tokens activos de la sesión actual

## Gestión de sesiones

- **POST /api/logout-all**: Cierra todas las sesiones del usuario
- **GET /api/sessions**: Lista las sesiones activas del usuario
- **DELETE /api/sessions/:id**: Revoca una sesión específica

## Autenticación con terceros

- **GET /api/oauth/google**: Inicia el flujo de autenticación con Google
- **GET /api/oauth/google/callback**: Callback para procesar respuesta de Google

## Recuperación de cuenta

- **POST /api/forgot-password**: Inicia el proceso de recuperación de contraseña
- **POST /api/reset-password**: Cambia la contraseña usando un token de recuperación

## Seguridad y 2FA

- **POST /api/2fa/enable**: Activa 2FA y genera códigos de respaldo
- **POST /api/2fa/verify**: Verifica un código 2FA
- **POST /api/2fa/disable**: Desactiva 2FA
- **POST /api/2fa/regenerate-codes**: Regenera códigos de respaldo

## Utilidades para el sistema

- **POST /api/validate**: Valida un token JWT
- **POST /api/revoke**: Revoca un token específico

# Endpoints para User Service

## Perfiles de usuario

- **GET /api/users/me**: Obtiene el perfil del usuario actual
- **PUT /api/users/me**: Actualiza el perfil del usuario actual
- **GET /api/users/:id**: Obtiene perfil público de un usuario específico
- **GET /api/users**: Busca/lista usuarios (con filtros)
- **PUT /api/users/me/avatar**: Actualiza la imagen de avatar
- **DELETE /api/users/me/avatar**: Elimina la imagen de avatar

## Relaciones entre usuarios

- **GET /api/users/me/friends**: Lista amigos del usuario
- **POST /api/users/:id/friend-request**: Envía solicitud de amistad
- **PUT /api/users/friend-requests/:id/accept**: Acepta solicitud de amistad
- **PUT /api/users/friend-requests/:id/reject**: Rechaza solicitud de amistad
- **DELETE /api/users/friends/:id**: Elimina amistad con otro usuario
- **GET /api/users/me/friend-requests**: Lista solicitudes de amistad pendientes
- **GET /api/users/me/blocked**: Lista usuarios bloqueados
- **POST /api/users/:id/block**: Bloquea a un usuario
- **DELETE /api/users/blocked/:id**: Desbloquea a un usuario

## Estado y actividad

- **GET /api/users/status**: Obtiene estado en línea de usuarios (para amigos)
- **PUT /api/users/me/status**: Actualiza estado del usuario (online, away, in-game)
- **GET /api/users/me/activity**: Obtiene historial de actividad reciente

## Configuraciones y preferencias

- **GET /api/users/me/settings**: Obtiene configuraciones del usuario
- **PUT /api/users/me/settings**: Actualiza configuraciones del usuario

## Estadísticas

- **GET /api/users/:id/stats**: Obtiene estadísticas generales del usuario
- **GET /api/users/:id/game-stats**: Obtiene estadísticas específicas de juegos
