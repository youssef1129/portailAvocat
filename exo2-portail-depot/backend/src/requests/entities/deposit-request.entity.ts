import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Lawyer } from '../../auth/entities/lawyer.entity';
import { DepositedFile } from './deposited-file.entity';

@Entity({ name: 'deposit_requests' })
export class DepositRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ unique: true })
  publicToken!: string;

  @Column({ select: false })
  pinHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @ManyToOne(() => Lawyer, { onDelete: 'CASCADE' })
  lawyer!: Lawyer;

  @OneToMany(() => DepositedFile, (file) => file.request)
  files!: DepositedFile[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
