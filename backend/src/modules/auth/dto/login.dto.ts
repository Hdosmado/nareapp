import { IsEmail, IsString, MinLength } from 'class-validator';

/** Credenciales de inicio de sesión (prestador o usuario del panel). */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
