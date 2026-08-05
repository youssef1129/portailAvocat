import { DATA_SOURCE, LAWYER_REPOSITORY } from 'src/common/constants';
import { DataSource } from 'typeorm';
import { Lawyer } from './entities/lawyer.entity';

export const lawyerProviders = [
  {
    provide: LAWYER_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Lawyer),
    inject: [DATA_SOURCE],
  },
];
