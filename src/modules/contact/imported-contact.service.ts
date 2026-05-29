import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportedContact } from './entities/imported-contact.entity';

@Injectable()
export class ImportedContactService {
  constructor(
    @InjectRepository(ImportedContact, 'data')
    private readonly contactRepository: Repository<ImportedContact>,
  ) {}

  async findAll(): Promise<ImportedContact[]> {
    return this.contactRepository.find({ order: { name: 'ASC' } });
  }

  async create(name: string, phone: string): Promise<ImportedContact> {
    const existing = await this.contactRepository.findOne({ where: { phone } });
    if (existing) {
      existing.name = name;
      return this.contactRepository.save(existing);
    }
    const contact = this.contactRepository.create({ name, phone });
    return this.contactRepository.save(contact);
  }

  async delete(id: string): Promise<void> {
    await this.contactRepository.delete(id);
  }

  async deleteAll(): Promise<void> {
    await this.contactRepository.clear();
  }
}
