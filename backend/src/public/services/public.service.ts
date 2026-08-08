/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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
import { MetricsService } from '../../metrics/metrics.service';

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
  private readonly failedAttempts = new Map<
    string,
    { count: number; firstAttemptAt: number }
  >();
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  constructor(
    @Inject(DEPOSIT_REQUEST_REPOSITORY)
    private readonly depositRequestRepository: Repository<DepositRequest>,
    @Inject(DEPOSITED_FILE_REPOSITORY)
    private readonly depositedFileRepository: Repository<DepositedFile>,
    @Inject(DEPOSIT_SESSION_REPOSITORY)
    private readonly depositSessionRepository: Repository<DepositSession>,
    private readonly jwtService: JwtService,
    private readonly storageService: StorageService,
    private readonly metricsService: MetricsService,
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

  private isLockedOut(token: string): boolean {
    const entry = this.failedAttempts.get(token);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.firstAttemptAt > this.LOCKOUT_WINDOW_MS) {
      // Window expired, reset
      this.failedAttempts.delete(token);
      return false;
    }

    return entry.count >= this.MAX_ATTEMPTS;
  }

  private recordFailedAttempt(token: string): void {
    const now = Date.now();
    const entry = this.failedAttempts.get(token);

    if (!entry || now - entry.firstAttemptAt > this.LOCKOUT_WINDOW_MS) {
      this.failedAttempts.set(token, { count: 1, firstAttemptAt: now });
    } else {
      entry.count += 1;
    }
  }

  private resetAttempts(token: string): void {
    this.failedAttempts.delete(token);
  }

  async unlock(token: string, pin: string) {
    const request = await this.depositRequestRepository
      .createQueryBuilder('request')
      .addSelect('request.pinHash')
      .where('request.publicToken = :token', { token })
      .leftJoinAndSelect('request.files', 'files')
      .getOne();

    if (!request) {
      // Unknown token: do NOT count — this just indicates someone scanning
      // random UUIDs, not an attack on a real deposit link.
      throw new NotFoundException('Token or PIN incorrect.');
    }
    if (request.expiresAt < new Date()) {
      // Expired: do NOT count — the link is dead, no brute-force signal here.
      throw new GoneException('Deposit request has expired.');
    }

    if (this.isLockedOut(token)) {
      this.metricsService.pinVerificationFailures.inc();
      throw new UnauthorizedException('Token or PIN incorrect.');
    }

    const matches = await bcrypt.compare(pin, request.pinHash);
    if (!matches) {
      // Genuine wrong-PIN against a valid, non-expired request: this is the
      // brute-force signal the HighPinFailureRate alert watches for.
      this.recordFailedAttempt(token);
      this.metricsService.pinVerificationFailures.inc();
      throw new UnauthorizedException('Token or PIN incorrect.');
    }

    this.resetAttempts(token);

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
