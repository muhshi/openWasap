import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ConversationStateMode {
  BOT = 'bot',
  ADMIN = 'admin',
}

@Entity('conversation_states')
@Index(['sessionId', 'remoteJid'], { unique: true })
export class ConversationState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  sessionId: string;

  @Column({ type: 'varchar', length: 100 })
  remoteJid: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ConversationStateMode.BOT,
  })
  mode: ConversationStateMode;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
