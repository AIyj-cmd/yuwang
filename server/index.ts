import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { initDatabase } from './database.js';
import { registerRoutes } from './routes.js';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info'
  }
});

await app.register(cors, {
  origin: true
});

initDatabase();
await registerRoutes(app);

const distRoot = resolve(process.cwd(), 'dist');
if (existsSync(distRoot)) {
  await app.register(fastifyStatic, {
    root: distRoot,
    prefix: '/'
  });

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.code(404).send({ message: 'API route not found' });
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      return reply.type('text/html').sendFile('index.html');
    }

    return reply.code(404).send({ message: 'Route not found' });
  });
}

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
