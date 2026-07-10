import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const appPrefix = configService.get<string>('APP_PREFIX', 'api');
  const appPort = configService.get<number>('APP_PORT', 3000);
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:4200');

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

  app.useGlobalInterceptors(new TransformInterceptor());

  await app.listen(appPort);
  console.log(`🚀 Parking Management API running on http://localhost:${appPort}/${appPrefix}`);
}

bootstrap();
