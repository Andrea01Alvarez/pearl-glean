import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Servir imágenes subidas como archivos estáticos
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  const logger = new Logger('Bootstrap');

  // CORS Configuration
  const corsOrigin = process.env.CORS_ORIGIN || '';
  const allowedOrigins = corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global Prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;

  try {
    await app.listen(port);
    logger.log(`✅ Servidor ejecutándose en: http://localhost:${port}`);
    logger.log(`📡 API disponible en: http://localhost:${port}/api`);
    logger.log(`🔓 CORS habilitado para: ${allowedOrigins.join(', ')}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    logger.error(`❌ Error al iniciar el servidor: ${msg}`);
    process.exit(1);
  }
}

bootstrap();
