import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  GoneException,
  Inject,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import {
  DEPOSIT_REQUEST_REPOSITORY,
  DEPOSITED_FILE_REPOSITORY,
  DEPOSIT_SESSION_REPOSITORY,
} from '../../common/constants';

export type UploadedDepositFile = {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
};
import { DepositRequest } from '../../requests/entities/deposit-request.entity';
import { DepositedFile } from '../../requests/entities/deposited-file.entity';
import { DepositSession } from '../entities/deposit-session.entity';
import { DepositRequestStatus } from '../../requests/enums/deposit-request-status.enum';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class PublicService {
  constructor(
    @Inject(DEPOSIT_REQUEST_REPOSITORY)
    private readonly depositRequestRepository: Repository<DepositRequest>,
    @Inject(DEPOSITED_FILE_REPOSITORY)
    private readonly depositedFileRepository: Repository<DepositedFile>,
    @Inject(DEPOSIT_SESSION_REPOSITORY)
    private readonly depositSessionRepository: Repository<DepositSession>,
    private readonly jwtService: JwtService,
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

  async unlock(token: string, pin: string) {
    const request = await this.depositRequestRepository
      .createQueryBuilder('request')
      .addSelect('request.pinHash')
      .where('request.publicToken = :token', { token })
      .leftJoinAndSelect('request.files', 'files')
      .getOne();

    if (!request) {
      throw new NotFoundException('Deposit request not found.');
    }
    if (request.expiresAt < new Date()) {
      throw new GoneException('Deposit request has expired.');
    }

    const matches = await bcrypt.compare(pin, request.pinHash);
    if (!matches) {
      throw new UnauthorizedException('Token or PIN incorrect.');
    }

    const payload = { sub: request.id };
    const depositSessionToken = this.jwtService.sign(payload);
    const expiresIn = 30 * 60;
    const session = this.depositSessionRepository.create({
      request,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    });
    await this.depositSessionRepository.save(session);

    return { depositSessionToken, expiresIn };
  }

  async storeFile(requestId: string, file: UploadedDepositFile) {
    const request = await this.depositRequestRepository.findOne({
      where: { id: requestId },
      relations: {
        files: true,
      },
    });
    if (!request) {
      throw new NotFoundException('Deposit request not found.');
    }
    if (request.expiresAt < new Date()) {
      throw new GoneException('Deposit request has expired.');
    }

    const storageKey = `${requestId}/${randomUUID()}-${file.originalname}`;
    await this.storageService.uploadFile(
      storageKey,
      file.buffer,
      file.mimetype,
    );

    const depositedFile = this.depositedFileRepository.create({
      request,
      storageKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
    const saved = await this.depositedFileRepository.save(depositedFile);

    return {
      id: saved.id,
      originalName: saved.originalName,
      sizeBytes: Number(saved.sizeBytes),
      uploadedAt: saved.uploadedAt,
    };
  }

  async listFiles(requestId: string) {
    const files = await this.depositedFileRepository.find({
      where: { request: { id: requestId } },
      order: { uploadedAt: 'DESC' },
    });
    return files.map((file) => ({
      id: file.id,
      originalName: file.originalName,
      sizeBytes: Number(file.sizeBytes),
      uploadedAt: file.uploadedAt,
    }));
  }

  async findRequestById(requestId: string): Promise<DepositRequest | null> {
    return this.depositRequestRepository.findOne({
      where: { id: requestId },
      relations: {
        files: true,
      },
    });
  }
}
