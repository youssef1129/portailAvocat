import { ApiProperty } from '@nestjs/swagger';

export class UnlockResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Jeton de session de dépôt pour les actions publiques',
  })
  depositSessionToken!: string;

  @ApiProperty({
    example: 1800,
    description: 'Durée de validité du jeton en secondes',
  })
  expiresIn!: number;
}
