import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ContactGroup } from './contact-group.entity';
import { ImportedContact } from './imported-contact.entity';
import { jsonColumnType } from '../../../common/utils/column-types';

@Entity('contact_group_members')
export class ContactGroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  groupId: string;

  @Column({ type: 'varchar' })
  contactId: string;

  @Column({ type: jsonColumnType(), nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => ContactGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: ContactGroup;

  @ManyToOne(() => ImportedContact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: ImportedContact;

  @CreateDateColumn()
  createdAt: Date;
}
