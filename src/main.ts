import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.use(cookieParser());

    const frontendUrls = (process.env.FRONTEND_URLS ?? '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || frontendUrls.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'), false);
      },
      credentials: true,
    });
    app.setGlobalPrefix('api/v1');
    const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
    const uploadPublicPath = process.env.UPLOAD_PUBLIC_PATH ?? '/uploads';

    app.useStaticAssets(join(process.cwd(), uploadDir), {
      prefix: `${uploadPublicPath}/`,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const dataSource = app.get(DataSource);
    const configService = app.get(ConfigService);

    const dbHost = configService.get<string>('DB_HOST');
    const dbPort = configService.get<string>('DB_PORT');
    const dbName = configService.get<string>('DB_DATABASE');

    if (dataSource.isInitialized) {
      console.log('====================================');
      console.log('✅ Database connected successfully');
      console.log(`📦 Database: ${dbName}`);
      console.log(`🌐 Host: ${dbHost}:${dbPort}`);
      console.log('====================================');
    }

    const port = process.env.PORT ?? 3000;

    await app.listen(port);

    console.log(`🚀 Server is running on http://localhost:${port}`);
  } catch (error) {
    console.log('====================================');
    console.log('❌ Application startup failed');

    if (error instanceof Error) {
      console.log('Error message:', error.message);
    } else {
      console.log('Error:', error);
    }

    console.log('====================================');

    process.exit(1);
  }
}

bootstrap();
