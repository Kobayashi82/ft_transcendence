"use strict";

const fp = require('fastify-plugin');
const WebSocket = require('ws');

function fastifyWebSocket(fastify, options, done) {
  const serviceConnections = new Map();

  // Decorar Fastify con método para enviar mensaje a un servicio
  fastify.decorate('sendToService', (serviceName, message) => {
    const serviceWs = serviceConnections.get(serviceName);
    if (serviceWs && serviceWs.readyState === WebSocket.OPEN) {
      serviceWs.send(JSON.stringify(message));
      return true;
    }
    return false;
  });

  // Decorar Fastify con método para obtener conexión de servicio
  fastify.decorate('getServiceConnection', (serviceName) => {
    return serviceConnections.get(serviceName);
  });

  // Configurar servidor WebSocket
  const wsServer = new WebSocket.Server({ 
    noServer: true, 
    ...options.serverOptions 
  });

  // Manejar conexiones de clientes
  wsServer.on('connection', (socket, req, service) => {
    // Asociar servicio al socket
    socket.service = service;

    // Manejar mensajes del cliente
    socket.on('message', (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage);
        
        // Enviar mensaje al servicio correspondiente
        const serviceWs = serviceConnections.get(service);
        if (serviceWs && serviceWs.readyState === WebSocket.OPEN) {
          serviceWs.send(JSON.stringify(message));
        }
      } catch (error) {
        console.error('Error processing client message:', error);
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    // Manejar cierre de conexión
    socket.on('close', () => {
      console.log(`Client disconnected from service ${service}`);
    });
  });

  // Exponer el servidor WebSocket
  fastify.decorate('websocketServer', wsServer);

  // Hook para cerrar conexiones al apagar el servidor
  fastify.addHook('onClose', (instance, done) => {
    wsServer.close();
    serviceConnections.forEach((ws) => ws.close());
    done();
  });

  done();
}

module.exports = fp(fastifyWebSocket, {
  name: 'websocket'
});