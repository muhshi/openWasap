import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactController } from './contact.controller';
import { SessionModule } from '../session/session.module';
import { ImportedContact } from './entities/imported-contact.entity';
import { ImportedContactService } from './imported-contact.service';
import { ImportedContactController } from './imported-contact.controller';
import { ContactGroup } from './entities/contact-group.entity';
import { ContactGroupMember } from './entities/contact-group-member.entity';
import { ContactGroupService } from './contact-group.service';
import { ContactGroupController } from './contact-group.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ImportedContact, ContactGroup, ContactGroupMember], 'data'),
    SessionModule,
  ],
  controllers: [ContactController, ImportedContactController, ContactGroupController],
  providers: [ImportedContactService, ContactGroupService],
  exports: [ImportedContactService, ContactGroupService],
})
export class ContactModule {}

