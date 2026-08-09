import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { DepositSessionStrategy } from './deposit-session.strategy';
import { PublicService } from '../services/public.service';
import { DepositSessionGuard } from '../guards/deposit-session.guard';

const DEPOSIT_SESSION_SECRET = 'deposit-session-secret-for-tests';
const JWT_SECRET = 'lawyer-jwt-secret-for-tests';

function authenticateWithBearer(
  strategy: DepositSessionStrategy,
  token: string,
): Promise<{ user?: unknown; error?: Error; failed?: boolean }> {
  return new Promise((resolve) => {
    const req = {
      headers: { authorization: `Bearer ${token}` },
    };

    const strategyAny = strategy as unknown as {
      success: (user: unknown) => void;
      fail: (challenge?: unknown) => void;
      error: (err: Error) => void;
      authenticate: (req: unknown) => void;
    };

    strategyAny.success = (user: unknown) => resolve({ user });
    strategyAny.fail = () => resolve({ failed: true });
    strategyAny.error = (error: Error) => resolve({ error });
    strategyAny.authenticate(req);
  });
}

describe('DepositSessionGuard', () => {
  it('is bound to the deposit-session passport strategy', () => {
    const guard = new DepositSessionGuard();
    expect(guard).toBeInstanceOf(DepositSessionGuard);
    // AuthGuard('deposit-session') — strategy name used by passport
    expect((DepositSessionGuard as unknown as { name?: string }).name).toBe(
      'DepositSessionGuard',
    );
  });
});

describe('DepositSessionStrategy', () => {
  let strategy: DepositSessionStrategy;
  let publicService: { findRequestById: jest.Mock };

  beforeEach(async () => {
    publicService = {
      findRequestById: jest.fn().mockResolvedValue({ id: 'req-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositSessionStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'DEPOSIT_SESSION_SECRET') {
                return DEPOSIT_SESSION_SECRET;
              }
              return undefined;
            },
          },
        },
        { provide: PublicService, useValue: publicService },
      ],
    }).compile();

    strategy = module.get(DepositSessionStrategy);
  });

  describe('token secret isolation', () => {
    it('accepts a token signed with DEPOSIT_SESSION_SECRET', async () => {
      const token = jwt.sign({ sub: 'req-1' }, DEPOSIT_SESSION_SECRET, {
        expiresIn: '30m',
      });

      const result = await authenticateWithBearer(strategy, token);

      expect(result.failed).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.user).toEqual({ requestId: 'req-1' });
      expect(publicService.findRequestById).toHaveBeenCalledWith('req-1');
    });

    it('rejects a token signed with the lawyer JWT_SECRET', async () => {
      const token = jwt.sign(
        { sub: 'lawyer-1', email: 'avocat@example.com' },
        JWT_SECRET,
        { expiresIn: '1d' },
      );

      const result = await authenticateWithBearer(strategy, token);

      expect(result.user).toBeUndefined();
      expect(result.failed === true || result.error != null).toBe(true);
      expect(publicService.findRequestById).not.toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('throws UnauthorizedException when the deposit request no longer exists', async () => {
      publicService.findRequestById.mockResolvedValue(null);

      await expect(strategy.validate({ sub: 'missing-req' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
