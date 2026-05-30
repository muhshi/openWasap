import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { VectorDbService } from './vector-db.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Knowledge } from '../knowledge/entities/knowledge.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Knowledge])],
  providers: [GeminiService, VectorDbService],
  exports: [GeminiService, VectorDbService],
})
export class AiModule {}
