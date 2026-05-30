import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('knowledges')
export class Knowledge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Postgres pgvector support. 
  // We define it as string for TypeORM, but the database will treat it as a vector.
  // When inserting/selecting we'll use Raw queries if necessary, but TypeORM can handle it with simple raw casts.
  @Column({ type: 'text', nullable: true })
  embedding: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
