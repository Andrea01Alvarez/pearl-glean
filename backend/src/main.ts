import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const logger = new Logger('Bootstrap');

  // CORS Configuration
  const corsOrigin = process.env.CORS_ORIGIN || '';
  const allowedOrigins = corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global Prefix
  app.setGlobalPrefix('api');

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Pearl Glean API')
    .setDescription('API de la tienda de joyería Pearl Glean')
    .setVersion('1.0')
    .addTag('products', 'Gestión de productos')
    .addTag('promotions', 'Gestión de promociones y descuentos')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;

  try {
    await app.listen(port);
    logger.log(`✅ Servidor ejecutándose en: http://localhost:${port}`);
    logger.log(`📡 API disponible en: http://localhost:${port}/api`);
    logger.log(`📄 Swagger docs en: http://localhost:${port}/docs`);
    logger.log(`🔓 CORS habilitado para: ${allowedOrigins.join(', ')}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    logger.error(`❌ Error al iniciar el servidor: ${msg}`);
    process.exit(1);
  }
}

bootstrap();
