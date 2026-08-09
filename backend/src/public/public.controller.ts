import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { PublicService } from './services/public.service';
import { UnlockDto } from './dto/unlock.dto';
import { UnlockResponseDto } from './dto/unlock-response.dto';
import { PublicDepositedFileDto } from './dto/deposited-file.dto';
import { DepositSession } from './decorators/deposit-session.decorator';
import type { DepositSessionPayload } from './decorators/deposit-session.decorator';
import type { UploadedDepositFile } from './services/public.service';
import { DepositSessionGuard } from './guards/deposit-session.guard';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Post('unlock')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentatives / 60s par IP
  @ApiOperation({
    summary: 'Unlock a deposit request and receive a deposit session token',
  })
  @ApiCreatedResponse({ type: UnlockResponseDto })
  async unlock(@Body() dto: UnlockDto): Promise<UnlockResponseDto> {
    return this.publicService.unlock(dto.token, dto.pin);
  }

  @Post('files')
  @UseGuards(DepositSessionGuard)
  @ApiBearerAuth('deposit-session')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: `Pièce déposée. Formatts imposés par le serveur (détection magic-byte) :
      PDF, JPEG et PNG uniquement (application/pdf, image/jpeg, image/png).
      Taille maximale : 20 Mo. Le type MIME est détecté côté serveur à partir
      du contenu du fichier ; le type déclaré par le client n'est pas utilisé.`,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'PDF, JPEG ou PNG uniquement (max. 20 Mo). Type détecté par magic-byte serveur.',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a file to the unlocked deposit request' })
  @ApiCreatedResponse({ type: PublicDepositedFileDto })
  async uploadFile(
    @DepositSession() session: DepositSessionPayload,
    @UploadedFile() file: UploadedDepositFile,
  ): Promise<PublicDepositedFileDto> {
    return this.publicService.storeFile(session.requestId, file);
  }

  @Get('files')
  @UseGuards(DepositSessionGuard)
  @ApiBearerAuth('deposit-session')
  @ApiOperation({
    summary: 'List files uploaded to the unlocked deposit request',
  })
  @ApiOkResponse({ type: [PublicDepositedFileDto] })
  async listFiles(
    @DepositSession() session: DepositSessionPayload,
  ): Promise<PublicDepositedFileDto[]> {
    return this.publicService.listFiles(session.requestId);
  }
}
