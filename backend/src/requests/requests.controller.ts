import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { LawyerPayload } from '../auth/decorators/current-user.decorator';
import { RequestsService } from './requests.service';
import { CreateDepositRequestDto } from './dto/create-deposit-request.dto';
import { CreateDepositRequestResponseDto } from './dto/create-deposit-request-response.dto';
import { DepositRequestResponseDto } from './dto/deposit-request-response.dto';
import { DepositRequestDetailDto } from './dto/deposit-request-detail.dto';

@ApiTags('requests')
@ApiBearerAuth('avocat-jwt')
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new deposit request for the authenticated lawyer',
  })
  @ApiCreatedResponse({ type: CreateDepositRequestResponseDto })
  async create(
    @Body() dto: CreateDepositRequestDto,
    @CurrentUser() lawyer: LawyerPayload,
  ): Promise<CreateDepositRequestResponseDto> {
    return this.requestsService.create(dto, lawyer.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List deposit requests for the authenticated lawyer',
  })
  @ApiOkResponse({ type: [DepositRequestResponseDto] })
  async findAll(
    @CurrentUser() lawyer: LawyerPayload,
  ): Promise<DepositRequestResponseDto[]> {
    return this.requestsService.findAllForLawyer(lawyer.id);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get details for a specific deposit request owned by the authenticated lawyer',
  })
  @ApiOkResponse({ type: DepositRequestDetailDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() lawyer: LawyerPayload,
  ): Promise<DepositRequestDetailDto> {
    return this.requestsService.findOneForLawyer(id, lawyer.id);
  }
}
