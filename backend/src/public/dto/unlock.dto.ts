import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class UnlockDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6g7h8',
    description: 'Token public de la demande de dépôt',
  })
  @IsString()
  token!: string;

  @ApiProperty({
    example: '8732',
    description: 'Code PIN à 4 à 6 chiffres envoyé au déposant',
  })
  @IsString()
  @Matches(/^\d{4,6}$/)
  pin!: string;
}
