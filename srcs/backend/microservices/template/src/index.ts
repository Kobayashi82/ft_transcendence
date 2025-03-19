import http from 'http';
import { config } from './config';
import { initializeDB } from './database/db';
import { connectRedis } from './services/redis';
import { login } from './controllers/auth.controller';

const init = async () => {
  // Inicializar recursos
  await initializeDB();
  await connectRedis();

  // Configurar servidor HTTP
  const server = http.createServer((req, res) => {
    if (req.url === '/login' && req.method === 'POST') {
      login(req as any, res as any);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(config.PORT, () => {
    console.log(`Servicio ejecutándose en puerto ${config.PORT}`);
  });
};

init();