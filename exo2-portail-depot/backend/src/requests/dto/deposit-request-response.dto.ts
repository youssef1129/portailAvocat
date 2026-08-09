import { ApiProperty } from '@nestjs/swagger';
import { DepositRequestStatus } from '../enums/deposit-request-status.enum';

export class DepositRequestResponseDto {
  @ApiProperty({
    example: '1f2a3b4c-5d6e-7f80-9012-3456789abcde',
    description: 'Identifiant unique de la demande',
  })
  id!: string;

  @ApiProperty({
    example: 'Dépôt urgent du dossier',
    description: 'Titre de la demande de dépôt',
  })
  title!: string;

  @ApiProperty({
    example: 'a1b2c3d4e5f6g7h8',
    description: 'Jeton public utilisé pour déverrouiller le dépôt',
  })
  publicToken!: string;

  @ApiProperty({
    enum: DepositRequestStatus,
    example: DepositRequestStatus.PENDING,
    description: 'État calculé de la demande',
  })
  status!: DepositRequestStatus;

  @ApiProperty({
    example: '2026-08-30T23:59:59.000Z',
    description: 'Date et heure d expiration du dépôt',
  })
  expiresAt!: Date;

  @ApiProperty({
    example: '2026-08-05T14:00:00.000Z',
    description: 'Date de création de la demande',
  })
  createdAt!: Date;

  @ApiProperty({ example: 0, description: 'Nombre de fichiers déjà déposés' })
  filesCount!: number;
}
