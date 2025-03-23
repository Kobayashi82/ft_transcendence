'use strict'

const fp = require('fastify-plugin')

async function rateLimitPlugin(fastify, options) {
  // Registrar el plugin base de rate-limit
  await fastify.register(require('@fastify/rate-limit'), {
    redis: fastify.redis,
    skipOnError: true,
    global: false, // Deshabilitar el límite global predeterminado
    // Función para generar logs
    onExceeded: (req) => {
      const route = req.url;
      const ip = req.ip;
      
      fastify.logger.warn(`Rate limit excedido: ${ip} en ${route}`, {
        ip: ip,
        url: route,
        method: req.method
      });
    },
    errorResponseBuilder: (req, context) => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Demasiadas solicitudes, intente nuevamente después de ${context.after}`
      }
    }
  });
  
  // Definir límites específicos para diferentes rutas
  const authLoginLimit = {
    max: 30,
    timeWindow: '5 minutes',
    keyGenerator: (req) => {
      const email = req.body && req.body.email ? req.body.email : 'anonymous';
      return `${req.ip}:login:${email}`;
    }
  };
  
  const authRegisterLimit = {
    max: 20,
    timeWindow: '30 minutes',
    keyGenerator: (req) => {
      const email = req.body && req.body.email ? req.body.email : 'anonymous';
      return `${req.ip}:register:${email}`;
    }
  };
  
  const authPasswordResetLimit = {
    max: 15,
    timeWindow: '15 minutes',
    keyGenerator: (req) => {
      const email = req.body && req.body.email ? req.body.email : 'anonymous';
      return `${req.ip}:password:${email}`;
    }
  };
  
  const authOauthLimit = {
    max: 30,
    timeWindow: '10 minutes'
  };
  
  const authValidateLimit = {
    max: 100,
    timeWindow: '1 minute'
  };
  
  const apiStandardLimit = {
    max: 200,
    timeWindow: '1 minute'
  };
  
  const apiSensitiveLimit = {
    max: 50,
    timeWindow: '1 minute'
  };
  
  // Añadir hook para aplicar los límites según la ruta
  fastify.addHook('onRequest', async (request, reply) => {
    const url = request.url;
    const method = request.method;
    
    // Crear objeto para almacenar la configuración del límite
    let rateLimit = null;
    
    // Determinar qué límite aplicar según la ruta
    if (url.startsWith('/auth/login') && method === 'POST') {
      rateLimit = authLoginLimit;
    } else if (url.startsWith('/auth/register') && method === 'POST') {
      rateLimit = authRegisterLimit;
    } else if (url.startsWith('/auth/password/reset') && method === 'POST') {
      rateLimit = authPasswordResetLimit;
    } else if (url.match(/\/auth\/oauth\/(google|42)\/init/) && method === 'GET') {
      rateLimit = authOauthLimit;
    } else if (url.startsWith('/auth/validate') && method === 'GET') {
      rateLimit = authValidateLimit;
    } else if (url.startsWith('/api/') && isSensitiveRoute(url)) {
      rateLimit = apiSensitiveLimit;
    } else if (url.startsWith('/api/')) {
      rateLimit = apiStandardLimit;
    }
    
    // Si hay una configuración de límite, aplicarla
    if (rateLimit) {
      // Añadir la configuración a reply.context.config en lugar de request.routeConfig
      reply.context.config = reply.context.config || {};
      reply.context.config.rateLimit = rateLimit;
    }
  });
  
  // Función auxiliar para determinar si una ruta es sensible
  function isSensitiveRoute(url) {
    // Implementar lógica para identificar rutas sensibles
    const sensitivePatterns = [
      '/api/user',
      '/api/admin',
      '/api/payment',
      '/api/sensitive'
    ];
    
    return sensitivePatterns.some(pattern => url.startsWith(pattern));
  }
  
  fastify.logger.info('Plugin de rate limiting configurado correctamente');
}

module.exports = fp(rateLimitPlugin, { name: 'rateLimit', dependencies: ['redis', 'logger'] });