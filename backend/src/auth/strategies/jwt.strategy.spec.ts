import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from '../auth.service';

const DEPOSIT_SESSION_SECRET = 'deposit-session-secret-for-tests';
const JWT_SECRET = 'lawyer-jwt-secret-for-tests';

function authenticateWithBearer(
  strategy: JwtStrategy,
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

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: { validateLawyerById: jest.Mock };

  const lawyer = {
    id: 'lawyer-1',
    email: 'avocat@example.com',
    name: 'Me Dupont',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    authService = {
      validateLawyerById: jest.fn().mockResolvedValue(lawyer),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'JWT_SECRET') {
                return JWT_SECRET;
              }
              return undefined;
            },
          },
        },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
  });

  describe('token secret isolation', () => {
    it('accepts a token signed with JWT_SECRET', async () => {
      const token = jwt.sign(
        { sub: lawyer.id, email: lawyer.email },
        JWT_SECRET,
        { expiresIn: '1d' },
      );

      const result = await authenticateWithBearer(strategy, token);

      expect(result.failed).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.user).toEqual({
        id: lawyer.id,
        email: lawyer.email,
        name: lawyer.name,
        createdAt: lawyer.createdAt,
      });
      expect(authService.validateLawyerById).toHaveBeenCalledWith(lawyer.id);
    });

    it('rejects a token signed with DEPOSIT_SESSION_SECRET', async () => {
      const token = jwt.sign({ sub: 'req-1' }, DEPOSIT_SESSION_SECRET, {
        expiresIn: '30m',
      });

      const result = await authenticateWithBearer(strategy, token);

      expect(result.user).toBeUndefined();
      expect(result.failed === true || result.error != null).toBe(true);
      expect(authService.validateLawyerById).not.toHaveBeenCalled();
    });
  });
});
