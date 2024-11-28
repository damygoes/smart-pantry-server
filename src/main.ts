import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips properties that do not have decorators in the DTO
      forbidNonWhitelisted: true, // Rejects requests with non-whitelisted properties
      validateCustomDecorators: true, // Validates custom decorators
      transform: true, // Automatically transform payloads to DTO instances
    }),
  );
  // Set the global prefix for all routes
  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.enableCors({
    origin: 'http://localhost:5173', // Replace with your frontend URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Include cookies in requests
    allowedHeaders: 'Content-Type, Authorization', // Add necessary headers
  });
  const config = new DocumentBuilder()
    .setTitle('Smart Shelf API')
    .setDescription('The Smart Shelf API description')
    .setVersion('1.0')
    .addTag('Authentication')
    // .addTag('Users')
    // .addTag('Companies')
    // .addTag('Customers')
    // .addTag('Invoices')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);

  // Log all registered routes
  // const server = app.getHttpServer();
  // const router = server._events.request._router;
  // router.stack
  //   .filter((layer) => layer.route) // Only log layers with routes
  //   .forEach((layer) => {
  //     console.log(
  //       `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${
  //         layer.route.path
  //       }`,
  //     );
  //   });
}
bootstrap();
