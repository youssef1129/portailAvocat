import { ApiProperty } from '@nestjs/swagger';
import { DepositRequestResponseDto } from './deposit-request-response.dto';

export class CreateDepositRequestResponseDto extends DepositRequestResponseDto {
  @ApiProperty({
    example: '8732',
    description: 'Code PIN affiché une seule fois après création',
  })
  pin!: string;
}
