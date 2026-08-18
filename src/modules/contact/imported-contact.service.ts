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
    let where: any = {};
    if (apiKey && apiKey.role !== ApiKeyRole.ADMIN) {
      where = [
        { ownerApiKeyId: apiKey.id },
        { isShared: true }
      ];
    }
    return this.contactRepository.find({ where, order: { name: 'ASC' } });
  }

  async create(name: string, phone: string, apiKey?: ApiKey, isShared: boolean = false): Promise<ImportedContact> {
    const ownerApiKeyId = apiKey ? apiKey.id : null;
    const existing = await this.contactRepository.findOne({
      where: {
        phone,
        ownerApiKeyId: ownerApiKeyId === null ? IsNull() : ownerApiKeyId,
      },
    });
    if (existing) {
      existing.name = name;
      existing.isShared = isShared;
      return this.contactRepository.save(existing);
    }
    const contact = this.contactRepository.create({ name, phone, ownerApiKeyId, isShared });
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

  async bulkUpdate(ids: string[], isShared: boolean, apiKey?: ApiKey): Promise<{ updated: number }> {
    const qb = this.contactRepository.createQueryBuilder('contact')
      .update(ImportedContact)
      .set({ isShared })
      .where('id IN (:...ids)', { ids });
    
    if (apiKey && apiKey.role !== ApiKeyRole.ADMIN) {
      qb.andWhere('ownerApiKeyId = :ownerId', { ownerId: apiKey.id });
    }

    const result = await qb.execute();
    return { updated: result.affected ?? 0 };
  }

  async bulkDelete(ids: string[], apiKey?: ApiKey): Promise<{ deleted: number }> {
    const qb = this.contactRepository.createQueryBuilder('contact')
      .delete()
      .from(ImportedContact)
      .where('id IN (:...ids)', { ids });
    
    if (apiKey && apiKey.role !== ApiKeyRole.ADMIN) {
      qb.andWhere('ownerApiKeyId = :ownerId', { ownerId: apiKey.id });
    }

    const result = await qb.execute();
    return { deleted: result.affected ?? 0 };
  }
}
