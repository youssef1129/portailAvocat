jest.mock('bcrypt');
jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
  randomInt: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomInt } from 'crypto';
import { RequestsService, computeStatus } from './requests.service';
import { DepositRequest } from './entities/deposit-request.entity';
import { DepositRequestStatus } from './enums/deposit-request-status.enum';
import { StorageService } from '../storage/storage.service';
import {
  DEPOSIT_REQUEST_REPOSITORY,
  DEPOSITED_FILE_REPOSITORY,
} from '../common/constants';

describe('computeStatus', () => {
  const now = new Date('2026-08-06T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns EXPIRED when expired and has no files', () => {
    expect(
      computeStatus({
        expiresAt: new Date('2026-08-06T11:59:59.000Z'),
        files: [],
      }),
    ).toBe(DepositRequestStatus.EXPIRED);
  });

  it('returns EXPIRED when expired even if files are present (expiration beats complete)', () => {
    expect(
      computeStatus({
        expiresAt: new Date('2026-08-06T11:59:59.000Z'),
        files: [{ id: 'file-1' }],
      }),
    ).toBe(DepositRequestStatus.EXPIRED);
  });

  it('returns PENDING when not expired and has no files', () => {
    expect(
      computeStatus({
        expiresAt: new Date('2026-08-06T12:00:01.000Z'),
        files: [],
      }),
    ).toBe(DepositRequestStatus.PENDING);
  });

  it('returns COMPLETE when not expired and has files', () => {
    expect(
      computeStatus({
        expiresAt: new Date('2026-08-06T12:00:01.000Z'),
        files: [{ id: 'file-1' }],
      }),
    ).toBe(DepositRequestStatus.COMPLETE);
  });

  it('treats expiresAt === now as not expired (strict < comparison)', () => {
    expect(
      computeStatus({
        expiresAt: now,
        files: [],
      }),
    ).toBe(DepositRequestStatus.PENDING);
  });
});

describe('RequestsService', () => {
  let service: RequestsService;
  let depositRequestRepository: jest.Mocked<
    Pick<Repository<DepositRequest>, 'create' | 'save' | 'find' | 'findOne'>
  >;
  let storageService: { getPresignedDownloadUrl: jest.Mock };

  const lawyerId = 'lawyer-1';
  const otherLawyerId = 'lawyer-2';
  const now = new Date('2026-08-06T12:00:00.000Z');

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    depositRequestRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    storageService = {
      getPresignedDownloadUrl: jest.fn(),
    };

    (randomBytes as jest.Mock).mockReturnValue({
      toString: () => 'abcdef1234abcdef1234',
    });
    (randomInt as jest.Mock).mockReturnValue(123456);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pin');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        {
          provide: DEPOSIT_REQUEST_REPOSITORY,
          useValue: depositRequestRepository,
        },
        {
          provide: DEPOSITED_FILE_REPOSITORY,
          useValue: {},
        },
        {
          provide: StorageService,
          useValue: storageService,
        },
      ],
    }).compile();

    service = module.get(RequestsService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('hashes the PIN with bcrypt before save and never stores plaintext', async () => {
      const entity = {
        title: 'Dossier X',
        expiresAt: new Date('2026-08-07T12:00:00.000Z'),
        publicToken: 'abcdef1234abcdef1234',
        pinHash: 'hashed-pin',
        lawyer: { id: lawyerId },
      };
      const saved = {
        ...entity,
        id: 'req-1',
        createdAt: now,
        files: [],
      };

      depositRequestRepository.create.mockReturnValue(entity as DepositRequest);
      depositRequestRepository.save.mockResolvedValue(saved as DepositRequest);

      await service.create(
        { title: 'Dossier X', expiresAt: '2026-08-07T12:00:00.000Z' },
        lawyerId,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
      expect(depositRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pinHash: 'hashed-pin',
        }),
      );
      const createArg = depositRequestRepository.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(createArg).not.toHaveProperty('pin');
      expect(createArg.pinHash).not.toBe('123456');
    });

    it('returns plaintext PIN once in the create response DTO', async () => {
      const saved = {
        id: 'req-1',
        title: 'Dossier X',
        expiresAt: new Date('2026-08-07T12:00:00.000Z'),
        publicToken: 'abcdef1234abcdef1234',
        pinHash: 'hashed-pin',
        createdAt: now,
        files: [],
        lawyer: { id: lawyerId },
      };

      depositRequestRepository.create.mockReturnValue(saved as DepositRequest);
      depositRequestRepository.save.mockResolvedValue(saved as DepositRequest);

      const result = await service.create(
        { title: 'Dossier X', expiresAt: '2026-08-07T12:00:00.000Z' },
        lawyerId,
      );

      expect(result.pin).toBe('123456');
      expect(result).not.toHaveProperty('pinHash');
    });
  });

  describe('findAllForLawyer', () => {
    it('never includes pin or pinHash in responses', async () => {
      depositRequestRepository.find.mockResolvedValue([
        {
          id: 'req-1',
          title: 'Dossier X',
          publicToken: 'token-1',
          pinHash: 'secret-hash',
          expiresAt: new Date('2026-08-07T12:00:00.000Z'),
          createdAt: now,
          files: [],
          lawyer: { id: lawyerId },
        } as DepositRequest,
      ]);

      const results = await service.findAllForLawyer(lawyerId);

      expect(results).toHaveLength(1);
      expect(results[0].pin).toBeUndefined();
      expect(results[0].pinHash).toBeUndefined();
      expect(results[0]).not.toHaveProperty('pin');
      expect(results[0]).not.toHaveProperty('pinHash');
    });
  });

  describe('findOneForLawyer', () => {
    it('never includes pin or pinHash in responses', async () => {
      depositRequestRepository.findOne.mockResolvedValue({
        id: 'req-1',
        title: 'Dossier X',
        publicToken: 'token-1',
        pinHash: 'secret-hash',
        expiresAt: new Date('2026-08-07T12:00:00.000Z'),
        createdAt: now,
        files: [],
        lawyer: { id: lawyerId },
      } as DepositRequest);

      const result = await service.findOneForLawyer('req-1', lawyerId);

      expect((result as { pin?: string }).pin).toBeUndefined();
      expect((result as { pinHash?: string }).pinHash).toBeUndefined();
      expect(result).not.toHaveProperty('pin');
      expect(result).not.toHaveProperty('pinHash');
    });

    it('throws NotFoundException if request belongs to a different lawyer without leaking ownership', async () => {
      depositRequestRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOneForLawyer('req-1', otherLawyerId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.findOneForLawyer('req-1', otherLawyerId),
      ).rejects.toThrow('Deposit request not found.');

      expect(depositRequestRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'req-1', lawyer: { id: otherLawyerId } },
        relations: { files: true },
      });
    });
  });
});
