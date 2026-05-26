import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportedContact } from './entities/imported-contact.entity';

@Injectable()
export class ImportedContactService implements OnModuleInit {
  constructor(
    @InjectRepository(ImportedContact, 'data')
    private readonly contactRepository: Repository<ImportedContact>,
  ) {}

  async onModuleInit() {
    try {
      // Check if database is empty
      const count = await this.contactRepository.count();
      if (count === 0) {
        const defaultContacts = [
          { name: 'AHMAD KASYIF SYAROF', phone: '6285727253827' },
          { name: 'AQIM LAKUMAL KIBRIYA', phone: '6285848480751' },
          { name: 'Hasan taufiq', phone: '6282226416889' },
          { name: 'Malikhatun Hidayah', phone: '6282310559106' },
          { name: 'AHMAD GHOZALI', phone: '6281225008906' },
          { name: 'Edi Susanto', phone: '62895352968314' },
          { name: 'Muzaki Manaf', phone: '628886615482' },
          { name: 'Nur Hidayat', phone: '6285326024321' },
          { name: 'Ahmad Baihaqi', phone: '6289508592098' },
          { name: 'Fahmi Ainun Najib', phone: '6282227182516' },
          { name: 'IIN ELIVA', phone: '6283865650017' },
          { name: 'NUR MA\'RIFAH', phone: '6285228199040' },
          { name: 'LAILA LATIFATUL MUNAWAROH', phone: '6282328093023' },
          { name: 'Felasuf Al Zaki', phone: '6288901293973' },
          { name: 'Muhammad ulfi Sholeh', phone: '628982375060' },
          { name: 'Atik aulia rohmasani', phone: '6288215754636' },
          { name: 'Mina Ulyatul Umroh', phone: '6289630548046' },
          { name: 'Nurun Nafiqoh', phone: '62859165961517' },
          { name: 'Aminatus Soimah', phone: '6289519688567' },
          { name: 'Mohamad Ihwan Zamroni', phone: '6287766622597' },
          { name: 'Muhammad Izzuddin Fikri', phone: '6281297455382' },
          { name: 'IMRON ROSYADI', phone: '6282236177014' },
          { name: 'Kholisotun Naimah', phone: '6282223664373' },
          { name: 'Nur Fatimayasari', phone: '6282134625933' },
          { name: 'Satria Tri Astutik', phone: '62895360596233' },
          { name: 'Azifatul Fatimah', phone: '6282226416524' },
          { name: 'Faisal Basir', phone: '6281390153810' },
          { name: 'ALI RIDHO', phone: '6281328767425' },
          { name: 'Adis Rohmatullah', phone: '6285293033540' },
          { name: 'Dwi mustika melati', phone: '628871350561' },
          { name: 'Nur Laili wakhidah', phone: '6282310191286' },
          { name: 'UBAIDILLAH', phone: '6285290652076' },
          { name: 'MUHAMAD LATIF', phone: '6281225135321' },
          { name: 'Muhammad Rifqi Mubarok', phone: '6285735169571' },
          { name: 'Nurma Amaliya', phone: '6281808040549' },
          { name: 'Agus Ubaidillah', phone: '6281393546261' },
          { name: 'Himmatul Cahyani', phone: '6281513898641' },
          { name: 'Inayah', phone: '628895742401' },
          { name: 'ULIS SAKHOWATI', phone: '6289666979475' },
          { name: 'muhibbin', phone: '6282136428106' },
          { name: 'Roikhatul Miskiyah', phone: '6282248969719' },
          { name: 'anissaur rohmah', phone: '6282131034191' },
          { name: 'AZIZATUS SAB\'AH', phone: '6285326851881' },
          { name: 'Inna Naili Izzatul Laila', phone: '628997346166' },
          { name: 'KHOTIMUL MANAN', phone: '6281334660013' },
          { name: 'MUH. ADIB DAROJAD', phone: '6282390611565' },
          { name: 'Wachidatul Fitriyah', phone: '62895800022987' },
          { name: 'DZIKRULLOH', phone: '6281912892273' },
          { name: 'FATKHUL AFIF', phone: '6283122591676' },
          { name: 'Ifa Nurliana', phone: '6282324157282' },
          { name: 'Mustamiroh', phone: '6285290473613' },
          { name: 'PUTRI SUCI ULYANI', phone: '6283850580551' },
          { name: 'Nur ikhsan', phone: '6285238486946' },
          { name: 'Sukamad', phone: '6288216691735' }
        ];
        await this.contactRepository.save(defaultContacts);
        console.log('Seeded 54 default contacts into database successfully.');
      }
    } catch (err) {
      console.error('Failed to seed default contacts database:', err);
    }
  }

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
