import type { InjectionToken } from '@nestjs/common';

export const DATA_SOURCE: InjectionToken = 'DATA_SOURCE';
export const LAWYER_REPOSITORY: InjectionToken = 'LAWYER_REPOSITORY';
export const DEPOSIT_REQUEST_REPOSITORY: InjectionToken =
  'DEPOSIT_REQUEST_REPOSITORY';
export const DEPOSITED_FILE_REPOSITORY: InjectionToken =
  'DEPOSITED_FILE_REPOSITORY';
export const DEPOSIT_SESSION_REPOSITORY: InjectionToken =
  'DEPOSIT_SESSION_REPOSITORY';
