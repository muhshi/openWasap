import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { arrayColumnType, dateColumnType } from '../../../common/utils/column-types';
import { User } from './user.entity';

export enum ApiKeyRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  keyHash: string;

  @Column({ type: 'varchar', length: 20 })
  keyPrefix: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ApiKeyRole.USER,
  })
  role: ApiKeyRole;

  @Column({ type: arrayColumnType(), nullable: true })
  allowedIps: string[] | null;

  @Column({ type: arrayColumnType(), nullable: true })
  allowedSessions: string[] | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: dateColumnType(), nullable: true })
  expiresAt: Date | null;

  @Column({ type: dateColumnType(), nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @ManyToOne(() => User, user => user.apiKeys, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
