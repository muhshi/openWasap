import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ContactGroup } from './entities/contact-group.entity';
import { ContactGroupMember } from './entities/contact-group-member.entity';
import { ImportedContact } from './entities/imported-contact.entity';
import { ApiKey, ApiKeyRole } from '../auth/entities/api-key.entity';
import { v4 as uuidv4 } from 'uuid';

export interface ContactWithMetadata {
  name: string;
  phoneNumber: string;
  metadata?: Record<string, any>;
}

export interface BpsImportPayload {
  groupName: string;
  contacts: ContactWithMetadata[];
}

export interface BulkAddPayload {
  groupId: string;
  contacts: ContactWithMetadata[];
}
export interface ContactGroupWithCount extends ContactGroup {
  memberCount: number;
}

export interface ContactGroupDetail extends ContactGroup {
  members: Array<{
    id: string;
    contactId: string;
    name: string;
    phone: string;
    createdAt: Date;
  }>;
}

@Injectable()
export class ContactGroupService {
  constructor(
    @InjectRepository(ContactGroup, 'data')
    private readonly groupRepository: Repository<ContactGroup>,

    @InjectRepository(ContactGroupMember, 'data')
    private readonly memberRepository: Repository<ContactGroupMember>,

    @InjectRepository(ImportedContact, 'data')
    private readonly contactRepository: Repository<ImportedContact>,
  ) {}

  // ── List all groups with member count ──
  async findAll(apiKey?: ApiKey): Promise<ContactGroupWithCount[]> {
    const where: any = {};
    if (apiKey && apiKey.role !== ApiKeyRole.ADMIN) {
      where.ownerApiKeyId = apiKey.id;
    }
    const groups = await this.groupRepository.find({ where, order: { name: 'ASC' } });

    const withCounts: ContactGroupWithCount[] = await Promise.all(
      groups.map(async (group) => {
        const memberCount = await this.memberRepository.count({
          where: { groupId: group.id },
        });
        return { ...group, memberCount };
      }),
    );

    return withCounts;
  }

  // ── Get one group with all member details ──
  async findOne(id: string, apiKey?: ApiKey): Promise<ContactGroupDetail> {
    const group = await this.groupRepository.findOne({ where: { id } });
    if (!group) throw new NotFoundException(`Contact group ${id} not found`);
    if (apiKey && apiKey.role !== ApiKeyRole.ADMIN && group.ownerApiKeyId !== apiKey.id) {
      throw new UnauthorizedException('You do not have access to this contact group');
    }

    const members = await this.memberRepository.find({
      where: { groupId: id },
      relations: ['contact'],
      order: { createdAt: 'ASC' },
    });

    return {
      ...group,
      members: members.map((m) => ({
        id: m.id,
        contactId: m.contactId,
        name: m.contact?.name ?? '',
        phone: m.contact?.phone ?? '',
        createdAt: m.createdAt,
      })),
    };
  }

  // ── Create a new group ──
  async create(name: string, description?: string, apiKey?: ApiKey): Promise<ContactGroup> {
    const group = this.groupRepository.create({
      name,
      description,
      ownerApiKeyId: apiKey ? apiKey.id : null,
    });
    return this.groupRepository.save(group);
  }

  // ── Update group name / description ──
  async update(id: string, name?: string, description?: string, apiKey?: ApiKey): Promise<ContactGroup> {
    const group = await this.groupRepository.findOne({ where: { id } });
    if (!group) throw new NotFoundException(`Contact group ${id} not found`);
    if (apiKey && apiKey.role !== ApiKeyRole.ADMIN && group.ownerApiKeyId !== apiKey.id) {
      throw new UnauthorizedException('You do not have access to this contact group');
    }

    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description;

    return this.groupRepository.save(group);
  }

  // ── Delete a group (members rows deleted via CASCADE) ──
  async delete(id: string, apiKey?: ApiKey): Promise<void> {
    const group = await this.groupRepository.findOne({ where: { id } });
    if (!group) throw new NotFoundException(`Contact group ${id} not found`);
    if (apiKey && apiKey.role !== ApiKeyRole.ADMIN && group.ownerApiKeyId !== apiKey.id) {
      throw new UnauthorizedException('You do not have access to this contact group');
    }
    await this.groupRepository.remove(group);
  }

  // ── Add contacts to a group ──
  async addMembers(groupId: string, contactIds: string[], apiKey?: ApiKey): Promise<{ added: number; skipped: number }> {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException(`Contact group ${groupId} not found`);
    if (apiKey && apiKey.role !== ApiKeyRole.ADMIN && group.ownerApiKeyId !== apiKey.id) {
      throw new UnauthorizedException('You do not have access to this contact group');
    }

    let added = 0;
    let skipped = 0;

    for (const contactId of contactIds) {
      const existing = await this.memberRepository.findOne({
        where: { groupId, contactId },
      });
      if (existing) {
        skipped++;
        continue;
      }
      const contactWhere: any = { id: contactId };
      if (apiKey && apiKey.role !== ApiKeyRole.ADMIN) {
        contactWhere.ownerApiKeyId = apiKey.id;
      }
      const contact = await this.contactRepository.findOne({ where: contactWhere });
      if (!contact) {
        skipped++;
        continue;
      }
      const member = this.memberRepository.create({ groupId, contactId });
      await this.memberRepository.save(member);
      added++;
    }

    return { added, skipped };
  }

  // ── Remove a member from a group ──
  async removeMember(groupId: string, memberId: string, apiKey?: ApiKey): Promise<void> {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException(`Contact group ${groupId} not found`);
    if (apiKey && apiKey.role !== ApiKeyRole.ADMIN && group.ownerApiKeyId !== apiKey.id) {
      throw new UnauthorizedException('You do not have access to this contact group');
    }

    const member = await this.memberRepository.findOne({
      where: { id: memberId, groupId },
    });
    if (!member) throw new NotFoundException(`Member ${memberId} not found in group ${groupId}`);
    await this.memberRepository.remove(member);
  }

  // ── Get phone numbers of all members (for blast WA) ──
  async getMemberPhones(groupId: string, memberIds?: string[], apiKey?: ApiKey): Promise<Array<{ id: string; name: string; phone: string }>> {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException(`Contact group ${groupId} not found`);
    if (apiKey && apiKey.role !== ApiKeyRole.ADMIN && group.ownerApiKeyId !== apiKey.id) {
      throw new UnauthorizedException('You do not have access to this contact group');
    }

    let members = await this.memberRepository.find({
      where: { groupId },
      relations: ['contact'],
    });

    if (memberIds && memberIds.length > 0) {
      members = members.filter((m) => memberIds.includes(m.id));
    }

    return members
      .filter((m) => m.contact?.phone)
      .map((m) => ({ id: m.id, name: m.contact.name, phone: m.contact.phone }));
  }

  // ── Auto-import BPS Flow ──
  async processBpsImport(payload: BpsImportPayload, ownerApiKeyId: string): Promise<ContactGroup> {
    const newGroup = this.groupRepository.create({
      name: payload.groupName,
      description: 'Diimpor otomatis dari Excel BPS',
      ownerApiKeyId,
    });
    const savedGroup = await this.groupRepository.save(newGroup);

    await this.bulkAddFromExcel({
      groupId: savedGroup.id,
      contacts: payload.contacts
    }, ownerApiKeyId);

    return savedGroup;
  }

  // ── Optimized Bulk Insert for Contacts & Members ──
  async bulkAddFromExcel(payload: BulkAddPayload, ownerApiKeyId: string): Promise<void> {
    const { groupId, contacts } = payload;
    const CHUNK_SIZE = 1000;

    const phoneNumbers = [...new Set(contacts.map(c => c.phoneNumber))];

    const existingContacts = await this.contactRepository.find({
      where: { phone: In(phoneNumbers), ownerApiKeyId },
      select: ['id', 'phone'],
    });

    const existingPhonesMap = new Map(existingContacts.map(c => [c.phone, c.id]));
    
    const newContactsToInsert = [];
    const contactMapForGroup = new Map<string, { contactId: string; metadata: any }>();

    for (const rawContact of contacts) {
      let contactId = existingPhonesMap.get(rawContact.phoneNumber);

      if (!contactId) {
        contactId = uuidv4();
        newContactsToInsert.push({
          id: contactId,
          name: rawContact.name,
          phone: rawContact.phoneNumber, // ImportedContact entity uses 'phone', not 'phoneNumber'
          ownerApiKeyId,
        });
        existingPhonesMap.set(rawContact.phoneNumber, contactId);
      }

      contactMapForGroup.set(rawContact.phoneNumber, {
        contactId,
        metadata: rawContact.metadata || null,
      });
    }

    if (newContactsToInsert.length > 0) {
      for (let i = 0; i < newContactsToInsert.length; i += CHUNK_SIZE) {
        const chunk = newContactsToInsert.slice(i, i + CHUNK_SIZE);
        await this.contactRepository
          .createQueryBuilder()
          .insert()
          .into(ImportedContact)
          .values(chunk)
          .orIgnore() 
          .execute();
      }
    }

    const groupMembersToInsert = Array.from(contactMapForGroup.values()).map(item => ({
      groupId,
      contactId: item.contactId,
      metadata: item.metadata,
    }));

    for (let i = 0; i < groupMembersToInsert.length; i += CHUNK_SIZE) {
      const chunk = groupMembersToInsert.slice(i, i + CHUNK_SIZE);
      await this.memberRepository
        .createQueryBuilder()
        .insert()
        .into(ContactGroupMember)
        .values(chunk)
        .execute();
    }
  }
}
