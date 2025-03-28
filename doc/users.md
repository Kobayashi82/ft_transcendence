# Lista de Tareas para Módulos de Gestión de Usuarios y Autenticación

## Módulo 1: Gestión Estándar de Usuarios y Usuarios en Torneos

### Sistema de Registro y Autenticación Básica
- Implementar endpoint para registro de usuarios (`/api/auth/register`)
- Crear endpoint para inicio de sesión con credenciales (`/api/auth/login`)
- Implementar hash seguro de contraseñas usando bcrypt
- Crear mecanismo de tokens JWT para mantener sesiones
- Implementar verificación de unicidad de email/username

### Gestión de Perfiles de Usuario
- Crear endpoint para actualización de información (`/api/users/:id`)
- Implementar lógica para selección de nombres de visualización únicos
- Desarrollar sistema de subida de avatares (implementando lo que ya discutimos)
- Crear avatar por defecto para nuevos usuarios

### Sistema de Amigos
- Implementar endpoint para enviar solicitudes de amistad
- Crear endpoint para aceptar/rechazar solicitudes
- Desarrollar sistema para mostrar estado en línea de amigos
- Implementar websockets para actualización en tiempo real de estado

### Estadísticas y Registro de Partidas
- Crear esquema de base de datos para almacenar estadísticas (victorias/derrotas)
- Implementar endpoint para historial de partidas 1v1
- Desarrollar lógica para actualizar estadísticas tras partidas
- Crear componentes React para visualizar estadísticas e historiales

## Módulo 2: Autenticación Remota (Google Sign-in)

### Configuración de Credenciales
- Registrar la aplicación en Google Cloud Console
- Obtener credenciales OAuth (Client ID y Client Secret)
- Configurar dominios autorizados y URLs de redirección

### Implementación de Flujo OAuth
- Integrar Google Sign-In en el frontend con React
- Crear endpoint para manejar callback de autenticación (`/api/auth/google/callback`)
- Implementar verificación de tokens con la API de Google
- Desarrollar lógica para crear/actualizar cuentas con datos de Google

### Integración con Sistema Existente
- Unificar sistema de tokens JWT para ambos métodos de autenticación
- Implementar lógica para vincular cuentas existentes con Google
- Crear flujo para solicitar información adicional si es necesaria
- Desarrollar manejo de sesiones compartido

### Seguridad y Mejores Prácticas
- Implementar HTTPS para todas las comunicaciones
- Configurar CORS adecuadamente
- Crear mecanismos de renovación de tokens
- Implementar revocación de acceso
- Añadir protección contra CSRF

## Componentes Compartidos

### Frontend (React + TypeScript + Tailwind)
- Desarrollar componentes de formularios de registro/login
- Crear páginas de perfil de usuario
- Implementar interfaz para gestión de amigos
- Desarrollar componentes para mostrar estadísticas
- Crear botones de inicio de sesión con Google

### Microservicios Backend (Fastify + Node)
- Microservicio de autenticación para manejar registro e inicio de sesión
- Microservicio de usuarios para gestión de perfiles
- Microservicio de amistad para gestionar relaciones entre usuarios
- Microservicio de estadísticas para almacenar y recuperar datos de partidas

### Infraestructura
- Configurar base de datos SQLite específica para usuarios
- Implementar almacenamiento para avatares (como BLOB en SQLite como discutimos)
- Configurar Redis para gestionar estado en línea y sesiones
- Asegurar que todos los servicios expongan métricas para Prometheus

Esta lista proporciona una visión completa de las tareas necesarias para implementar ambos módulos de gestión de usuarios y autenticación en tu arquitectura actual.