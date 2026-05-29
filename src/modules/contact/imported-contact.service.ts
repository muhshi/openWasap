import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ImportedContact } from './entities/imported-contact.entity';
import { ApiKey, ApiKeyRole } from '../auth/entities/api-key.entity';

@Injectable()
export class ImportedContactService {
  constructor(
    @InjectRepository(ImportedContact, 'data')
    private readonly contactRepository: Repository<ImportedContact>,
  ) {}

  async findAll(apiKey?: ApiKey): Promise<ImportedContact[]> {
    const where: any = {};
    if (apiKey && apiKey.role !== ApiKeyRole.ADMIN) {
      where.ownerApiKeyId = apiKey.id;
    }
    return this.contactRepository.find({ where, order: { name: 'ASC' } });
  }

  async create(name: string, phone: string, apiKey?: ApiKey): Promise<ImportedContact> {
    const ownerApiKeyId = apiKey ? apiKey.id : null;
    const existing = await this.contactRepository.findOne({
      where: {
        phone,
        ownerApiKeyId: ownerApiKeyId === null ? IsNull() : ownerApiKeyId,
      },
    });
    if (existing) {
      existing.name = name;
      return this.contactRepository.save(existing);
    }
    const contact = this.contactRepository.create({ name, phone, ownerApiKeyId });
    return this.contactRepository.save(contact);
  }

  async delete(id: string, apiKey?: ApiKey): Promise<void> {
    const where: any = { id };
    if (apiKey && apiKey.role !== ApiKeyRole.ADMIN) {
      where.ownerApiKeyId = apiKey.id;
    }
    const contact = await this.contactRepository.findOne({ where });
    if (contact) {
      await this.contactRepository.remove(contact);
    }
  }

  async deleteAll(apiKey?: ApiKey): Promise<void> {
    const where: any = {};
    if (apiKey && apiKey.role !== ApiKeyRole.ADMIN) {
      where.ownerApiKeyId = apiKey.id;
    }
    await this.contactRepository.delete(where);
  }
}
