import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactController } from './contact.controller';
import { SessionModule } from '../session/session.module';
import { ImportedContact } from './entities/imported-contact.entity';
import { ImportedContactService } from './imported-contact.service';
import { ImportedContactController } from './imported-contact.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ImportedContact], 'data'),
    SessionModule,
  ],
  controllers: [ContactController, ImportedContactController],
  providers: [ImportedContactService],
  exports: [ImportedContactService],
})
export class ContactModule {}
