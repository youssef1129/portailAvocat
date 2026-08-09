import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';

export class LawyerDto {
  @ApiProperty({
    example: '1f2a3b4c-5d6e-7f80-9012-3456789abcde',
    description: 'Lawyer unique identifier',
  })
  id!: string;

  @ApiProperty({
    example: 'avocat@example.com',
    description: 'Lawyer email address',
  })
  email!: string;

  @ApiProperty({
    example: 'Mehdi Bensalem',
    description: 'Lawyer full name',
  })
  name!: string;

  @ApiProperty({
    example: '2026-08-05T12:34:56.789Z',
    description: 'Account creation timestamp',
  })
  createdAt!: Date;
}

@ApiExtraModels(LawyerDto)
export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Authenticated lawyer profile',
  })
  lawyer!: LawyerDto;
}
