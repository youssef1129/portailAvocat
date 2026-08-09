import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { DepositRequest } from './deposit-request.entity';

@Entity({ name: 'deposited_files' })
export class DepositedFile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => DepositRequest, (request) => request.files, {
    onDelete: 'CASCADE',
  })
  request!: DepositRequest;

  @Column()
  storageKey!: string;

  @Column()
  originalName!: string;

  @Column()
  mimeType!: string;

  @Column({ type: 'bigint' })
  sizeBytes!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  uploadedAt!: Date;
}
