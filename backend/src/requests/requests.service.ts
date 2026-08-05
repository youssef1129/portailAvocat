import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { DepositRequest } from './entities/deposit-request.entity';
import { DepositedFile } from './entities/deposited-file.entity';
import { CreateDepositRequestDto } from './dto/create-deposit-request.dto';
import { DepositRequestStatus } from './enums/deposit-request-status.enum';
import { Lawyer } from '../auth/entities/lawyer.entity';
import { StorageService } from '../storage/storage.service';
import { randomBytes, randomInt } from 'crypto';
import {
  DEPOSIT_REQUEST_REPOSITORY,
  DEPOSITED_FILE_REPOSITORY,
} from '../common/constants';

@Injectable()
export class RequestsService {
  constructor(
    @Inject(DEPOSIT_REQUEST_REPOSITORY)
    private readonly depositRequestRepository: Repository<DepositRequest>,
    @Inject(DEPOSITED_FILE_REPOSITORY)
    private readonly depositedFileRepository: Repository<DepositedFile>,
    private readonly storageService: StorageService,
  ) {}

  private computeStatus(request: DepositRequest): DepositRequestStatus {
    if (request.expiresAt < new Date()) {
      return DepositRequestStatus.EXPIRED;
    }
    if (request.files?.length > 0) {
      return DepositRequestStatus.COMPLETE;
    }
    return DepositRequestStatus.PENDING;
  }

  async create(dto: CreateDepositRequestDto, lawyerId: string) {
    const publicToken = randomBytes(10).toString('hex');
    const pin = randomInt(1000, 1000000).toString();
    const pinHash = await bcrypt.hash(pin, 10);

    const depositRequest = this.depositRequestRepository.create({
      title: dto.title,
      expiresAt: new Date(dto.expiresAt),
      publicToken,
      pinHash,
      lawyer: { id: lawyerId } as Lawyer,
    });

    const saved = await this.depositRequestRepository.save(depositRequest);
    return {
      id: saved.id,
      title: saved.title,
      publicToken: saved.publicToken,
      status: this.computeStatus(saved),
      expiresAt: saved.expiresAt,
      createdAt: saved.createdAt,
      filesCount: 0,
      pin,
    };
  }

  async findAllForLawyer(lawyerId: string) {
    const requests = await this.depositRequestRepository.find({
      where: { lawyer: { id: lawyerId } },
      relations: {
        files: true,
      },
      order: { createdAt: 'DESC' },
    });
    return requests.map((request) => ({
      id: request.id,
      title: request.title,
      publicToken: request.publicToken,
      status: this.computeStatus(request),
      expiresAt: request.expiresAt,
      createdAt: request.createdAt,
      filesCount: request.files?.length ?? 0,
    }));
  }

  async findOneForLawyer(id: string, lawyerId: string) {
    const request = await this.depositRequestRepository.findOne({
      where: { id, lawyer: { id: lawyerId } },
      relations: {
        files: true,
      },
    });
    if (!request) {
      throw new NotFoundException('Deposit request not found.');
    }
    return {
      id: request.id,
      title: request.title,
      publicToken: request.publicToken,
      status: this.computeStatus(request),
      expiresAt: request.expiresAt,
      createdAt: request.createdAt,
      filesCount: request.files?.length ?? 0,
      files: request.files.map((file) => ({
        id: file.id,
        originalName: file.originalName,
        sizeBytes: Number(file.sizeBytes),
        uploadedAt: file.uploadedAt,
      })),
    };
  }

  async getFilePreview(
    requestId: string,
    fileId: string,
    lawyerId: string,
  ): Promise<{ url: string }> {
    const request = await this.depositRequestRepository.findOne({
      where: { id: requestId, lawyer: { id: lawyerId } },
      relations: {
        files: true,
      },
    });
    if (!request) {
      throw new NotFoundException('Deposit request not found.');
    }
    const file = request.files.find((f) => f.id === fileId);
    if (!file) {
      throw new NotFoundException('File not found.');
    }
    const url = await this.storageService.getPresignedDownloadUrl(
      file.storageKey,
    );
    return { url };
  }
}
