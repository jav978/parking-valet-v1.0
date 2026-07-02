import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const appPrefix = configService.get<string>('APP_PREFIX', 'api');
  const appPort = configService.get<number>('APP_PORT', 3001);
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:4201');

  app.setGlobalPrefix(appPrefix);

  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(appPort);
  console.log(`🚀 Parking Management API running on http://localhost:${appPort}/${appPrefix}`);
}

bootstrap();
