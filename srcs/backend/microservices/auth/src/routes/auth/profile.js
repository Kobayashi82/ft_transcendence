'use strict'

async function profileRoutes(fastify, options) {

  fastify.get('/me', {
    preValidation: [fastify.verifyJWT]
  }, async (request, reply) => {
    try {
      const userId = request.user.sub;
      
      // Fetch user from database
      const user = await fastify.authDB.getUserById(userId);
      if (!user) {
        reply.code(404).send({ 
          error: 'Not found', 
          message: 'User not found' 
        });
        return;
      }
      
      // Get active sessions
      const sessions = await fastify.authDB.getActiveSessions(userId);
      
      // Get user devices
      const devices = await fastify.authDB.getUserDevices(userId);
      
      // Return user data
      reply.send({
        id: user.id,
        username: user.username,
        email: user.email,
        account_type: user.account_type,
        roles: user.roles,
        has_2fa: user.has_2fa,
        created_at: user.created_at,
        last_login: user.last_login,
        sessions: sessions.map(s => ({
          id: s.id,
          ip_address: s.ip_address,
          user_agent: s.user_agent,
          created_at: s.created_at,
          expires_at: s.expires_at,
          device_id: s.device_id
        })),
        devices: devices.map(d => ({
          id: d.device_id,
          name: d.device_name,
          type: d.device_type,
          last_used: d.last_used,
          login_count: d.login_count
        }))
      });
    } catch (err) {
      fastify.logger.error(err);
      reply.code(500).send({ 
        error: 'Internal error', 
        message: 'Error fetching user information' 
      });
    }
  });
}

module.exports = profileRoutes
