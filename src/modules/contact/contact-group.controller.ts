import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ContactGroupService } from './contact-group.service';
import { SessionService } from '../session/session.service';
import { CurrentApiKey } from '../auth/decorators/auth.decorators';
import { ApiKey } from '../auth/entities/api-key.entity';

// ── DTOs ──────────────────────────────────────────────────────────────────────

class CreateContactGroupDto {
  @ApiProperty({ description: 'Nama group', example: 'Tim Santri Angkatan 2024' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Deskripsi group (opsional)', example: 'Group untuk blast informasi pesantren', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'ID kontak yang akan ditambahkan ke group (opsional)', type: [String], required: false })
  @IsArray()
  @IsOptional()
  contactIds?: string[];
}

class UpdateContactGroupDto {
  @ApiProperty({ description: 'Nama baru group', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Deskripsi baru', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

class AddMembersDto {
  @ApiProperty({ description: 'Array ID kontak yang akan ditambahkan', type: [String] })
  @IsArray()
  contactIds: string[];
}

class BlastMessageDto {
  @ApiProperty({ description: 'Session ID WhatsApp yang aktif', example: 'default' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'Pesan yang akan dikirim. Gunakan {{name}} untuk nama penerima', example: 'Halo {{name}}, ini adalah pengumuman penting.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'Delay antar pesan dalam ms (default: 3000)', required: false, example: 3000 })
  @IsOptional()
  delayMs?: number;
}

// ── Controller ────────────────────────────────────────────────────────────────

@ApiTags('contact-groups')
@Controller('contact-groups')
export class ContactGroupController {
  constructor(
    private readonly contactGroupService: ContactGroupService,
    private readonly sessionService: SessionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List semua contact group (system group, bukan WhatsApp group)' })
  @ApiResponse({ status: 200, description: 'List group beserta jumlah anggota' })
  async findAll(@CurrentApiKey() apiKey: ApiKey) {
    return this.contactGroupService.findAll(apiKey);
  }

  @Post()
  @ApiOperation({ summary: 'Buat contact group baru' })
  @ApiBody({ type: CreateContactGroupDto })
  @ApiResponse({ status: 201, description: 'Group berhasil dibuat' })
  async create(
    @Body() dto: CreateContactGroupDto,
    @CurrentApiKey() apiKey: ApiKey,
  ) {
    const group = await this.contactGroupService.create(dto.name, dto.description, apiKey);

    // Tambah anggota awal jika ada
    if (dto.contactIds && dto.contactIds.length > 0) {
      await this.contactGroupService.addMembers(group.id, dto.contactIds, apiKey);
    }

    return this.contactGroupService.findOne(group.id, apiKey);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail contact group beserta daftar anggota' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Detail group dan anggotanya' })
  @ApiResponse({ status: 404, description: 'Group tidak ditemukan' })
  async findOne(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: ApiKey,
  ) {
    return this.contactGroupService.findOne(id, apiKey);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update nama/deskripsi contact group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({ type: UpdateContactGroupDto })
  @ApiResponse({ status: 200, description: 'Group berhasil diupdate' })
  @ApiResponse({ status: 404, description: 'Group tidak ditemukan' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContactGroupDto,
    @CurrentApiKey() apiKey: ApiKey,
  ) {
    return this.contactGroupService.update(id, dto.name, dto.description, apiKey);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hapus contact group (kontak asli tidak terhapus)' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 204, description: 'Group berhasil dihapus' })
  @ApiResponse({ status: 404, description: 'Group tidak ditemukan' })
  async delete(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: ApiKey,
  ) {
    await this.contactGroupService.delete(id, apiKey);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tambah anggota ke contact group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({ type: AddMembersDto })
  @ApiResponse({ status: 200, description: 'Anggota berhasil ditambahkan' })
  async addMembers(
    @Param('id') id: string,
    @Body() dto: AddMembersDto,
    @CurrentApiKey() apiKey: ApiKey,
  ) {
    const result = await this.contactGroupService.addMembers(id, dto.contactIds, apiKey);
    return { success: true, ...result };
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hapus anggota dari contact group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID (bukan Contact ID)' })
  @ApiResponse({ status: 204, description: 'Anggota berhasil dihapus dari group' })
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentApiKey() apiKey: ApiKey,
  ) {
    await this.contactGroupService.removeMember(id, memberId, apiKey);
  }

  @Post(':id/blast')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Kirim pesan WhatsApp personal (1-1) ke semua anggota group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({ type: BlastMessageDto })
  @ApiResponse({ status: 202, description: 'Blast diterima dan sedang diproses' })
  @ApiResponse({ status: 400, description: 'Session tidak aktif atau group kosong' })
  async blast(
    @Param('id') id: string,
    @Body() dto: BlastMessageDto,
    @CurrentApiKey() apiKey: ApiKey,
  ) {
    // Pastikan user memiliki akses ke sesi ini
    await this.sessionService.findOne(dto.sessionId, apiKey);

    const engine = this.sessionService.getEngine(dto.sessionId);
    if (!engine) {
      throw new BadRequestException(`Sesi "${dto.sessionId}" tidak ditemukan atau belum READY. Pastikan sesi WhatsApp sudah terhubung.`);
    }

    // Pastikan user memiliki akses ke group ini
    const members = await this.contactGroupService.getMemberPhones(id, apiKey);
    if (members.length === 0) {
      throw new BadRequestException('Group tidak memiliki anggota. Tambahkan kontak ke group terlebih dahulu.');
    }

    const delayMs = dto.delayMs ?? 3000;
    const results: Array<{ phone: string; name: string; status: 'sent' | 'failed'; error?: string }> = [];

    // Kirim pesan secara asinkron (non-blocking)
    void (async () => {
      for (const member of members) {
        try {
          const chatId = `${member.phone}@c.us`;
          // Ganti {{name}} dengan nama penerima
          const personalizedMessage = dto.message.replace(/\{\{name\}\}/g, member.name);
          await engine.sendTextMessage(chatId, personalizedMessage);
          results.push({ phone: member.phone, name: member.name, status: 'sent' });
        } catch (err) {
          results.push({
            phone: member.phone,
            name: member.name,
            status: 'failed',
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
        // Delay antar pesan
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    })();

    return {
      accepted: true,
      totalMembers: members.length,
      sessionId: dto.sessionId,
      groupId: id,
      message: `Blast ke ${members.length} anggota sedang diproses. Pesan dikirim dengan jeda ${delayMs}ms antar penerima.`,
    };
  }
}
