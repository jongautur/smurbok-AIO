import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MailModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        // RS256: sign with private key, verify with public key.
        // A stolen public key cannot forge tokens — only the private key can sign.
        privateKey: process.env.JWT_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        publicKey: process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n'),
        signOptions: { algorithm: 'RS256', expiresIn: '30d' },
        verifyOptions: { algorithms: ['RS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
