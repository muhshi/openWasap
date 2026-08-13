import { MigrationInterface, QueryRunner } from "typeorm";

export class ContactGroupMemberMetadata1786555322871 implements MigrationInterface {
    name = 'ContactGroupMemberMetadata1786555322871'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "knowledges" ("id" varchar PRIMARY KEY NOT NULL, "content" text NOT NULL, "metadata" text, "embedding" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "api_keys" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar(100) NOT NULL, "keyHash" varchar(64) NOT NULL, "keyPrefix" varchar(20) NOT NULL, "role" varchar(20) NOT NULL DEFAULT ('operator'), "allowedIps" text, "allowedSessions" text, "isActive" boolean NOT NULL DEFAULT (1), "expiresAt" text, "lastUsedAt" text, "usageCount" integer NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_df3b25181df0b4b59bd93f16e1" ON "api_keys" ("keyHash") `);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" varchar PRIMARY KEY NOT NULL, "action" varchar(50) NOT NULL, "severity" varchar(10) NOT NULL DEFAULT ('info'), "apiKeyId" varchar(36), "apiKeyName" varchar(100), "sessionId" varchar(36), "sessionName" varchar(100), "ipAddress" varchar(45), "userAgent" varchar(500), "method" varchar(10), "path" varchar(500), "statusCode" integer, "metadata" text, "errorMessage" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs" ("action") `);
        await queryRunner.query(`CREATE INDEX "IDX_741fa976d1e04e695f3aa23cb8" ON "audit_logs" ("apiKeyId") `);
        await queryRunner.query(`CREATE INDEX "IDX_dd2b6e43c767b6b5b2bb227ace" ON "audit_logs" ("sessionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_c69efb19bf127c97e6740ad530" ON "audit_logs" ("createdAt") `);
        await queryRunner.query(`CREATE TABLE "temporary_contact_group_members" ("id" varchar PRIMARY KEY NOT NULL, "groupId" varchar NOT NULL, "contactId" varchar NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "metadata" text, CONSTRAINT "FK_9fd478531a285fda240bd245278" FOREIGN KEY ("contactId") REFERENCES "imported_contacts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_8ba3de75dc50c3a5c20e3134974" FOREIGN KEY ("groupId") REFERENCES "contact_groups" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_contact_group_members"("id", "groupId", "contactId", "createdAt") SELECT "id", "groupId", "contactId", "createdAt" FROM "contact_group_members"`);
        await queryRunner.query(`DROP TABLE "contact_group_members"`);
        await queryRunner.query(`ALTER TABLE "temporary_contact_group_members" RENAME TO "contact_group_members"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contact_group_members" RENAME TO "temporary_contact_group_members"`);
        await queryRunner.query(`CREATE TABLE "contact_group_members" ("id" varchar PRIMARY KEY NOT NULL, "groupId" varchar NOT NULL, "contactId" varchar NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_9fd478531a285fda240bd245278" FOREIGN KEY ("contactId") REFERENCES "imported_contacts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_8ba3de75dc50c3a5c20e3134974" FOREIGN KEY ("groupId") REFERENCES "contact_groups" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "contact_group_members"("id", "groupId", "contactId", "createdAt") SELECT "id", "groupId", "contactId", "createdAt" FROM "temporary_contact_group_members"`);
        await queryRunner.query(`DROP TABLE "temporary_contact_group_members"`);
        await queryRunner.query(`DROP INDEX "IDX_c69efb19bf127c97e6740ad530"`);
        await queryRunner.query(`DROP INDEX "IDX_dd2b6e43c767b6b5b2bb227ace"`);
        await queryRunner.query(`DROP INDEX "IDX_741fa976d1e04e695f3aa23cb8"`);
        await queryRunner.query(`DROP INDEX "IDX_cee5459245f652b75eb2759b4c"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP INDEX "IDX_df3b25181df0b4b59bd93f16e1"`);
        await queryRunner.query(`DROP TABLE "api_keys"`);
        await queryRunner.query(`DROP TABLE "knowledges"`);
    }

}
