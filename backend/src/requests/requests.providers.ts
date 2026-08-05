import {
  DATA_SOURCE,
  DEPOSIT_REQUEST_REPOSITORY,
  DEPOSITED_FILE_REPOSITORY,
} from '../common/constants';
import { DataSource } from 'typeorm';
import { DepositRequest } from './entities/deposit-request.entity';
import { DepositedFile } from './entities/deposited-file.entity';

export const requestsProviders = [
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
];
