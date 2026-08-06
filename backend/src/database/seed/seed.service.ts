import { Inject, Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomInt } from 'crypto';
import { fakerFR as faker } from '@faker-js/faker';
import {
  DEPOSIT_REQUEST_REPOSITORY,
  DEPOSITED_FILE_REPOSITORY,
  LAWYER_REPOSITORY,
} from 'src/common/constants';
import { DepositRequest } from 'src/requests/entities/deposit-request.entity';
import { DepositedFile } from 'src/requests/entities/deposited-file.entity';
import { Lawyer } from 'src/auth/entities/lawyer.entity';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @Inject(LAWYER_REPOSITORY)
    private readonly lawyerRepository: Repository<Lawyer>,
    @Inject(DEPOSIT_REQUEST_REPOSITORY)
    private readonly depositRequestRepository: Repository<DepositRequest>,
    @Inject(DEPOSITED_FILE_REPOSITORY)
    private readonly depositedFileRepository: Repository<DepositedFile>,
  ) {}

  private async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  private createPublicToken(): string {
    return randomBytes(12).toString('hex');
  }

  private createPin(): string {
    return randomInt(100000, 999999).toString();
  }

  private fakeTitle() {
    return `${faker.word.adjective()} ${faker.word.noun()} ${faker.word.noun()}`;
  }

  private fakeFileName() {
    return faker.system.fileName();
  }

  async seed() {
    this.logger.log('Starting seeding...');

    await this.depositedFileRepository.delete({});
    await this.depositRequestRepository.delete({});
    await this.lawyerRepository.delete({});

    const lawyers: Lawyer[] = [];
    const lawyerData = [
      {
        email: 'avocat1@example.com',
        password: 'Test1234!',
        name: faker.person.fullName(),
      },
      {
        email: 'avocat2@example.com',
        password: 'Test1234!',
        name: faker.person.fullName(),
      },
    ];

    for (const data of lawyerData) {
      const lawyer = this.lawyerRepository.create({
        email: data.email,
        password: await this.hashPassword(data.password),
        name: data.name,
      });
      lawyers.push(await this.lawyerRepository.save(lawyer));
    }

    for (const lawyer of lawyers) {
      const requests = [
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
        const request = this.depositRequestRepository.create({
          title: requestData.title,
          publicToken: this.createPublicToken(),
          pinHash: await bcrypt.hash(pin, 10),
          expiresAt: requestData.expiresAt,
          lawyer: lawyer,
        });

        const savedRequest = await this.depositRequestRepository.save(request);
        this.logger.log(
          `Created request ${savedRequest.title} for ${lawyer.email}`,
        );

        if (requestData.files.length > 0) {
          const files = requestData.files.map((file) =>
            this.depositedFileRepository.create({
              request: savedRequest,
              storageKey: `seed/${savedRequest.id}/${faker.string.uuid()}`,
              originalName: file.originalName,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
            }),
          );
          await this.depositedFileRepository.save(files);
          this.logger.log(
            `  Added ${files.length} deposited file(s) to request ${savedRequest.title}`,
          );
        }
      }
    }

    this.logger.log('Seeding completed successfully!');
  }
}
