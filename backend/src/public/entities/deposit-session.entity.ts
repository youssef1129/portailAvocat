import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { DepositRequest } from '../../requests/entities/deposit-request.entity';

@Entity({ name: 'deposit_sessions' })
export class DepositSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => DepositRequest, { onDelete: 'CASCADE' })
  request!: DepositRequest;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
