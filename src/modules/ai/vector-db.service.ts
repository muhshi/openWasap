import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Knowledge } from '../knowledge/entities/knowledge.entity';

@Injectable()
export class VectorDbService {
  private readonly logger = new Logger(VectorDbService.name);

  constructor(
    @InjectRepository(Knowledge)
    private readonly knowledgeRepo: Repository<Knowledge>,
  ) {}

  /**
   * Search for the most relevant knowledge entries using cosine similarity (<=>).
   * @param queryEmbedding The vector array of the user's query
   * @param limit Maximum number of context items to return
   */
  async search(queryEmbedding: number[], limit: number = 3): Promise<Knowledge[]> {
    try {
      const vectorString = `[${queryEmbedding.join(',')}]`;
      
      // pgvector cosine similarity operator is <=>
      const results = await this.knowledgeRepo
        .createQueryBuilder('knowledge')
        .where('knowledge.embedding IS NOT NULL')
        .orderBy(`knowledge.embedding <=> '${vectorString}'`, 'ASC')
        .limit(limit)
        .getMany();
        
      return results;
    } catch (error) {
      this.logger.error(`Error searching vector DB: ${error.message}`);
      return [];
    }
  }

  /**
   * Insert a knowledge chunk with its vector embedding.
   */
  async insertKnowledge(content: string, metadata: any, embedding: number[]): Promise<Knowledge> {
    const vectorString = `[${embedding.join(',')}]`;
    const knowledge = this.knowledgeRepo.create({
      content,
      metadata,
      embedding: vectorString,
    });
    return await this.knowledgeRepo.save(knowledge);
  }
}
