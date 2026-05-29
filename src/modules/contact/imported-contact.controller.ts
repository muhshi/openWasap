import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ImportedContactService } from './imported-contact.service';
import { CurrentApiKey } from '../auth/decorators/auth.decorators';
import { ApiKey } from '../auth/entities/api-key.entity';

@ApiTags('contacts')
@Controller('contacts/imported')
export class ImportedContactController {
  constructor(private readonly contactService: ImportedContactService) {}

  @Get()
  @ApiOperation({ summary: 'Get all imported contacts stored in database' })
  @ApiResponse({ status: 200, description: 'List of imported contacts' })
  async findAll(@CurrentApiKey() apiKey: ApiKey) {
    return this.contactService.findAll(apiKey);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update an imported contact' })
  @ApiResponse({ status: 201, description: 'Contact created/updated' })
  async create(
    @Body() body: { name: string; phone: string },
    @CurrentApiKey() apiKey: ApiKey,
  ) {
    return this.contactService.create(body.name, body.phone, apiKey);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete imported contact by ID' })
  @ApiResponse({ status: 204, description: 'Contact deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: ApiKey,
  ) {
    await this.contactService.delete(id, apiKey);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all imported contacts' })
  @ApiResponse({ status: 204, description: 'All contacts deleted' })
  async deleteAll(@CurrentApiKey() apiKey: ApiKey) {
    await this.contactService.deleteAll(apiKey);
  }
}
