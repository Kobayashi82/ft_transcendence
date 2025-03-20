'use strict'

// Cargar variables de entorno
require('dotenv').config()

const Fastify = require('fastify')
const config = require('./config')
const pino = require('pino')

// Lista de rutas de métricas que queremos filtrar
const metricsRoutes = [
  '/metrics',
  '/health',
  '/ping',
  '/status'
]

// Configuración personalizada para pino con formato simple
const pinoOptions = {
  level: config.logLevel || 'info',
  // Usar un formato más simple para los logs
  formatters: {
    level: (label) => {
      return { level: label }
    },
    // No incluir información adicional estándar
    bindings: () => ({})
  },
  // Personalizar el mensaje para eliminar el nivel y timestamp
  messageKey: 'message',
  // Configurar transporte para desarrollo
  transport: config.isDev ? {
    target: 'pino-pretty',
    options: {
      // Estas opciones controlan cómo se formatean los logs
      translateTime: false,  // No mostrar timestamp
      ignore: 'pid,hostname,level,time,env', // Ignorar estos campos
      messageFormat: '{msg}', // Solo mostrar el mensaje
      singleLine: true,      // Una línea por log
      colorize: false,       // Sin colores
      levelFirst: false      // No mostrar nivel primero
    }
  } : undefined
}

// Crear el logger personalizado
const logger = pino(pinoOptions)

// Crear un objeto para filtrar logs de métricas
const filteredLogger = {
  ...logger,
  
  // Sobreescribir el método info para filtrar logs
  info: function(obj, msg) {
    // Para mensajes simples, formato: logger.info("Mensaje")
    if (typeof obj === 'string') {
      return logger.info({ message: obj });
    }
    
    // Para objetos, verificar si es una ruta de métrica
    if (obj && typeof obj === 'object') {
      // Caso 1: Tiene una URL que es una ruta de métrica
      if (obj.url && metricsRoutes.some(route => obj.url.startsWith(route))) {
        return; // No loguear
      }
      
      // Caso 2: Tiene req.url que es una ruta de métrica
      if (obj.req && obj.req.url && metricsRoutes.some(route => obj.req.url.startsWith(route))) {
        return; // No loguear
      }
      
      // Si hay un mensaje pero no hay campo message, establecerlo para el formato correcto
      if (msg && !obj.message) {
        obj.message = msg;
      }
    }
    
    return logger.info(obj);
  },
  
  // Similar para otros niveles de log
  error: function(obj, msg) {
    if (typeof obj === 'string') {
      return logger.error({ message: obj });
    }
    
    if (msg && !obj.message) {
      obj.message = msg;
    }
    
    return logger.error(obj);
  },
  
  warn: function(obj, msg) {
    if (typeof obj === 'string') {
      return logger.warn({ message: obj });
    }
    
    if (obj && typeof obj === 'object') {
      if ((obj.url && metricsRoutes.some(route => obj.url.startsWith(route))) ||
          (obj.req && obj.req.url && metricsRoutes.some(route => obj.req.url.startsWith(route)))) {
        return;
      }
      
      if (msg && !obj.message) {
        obj.message = msg;
      }
    }
    
    return logger.warn(obj);
  },
  
  debug: function(obj, msg) {
    if (typeof obj === 'string') {
      return logger.debug({ message: obj });
    }
    
    if (obj && typeof obj === 'object') {
      if ((obj.url && metricsRoutes.some(route => obj.url.startsWith(route))) ||
          (obj.req && obj.req.url && metricsRoutes.some(route => obj.req.url.startsWith(route)))) {
        return;
      }
      
      if (msg && !obj.message) {
        obj.message = msg;
      }
    }
    
    return logger.debug(obj);
  },
  
  child: function(...args) {
    return logger.child(...args);
  }
}

// Inicializar Fastify con el logger personalizado
const app = Fastify({
  logger: filteredLogger
})

// Decorar con la configuración
app.decorate('config', config)

// Registrar plugins
app.register(require('./plugins/logger'))
app.register(require('./plugins/logstash'))
app.register(require('./plugins/metrics'), { metrics: config.metrics })
app.register(require('./plugins/redis'))
app.register(require('./plugins/auth'))
app.register(require('./plugins/proxy'))

// Registrar middleware
app.register(require('@fastify/cors'), config.cors)
app.register(require('@fastify/rate-limit'), config.rateLimit)
app.register(require('@fastify/helmet'))
app.register(require('@fastify/sensible'))

// Registrar rutas
app.register(require('./routes'))

// Manejar errores
app.setErrorHandler((error, request, reply) => {
  // No loguear errores para rutas de métricas
  if (!metricsRoutes.some(route => request.url.startsWith(route))) {
    // Log simplificado de error
    app.log.error(`Error: ${error.message}`);
    
    // También enviar a logstash si está disponible
    if (app.logstash) {
      app.logstash.error({ 
        error: error.message, 
        stack: error.stack,
        url: request.url,
        method: request.method,
        statusCode: reply.statusCode
      }, 'Error en solicitud');
    }
  }
  
  // Determinar el código de estado HTTP
  let statusCode = error.statusCode || 500;
  
  // No exponer detalles internos en producción
  const response = {
    error: statusCode >= 500 && !config.isDev ? 'Internal Server Error' : error.message,
    statusCode,
  };
  
  reply.status(statusCode).send(response);
})

// Iniciar el servidor
const start = async () => {
  try {
    await app.listen({ 
      port: config.port, 
      host: config.host 
    });
    
    // Formato simple para el mensaje de inicio
    console.log(`Gateway escuchando en ${config.host}:${config.port}`);
    
    // También con logstash si está disponible
    if (app.logstash) {
      app.logstash.info({ 
        message: `Gateway escuchando en ${config.host}:${config.port}`
      }, 'Servidor iniciado');
    }
  } catch (err) {
    // Log simplificado de error
    console.error(`Error al iniciar el servidor: ${err.message}`);
    
    if (app.logstash) {
      app.logstash.error({ error: err }, 'Error al iniciar el servidor');
    }
    
    process.exit(1);
  }
}

start();