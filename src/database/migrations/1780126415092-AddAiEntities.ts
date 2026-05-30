import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAiEntities1780126415092 implements MigrationInterface {
    name = 'AddAiEntities1780126415092'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "knowledges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "content" text NOT NULL, "metadata" jsonb, "embedding" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_98ba7faa0517bbf6d84af3564bf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "config"`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "config" jsonb NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "connectedAt"`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "connectedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "lastActiveAt"`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "lastActiveAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "webhooks" DROP COLUMN "events"`);
        await queryRunner.query(`ALTER TABLE "webhooks" ADD "events" jsonb NOT NULL DEFAULT '["message.received"]'`);
        await queryRunner.query(`ALTER TABLE "webhooks" DROP COLUMN "headers"`);
        await queryRunner.query(`ALTER TABLE "webhooks" ADD "headers" jsonb NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "webhooks" DROP COLUMN "lastTriggeredAt"`);
        await queryRunner.query(`ALTER TABLE "webhooks" ADD "lastTriggeredAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "message_batches" DROP COLUMN "messages"`);
        await queryRunner.query(`ALTER TABLE "message_batches" ADD "messages" jsonb NOT NULL`);
        await queryRunner.query(`ALTER TABLE "message_batches" DROP COLUMN "options"`);
        await queryRunner.query(`ALTER TABLE "message_batches" ADD "options" jsonb`);
        await queryRunner.query(`ALTER TABLE "message_batches" DROP COLUMN "progress"`);
        await queryRunner.query(`ALTER TABLE "message_batches" ADD "progress" jsonb`);
        await queryRunner.query(`ALTER TABLE "message_batches" DROP COLUMN "results"`);
        await queryRunner.query(`ALTER TABLE "message_batches" ADD "results" jsonb`);
        await queryRunner.query(`ALTER TABLE "message_batches" DROP COLUMN "started_at"`);
        await queryRunner.query(`ALTER TABLE "message_batches" ADD "started_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "message_batches" DROP COLUMN "completed_at"`);
        await queryRunner.query(`ALTER TABLE "message_batches" ADD "completed_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "metadata"`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "metadata" jsonb`);
        await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "allowedIps"`);
        await queryRunner.query(`ALTER TABLE "api_keys" ADD "allowedIps" jsonb`);
        await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "allowedSessions"`);
        await queryRunner.query(`ALTER TABLE "api_keys" ADD "allowedSessions" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "allowedSessions"`);
        await queryRunner.query(`ALTER TABLE "api_keys" ADD "allowedSessions" text`);
        await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "allowedIps"`);
        await queryRunner.query(`ALTER TABLE "api_keys" ADD "allowedIps" text`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "metadata"`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "metadata" text`);
        await queryRunner.query(`ALTER TABLE "message_batches" DROP COLUMN "completed_at"`);
        await queryRunner.query(`ALTER TABLE "message_batches" ADD "completed_at" text`);
        await queryRunner.query(`ALTER TABLE "message_batches" DROP COLUMN "started_at"`);
        await queryRunner.query(`ALTER TABLE "message_batches" ADD "started_at" text`);
        await queryRunner.query(`ALTER TABLE "message_batches" DROP COLUMN "results"`);
        await queryRunner.query(`ALTER TABLE "message_batches" ADD "results" text`);
        await queryRunner.query(`ALTER TABLE "message_batches" DROP COLUMN "progress"`);
        await queryRunner.query(`ALTER TABLE "message_batches" ADD "progress" text`);
        await queryRunner.query(`ALTER TABLE "message_batches" DROP COLUMN "options"`);
        await queryRunner.query(`ALTER TABLE "message_batches" ADD "options" text`);
        await queryRunner.query(`ALTER TABLE "message_batches" DROP COLUMN "messages"`);
        await queryRunner.query(`ALTER TABLE "message_batches" ADD "messages" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "webhooks" DROP COLUMN "lastTriggeredAt"`);
        await queryRunner.query(`ALTER TABLE "webhooks" ADD "lastTriggeredAt" text`);
        await queryRunner.query(`ALTER TABLE "webhooks" DROP COLUMN "headers"`);
        await queryRunner.query(`ALTER TABLE "webhooks" ADD "headers" text NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "webhooks" DROP COLUMN "events"`);
        await queryRunner.query(`ALTER TABLE "webhooks" ADD "events" text NOT NULL DEFAULT '["message.received"]'`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "lastActiveAt"`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "lastActiveAt" text`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "connectedAt"`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "connectedAt" text`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "config"`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "config" text NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`DROP TABLE "knowledges"`);
    }

}
