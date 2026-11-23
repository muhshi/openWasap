import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum, IsOptional } from 'class-validator';
import { SessionStatus } from '../entities/session.entity';

export class CleanupInactiveSessionsDto {
  @ApiPropertyOptional({
    description: 'Statuses to delete. Only inactive statuses are accepted.',
    enum: SessionStatus,
    isArray: true,
    example: [SessionStatus.CREATED, SessionStatus.IDLE, SessionStatus.DISCONNECTED, SessionStatus.FAILED],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(SessionStatus, { each: true })
  statuses?: SessionStatus[];
}
