'use strict'

// Definición de los microservicios disponibles
const services = {
  // Servicio principal basado en el template
  main: {
    url: process.env.MAIN_SERVICE_URL || 'http://template:3000',
    prefix: '/api',
    routes: {
      // Aquí puedes mapear rutas específicas si es necesario
    },
    // Timeout en milisegundos
    timeout: parseInt(process.env.MAIN_SERVICE_TIMEOUT || '5000'),
    // Opciones para el proxy
    proxyOptions: {
      rewriteRequestHeaders: (req, headers) => {
        // Aquí puedes modificar headers si es necesario
        return headers;
      }
    }
  },
  
  // Puedes agregar más servicios a medida que los crees:
  /*
  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://auth:3000',
    prefix: '/auth',
    timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT || '5000'),
  },
  game: {
    url: process.env.GAME_SERVICE_URL || 'http://game:3000',
    prefix: '/game',
    timeout: parseInt(process.env.GAME_SERVICE_TIMEOUT || '5000'),
  },
  */
};

// Mapa de rutas para redirigir a servicios específicos
// Esto se usará en el plugin de proxy para determinar a qué servicio redirigir cada solicitud
const routeMap = {
  '/api': 'main',
  // Agrega más mapeos de ruta a medida que agregues servicios
  // '/auth': 'auth',
  // '/game': 'game',
};

module.exports = {
  services,
  routeMap
}