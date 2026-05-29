import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ContactGroup } from './contact-group.entity';
import { ImportedContact } from './imported-contact.entity';

@Entity('contact_group_members')
export class ContactGroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  groupId: string;

  @Column({ type: 'varchar' })
  contactId: string;

  @ManyToOne(() => ContactGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: ContactGroup;

  @ManyToOne(() => ImportedContact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: ImportedContact;

  @CreateDateColumn()
  createdAt: Date;
}
