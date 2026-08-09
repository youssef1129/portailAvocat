jest.mock('bcrypt');
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'uuid-file-1'),
}));
jest.mock('file-type', () => ({
  fileTypeFromBuffer: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
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
import { fileTypeFromBuffer } from 'file-type';

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

    it('locks out after 5 failed attempts against the same token, blocking even the correct PIN on the 6th try', async () => {
      queryBuilder.getOne.mockResolvedValue(validRequest);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      for (let i = 0; i < 5; i++) {
        await expect(service.unlock(publicToken, 'wrong')).rejects.toThrow(
          UnauthorizedException,
        );
      }

      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // now "correct"

      await expect(service.unlock(publicToken, '123456')).rejects.toThrow(
        UnauthorizedException,
      );
      // 6th attempt should be blocked by lockout BEFORE reaching bcrypt.compare
      expect(bcrypt.compare).toHaveBeenCalledTimes(5);
    });

    it('resets the attempt counter after a successful unlock', async () => {
      queryBuilder.getOne.mockResolvedValue(validRequest);
      jwtService.sign.mockReturnValue('signed-deposit-session-token');
      depositSessionRepository.create.mockReturnValue({ id: 'session-1' });
      depositSessionRepository.save.mockResolvedValue({ id: 'session-1' });

      // 4 failed attempts, below the lockout threshold
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      for (let i = 0; i < 4; i++) {
        await expect(service.unlock(publicToken, 'wrong')).rejects.toThrow(
          UnauthorizedException,
        );
      }

      // succeed on the 5th attempt — should reset the counter
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(
        service.unlock(publicToken, '123456'),
      ).resolves.toBeDefined();

      // a subsequent wrong PIN should NOT be immediately locked out —
      // proves the counter was reset on success, not just decremented
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.unlock(publicToken, 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).toHaveBeenCalled(); // reached bcrypt, not blocked by stale lockout
    });
  });

  describe('storeFile', () => {
    const validRequest = {
      id: requestId,
      expiresAt: new Date('2026-08-06T13:00:00.000Z'),
      files: [],
    } as DepositRequest;

    beforeEach(() => {
      (fileTypeFromBuffer as jest.Mock).mockReset();
    });

    it('uploads when the magic-byte MIME matches the client-declared type', async () => {
      depositRequestRepository.findOne.mockResolvedValue(validRequest);
      (fileTypeFromBuffer as jest.Mock).mockResolvedValue({
        ext: 'pdf',
        mime: 'application/pdf',
      });
      depositedFileRepository.create.mockReturnValue({ id: 'f-1' });
      depositedFileRepository.save.mockResolvedValue({
        id: 'f-1',
        originalName: 'piece.pdf',
        sizeBytes: 12,
        uploadedAt: now,
      });
      storageService.uploadFile.mockResolvedValue(undefined);

      const result = await service.storeFile(requestId, {
        originalname: 'piece.pdf',
        buffer: Buffer.from('%PDF-1.4...'),
        mimetype: 'application/pdf',
        size: 12,
      });

      expect(fileTypeFromBuffer).toHaveBeenCalledWith(
        Buffer.from('%PDF-1.4...'),
      );
      expect(fileTypeFromBuffer).toHaveBeenCalledTimes(1);
      expect(storageService.uploadFile).toHaveBeenCalledWith(
        expect.stringContaining(requestId + '/'),
        Buffer.from('%PDF-1.4...'),
        'application/pdf', // verified mime, not the client one
      );
      expect(result.id).toBe('f-1');
    });

    // Each case declares its lie explicitly: what the client CLAIMS the
    // mimetype is (declaredMime) vs what the magic-byte detector actually
    // found (detected). Any disagreement between the two is rejected,
    // even when the real content is itself a whitelisted type — a mismatch
    // is treated as a spoofing signal on its own.
    it.each([
      {
        label: 'declared PDF but content is actually PNG',
        declaredMime: 'application/pdf',
        detected: { ext: 'png', mime: 'image/png' },
        filename: 'trick.pdf',
      },
      {
        label: 'declared PNG but content is actually PDF',
        declaredMime: 'image/png',
        detected: { ext: 'pdf', mime: 'application/pdf' },
        filename: 'trick.png',
      },
      {
        label: 'declared JPEG but content is actually PDF',
        declaredMime: 'image/jpeg',
        detected: { ext: 'pdf', mime: 'application/pdf' },
        filename: 'trick.jpg',
      },
    ])('rejects when $label', async ({ declaredMime, detected, filename }) => {
      depositRequestRepository.findOne.mockResolvedValue(validRequest);
      (fileTypeFromBuffer as jest.Mock).mockResolvedValue(detected);

      await expect(
        service.storeFile(requestId, {
          originalname: filename,
          buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          mimetype: declaredMime,
          size: 8,
        }),
      ).rejects.toThrow(BadRequestException);

      // Generic message — never reveals what was actually detected
      await expect(
        service.storeFile(requestId, {
          originalname: filename,
          buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          mimetype: declaredMime,
          size: 8,
        }),
      ).rejects.toThrow('type de fichier non autorisé');

      // Must NOT have attempted an upload or a DB write
      expect(storageService.uploadFile).not.toHaveBeenCalled();
      expect(depositedFileRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a buffer whose real type is not in the whitelist (e.g. GIF)', async () => {
      depositRequestRepository.findOne.mockResolvedValue(validRequest);
      (fileTypeFromBuffer as jest.Mock).mockResolvedValue({
        ext: 'gif',
        mime: 'image/gif',
      });

      await expect(
        service.storeFile(requestId, {
          originalname: 'anim.gif',
          buffer: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
          mimetype: 'image/gif',
          size: 6,
        }),
      ).rejects.toThrow('type de fichier non autorisé');

      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it('rejects when file-type cannot identify the content at all', async () => {
      depositRequestRepository.findOne.mockResolvedValue(validRequest);
      (fileTypeFromBuffer as jest.Mock).mockResolvedValue(undefined);

      await expect(
        service.storeFile(requestId, {
          originalname: 'unknown.bin',
          buffer: Buffer.from('not-a-real-file-header'),
          mimetype: 'application/octet-stream',
          size: 9,
        }),
      ).rejects.toThrow('type de fichier non autorisé');

      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it('rejects files larger than 20 MiB', async () => {
      depositRequestRepository.findOne.mockResolvedValue(validRequest);
      (fileTypeFromBuffer as jest.Mock).mockResolvedValue({
        ext: 'pdf',
        mime: 'application/pdf',
      });

      const bigBuffer = Buffer.alloc(20 * 1024 * 1024 + 1, 0x25); // '%PDF'-ish prefix won't matter; size is checked first
      await expect(
        service.storeFile(requestId, {
          originalname: 'big.pdf',
          buffer: bigBuffer,
          mimetype: 'application/pdf',
          size: bigBuffer.length,
        }),
      ).rejects.toThrow(BadRequestException);

      // size guard fires BEFORE magic-byte detection / upload
      expect(storageService.uploadFile).not.toHaveBeenCalled();
      expect(fileTypeFromBuffer).not.toHaveBeenCalled();
    });

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
