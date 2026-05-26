import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ImportedContactService } from './imported-contact.service';

@ApiTags('contacts')
@Controller('contacts/imported')
export class ImportedContactController {
  constructor(private readonly contactService: ImportedContactService) {}

  @Get()
  @ApiOperation({ summary: 'Get all imported contacts stored in database' })
  @ApiResponse({ status: 200, description: 'List of imported contacts' })
  async findAll() {
    return this.contactService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create or update an imported contact' })
  @ApiResponse({ status: 201, description: 'Contact created/updated' })
  async create(@Body() body: { name: string; phone: string }) {
    return this.contactService.create(body.name, body.phone);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete imported contact by ID' })
  @ApiResponse({ status: 204, description: 'Contact deleted' })
  async delete(@Param('id') id: string) {
    await this.contactService.delete(id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all imported contacts' })
  @ApiResponse({ status: 204, description: 'All contacts deleted' })
  async deleteAll() {
    await this.contactService.deleteAll();
  }
}
