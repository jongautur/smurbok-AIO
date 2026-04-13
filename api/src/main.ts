import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { EtagInterceptor } from './common/interceptors/etag.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

function validateSecrets() {
  const required = ['JWT_PRIVATE_KEY', 'JWT_PUBLIC_KEY', 'FILE_SIGNING_SECRET']
  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    console.error(`[smurbok] FATAL: Missing required environment variables: ${missing.join(', ')}`)
    process.exit(1)
  }
}

async function bootstrap() {
  validateSecrets();

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1', {
    exclude: ['health', ''],
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  app.use(cookieParser());

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:'],
        },
      },
      // OAuth2 popup needs window.opener — same-origin breaks it
      crossOriginOpenerPolicy: { policy: 'unsafe-none' },
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  });

  app.useGlobalInterceptors(new LoggingInterceptor(), new EtagInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (process.env.SWAGGER_ENABLED === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Smurbók API')
      .setDescription(
        'Vehicle maintenance tracking backend.\n\n' +
        '**All authenticated endpoints return:**\n' +
        '- `401` — missing or expired token\n' +
        '- `403` — insufficient role/membership\n' +
        '- `404` — resource not found\n' +
        '- `400` — validation error',
      )
      .setVersion('1.0')
      .addOAuth2(
        {
          type: 'oauth2',
          description: 'Sign in with your @smurbok.is Google Workspace account',
          flows: {
            implicit: {
              authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
              scopes: {
                openid: 'OpenID Connect',
                email: 'Email address',
                profile: 'Profile information',
              },
            },
          },
        },
        'google-workspace',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('docs', app, document, {
      customCss: `
        .auth-container .wrapper,
        .auth-container .scopes {
          display: none !important;
        }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        oauth2RedirectUrl: `${process.env.PUBLIC_URL ?? 'http://localhost:3000'}/docs/oauth2-redirect.html`,
        initOAuth: {
          clientId: process.env.GOOGLE_CLIENT_ID ?? '',
          scopes: ['openid', 'email', 'profile'],
          additionalQueryStringParams: {
            hd: 'smurbok.is',      // hints Google to show Workspace login
            access_type: 'online',
          },
        },
      },
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
