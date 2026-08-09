import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'avocat@example.com',
    description: 'Lawyer account email address',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'StrongPassword123!',
    description: 'Password for the lawyer account',
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
