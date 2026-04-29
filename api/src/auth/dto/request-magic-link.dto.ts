import { IsEmail, IsUUID } from 'class-validator';

export class RequestMagicLinkDto {
  @IsEmail()
  email: string;

  @IsUUID()
  sessionId: string;
}
