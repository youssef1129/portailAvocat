import { ApiProperty } from '@nestjs/swagger';
import { DepositRequestResponseDto } from './deposit-request-response.dto';
import { DepositedFileDto } from './deposited-file.dto';

export class DepositRequestDetailDto extends DepositRequestResponseDto {
  @ApiProperty({
    type: [DepositedFileDto],
    description: 'Liste des fichiers déposés dans cette demande',
  })
  files!: DepositedFileDto[];
}
