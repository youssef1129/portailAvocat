import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString } from 'class-validator';

export class CreateDepositRequestDto {
  @ApiProperty({
    example: 'Dépôt urgent du dossier',
    description: 'Titre de la demande de dépôt',
  })
  @IsString()
  title!: string;

  @ApiProperty({
    example: '2026-08-30T23:59:59.000Z',
    description: 'Date et heure d expiration du dépôt',
  })
  @IsDateString()
  expiresAt!: string;
}
