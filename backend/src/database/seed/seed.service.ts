import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomInt } from 'crypto';
import { fakerFR as faker } from '@faker-js/faker';
import { DATA_SOURCE } from 'src/common/constants';
import { DepositRequest } from 'src/requests/entities/deposit-request.entity';
import { DepositedFile } from 'src/requests/entities/deposited-file.entity';
import { Lawyer } from 'src/auth/entities/lawyer.entity';
import { SEED_DEMO_LAWYERS, SEED_DEMO_PASSWORD } from './seed.constants';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @Inject(DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  private async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  private createPublicToken(): string {
    return randomBytes(12).toString('hex');
  }

  private createPin(): string {
    return randomInt(1000, 1000000).toString();
  }

  private fakeTitle() {
    return `${faker.word.adjective()} ${faker.word.noun()} ${faker.word.noun()}`;
  }

  private fakeFileName() {
    return faker.system.fileName();
  }

  private async resetTables(queryRunner: QueryRunner) {
    // Table names must match @Entity({ name }) — lawyers, not lawyer.
    // deposit_sessions must be included (FK to deposit_requests).
    await queryRunner.query(
      'TRUNCATE TABLE "deposit_sessions", "deposited_files", "deposit_requests", "lawyers" RESTART IDENTITY CASCADE',
    );
  }

  async seed() {
    this.logger.log('Starting seeding...');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const lawyerRepository = queryRunner.manager.getRepository(Lawyer);
    const depositRequestRepository =
      queryRunner.manager.getRepository(DepositRequest);
    const depositedFileRepository =
      queryRunner.manager.getRepository(DepositedFile);

    try {
      await this.resetTables(queryRunner);

      const lawyers: Lawyer[] = [];
      const lawyerData = SEED_DEMO_LAWYERS.map((entry) => ({
        ...entry,
        name: faker.person.fullName(),
      }));

      for (const data of lawyerData) {
        const lawyer = lawyerRepository.create({
          email: data.email,
          password: await this.hashPassword(data.password),
          name: data.name,
        });
        lawyers.push(await lawyerRepository.save(lawyer));
      }

      const demoLinks: {
        lawyerEmail: string;
        title: string;
        publicToken: string;
        pin: string;
      }[] = [];

      for (const lawyer of lawyers) {
        const requests: {
          title: string;
          expiresAt: Date;
          files: {
            originalName: string;
            mimeType: string;
            sizeBytes: number;
          }[];
        }[] = [
          {
            title: this.fakeTitle(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            files: [],
          },
          {
            title: this.fakeTitle(),
            expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            files: [
              {
                originalName: this.fakeFileName(),
                mimeType: 'application/pdf',
                sizeBytes: faker.number.int({ min: 1024, max: 5000000 }),
              },
            ],
          },
        ];

        for (const requestData of requests) {
          const pin = this.createPin();
          const publicToken = this.createPublicToken();

          const request = depositRequestRepository.create({
            title: requestData.title,
            publicToken,
            pinHash: await bcrypt.hash(pin, 10),
            expiresAt: requestData.expiresAt,
            lawyer,
          });

          const savedRequest = await depositRequestRepository.save(request);
          this.logger.log(
            `Created request ${savedRequest.title} for ${lawyer.email}`,
          );

          demoLinks.push({
            lawyerEmail: lawyer.email,
            title: savedRequest.title,
            publicToken,
            pin,
          });

          if (requestData.files.length > 0) {
            const files = requestData.files.map((file) =>
              depositedFileRepository.create({
                request: savedRequest,
                storageKey: `seed/${savedRequest.id}/${faker.string.uuid()}`,
                originalName: file.originalName,
                mimeType: file.mimeType,
                sizeBytes: file.sizeBytes,
              }),
            );
            await depositedFileRepository.save(files);
            this.logger.log(
              `  Added ${files.length} deposited file(s) to request ${savedRequest.title}`,
            );
          }
        }
      }

      await queryRunner.commitTransaction();

      this.logger.log('Seeding completed successfully!');
      this.logger.log('--- Demo credentials ---');
      lawyerData.forEach((l) =>
        this.logger.log(`Lawyer login: ${l.email} / ${SEED_DEMO_PASSWORD}`),
      );
      this.logger.log('--- Demo public deposit links ---');
      demoLinks.forEach((l) =>
        this.logger.log(
          `[${l.lawyerEmail}] "${l.title}" -> token=${l.publicToken} pin=${l.pin}`,
        ),
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Seeding failed, rolled back.', err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
