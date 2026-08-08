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
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
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
