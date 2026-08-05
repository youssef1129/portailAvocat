import { ApiProperty } from '@nestjs/swagger';

export class PublicDepositedFileDto {
  @ApiProperty({
    example: 'de0b18f4-82e7-4d16-9e6a-7afea4d7fc3a',
    description: 'Identifiant unique du fichier déposé',
  })
  id!: string;

  @ApiProperty({
    example: 'dossier.pdf',
    description: 'Nom original du fichier déposé',
  })
  originalName!: string;

  @ApiProperty({ example: 124567, description: 'Taille du fichier en octets' })
  sizeBytes!: number;

  @ApiProperty({
    example: '2026-08-05T14:03:45.123Z',
    description: 'Date et heure du dépôt du fichier',
  })
  uploadedAt!: Date;
}
