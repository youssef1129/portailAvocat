import {
  DATA_SOURCE,
  DEPOSIT_REQUEST_REPOSITORY,
  DEPOSITED_FILE_REPOSITORY,
  DEPOSIT_SESSION_REPOSITORY,
} from '../common/constants';
import { DataSource } from 'typeorm';
import { DepositRequest } from '../requests/entities/deposit-request.entity';
import { DepositedFile } from '../requests/entities/deposited-file.entity';
import { DepositSession } from './entities/deposit-session.entity';

export const publicProviders = [
  {
    provide: DEPOSIT_REQUEST_REPOSITORY,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(DepositRequest),
    inject: [DATA_SOURCE],
  },
  {
    provide: DEPOSITED_FILE_REPOSITORY,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(DepositedFile),
    inject: [DATA_SOURCE],
  },
  {
    provide: DEPOSIT_SESSION_REPOSITORY,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(DepositSession),
    inject: [DATA_SOURCE],
  },
];
