jest.mock('bcrypt');
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'uuid-file-1'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  GoneException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PublicService } from './public.service';
import { DepositRequest } from '../../requests/entities/deposit-request.entity';
import { DepositedFile } from '../../requests/entities/deposited-file.entity';
import { StorageService } from '../../storage/storage.service';
import {
  DEPOSIT_REQUEST_REPOSITORY,
  DEPOSITED_FILE_REPOSITORY,
  DEPOSIT_SESSION_REPOSITORY,
} from '../../common/constants';
import { MetricsService } from '../../metrics/metrics.service';

describe('PublicService', () => {
  let service: PublicService;
  let depositRequestRepository: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
  };
  let depositedFileRepository: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let depositSessionRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };
  let storageService: { uploadFile: jest.Mock };
  let queryBuilder: {
    addSelect: jest.Mock;
    where: jest.Mock;
    leftJoinAndSelect: jest.Mock;
    getOne: jest.Mock;
  };

  const now = new Date('2026-08-06T12:00:00.000Z');
  const requestId = 'req-1';
  const publicToken = 'public-token-abc';
  const pinHash = 'hashed-pin';

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    depositRequestRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
    };
    depositedFileRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    depositSessionRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };
    jwtService = { sign: jest.fn() };
    storageService = { uploadFile: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        {
          provide: DEPOSIT_REQUEST_REPOSITORY,
          useValue: depositRequestRepository,
        },
        {
          provide: DEPOSITED_FILE_REPOSITORY,
          useValue: depositedFileRepository,
        },
        {
          provide: DEPOSIT_SESSION_REPOSITORY,
          useValue: depositSessionRepository,
        },
        { provide: JwtService, useValue: jwtService },
        { provide: StorageService, useValue: storageService },
        {
          provide: MetricsService,
          useValue: {
            pinVerificationFailures: { inc: jest.fn() },
            storageUploadSuccesses: { inc: jest.fn() },
            storageUploadFailures: { inc: jest.fn() },
            httpRequests: { inc: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get(PublicService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('unlock', () => {
    const validRequest = {
      id: requestId,
      publicToken,
      pinHash,
      expiresAt: new Date('2026-08-06T13:00:00.000Z'),
      files: [],
    } as DepositRequest;

    it('signs a depositSessionToken via JwtService when token and PIN are correct', async () => {
      queryBuilder.getOne.mockResolvedValue(validRequest);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('signed-deposit-session-token');
      depositSessionRepository.create.mockReturnValue({ id: 'session-1' });
      depositSessionRepository.save.mockResolvedValue({ id: 'session-1' });

      const result = await service.unlock(publicToken, '123456');

      expect(bcrypt.compare).toHaveBeenCalledWith('123456', pinHash);
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: requestId });
      expect(result).toEqual({
        depositSessionToken: 'signed-deposit-session-token',
        expiresIn: 30 * 60,
      });
    });

    it('throws NotFoundException for an unknown token', async () => {
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(service.unlock('unknown-token', '123456')).rejects.toThrow(
        NotFoundException,
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('throws GoneException for an expired request and does not call bcrypt.compare', async () => {
      queryBuilder.getOne.mockResolvedValue({
        ...validRequest,
        expiresAt: new Date('2026-08-06T11:59:59.000Z'),
      });

      await expect(service.unlock(publicToken, '123456')).rejects.toThrow(
        GoneException,
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException for a wrong PIN with the same generic message as unknown token', async () => {
      queryBuilder.getOne.mockResolvedValueOnce(null);
      let unknownMessage: string | undefined;
      try {
        await service.unlock('unknown-token', '123456');
      } catch (error) {
        unknownMessage = (error as Error).message;
      }

      queryBuilder.getOne.mockResolvedValueOnce(validRequest);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      let wrongPinError: unknown;
      try {
        await service.unlock(publicToken, '000000');
      } catch (error) {
        wrongPinError = error;
      }

      expect(wrongPinError).toBeInstanceOf(UnauthorizedException);
      expect((wrongPinError as Error).message).toBe(unknownMessage);
    });
  });

  describe('storeFile', () => {
    it('re-checks expiration at upload time and throws when expiresAt has passed mid-session', async () => {
      const expiresAt = new Date('2026-08-06T12:30:00.000Z');
      depositRequestRepository.findOne.mockResolvedValue({
        id: requestId,
        expiresAt,
        files: [],
      } as DepositRequest);

      jest.setSystemTime(new Date('2026-08-06T12:31:00.000Z'));

      await expect(
        service.storeFile(requestId, {
          originalname: 'piece.pdf',
          buffer: Buffer.from('pdf'),
          mimetype: 'application/pdf',
          size: 3,
        }),
      ).rejects.toThrow(GoneException);

      expect(storageService.uploadFile).not.toHaveBeenCalled();
      expect(depositedFileRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('listFiles', () => {
    it("only returns files for the requestId in the session, never another request's files", async () => {
      const ownFiles = [
        {
          id: 'file-1',
          originalName: 'a.pdf',
          sizeBytes: 10,
          uploadedAt: now,
        },
      ] as DepositedFile[];

      depositedFileRepository.find.mockResolvedValue(ownFiles);

      const result = await service.listFiles(requestId);

      expect(depositedFileRepository.find).toHaveBeenCalledWith({
        where: { request: { id: requestId } },
        order: { uploadedAt: 'DESC' },
      });
      expect(depositedFileRepository.find).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: { request: { id: 'other-request' } },
        }),
      );
      expect(result).toEqual([
        {
          id: 'file-1',
          originalName: 'a.pdf',
          sizeBytes: 10,
          uploadedAt: now,
        },
      ]);
      expect(result.every((f) => f.id === 'file-1')).toBe(true);
    });
  });
});
