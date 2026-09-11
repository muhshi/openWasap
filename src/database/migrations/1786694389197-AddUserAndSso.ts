import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserAndSso1786694389197 implements MigrationInterface {
    name = 'AddUserAndSso1786694389197'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const isPostgres = queryRunner.connection.options.type === 'postgres';
        if (isPostgres) {
            await queryRunner.query(`CREATE TABLE IF NOT EXISTS "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sipetraId" varchar(100), "name" varchar(150) NOT NULL, "email" varchar(150), "nip" varchar(50), "jabatan" varchar(150), "sipetraToken" text, "sipetraRefreshToken" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), PRIMARY KEY ("id"))`);
            await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_386a4692e4955a3ab784e2f661" ON "users" ("sipetraId")`);
            await queryRunner.query(`ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "userId" uuid REFERENCES "users"("id") ON DELETE CASCADE`);
        } else {
            const hasUsers = await queryRunner.hasTable("users").catch(() => false);
            if (!hasUsers) {
                await queryRunner.query(`CREATE TABLE "users" ("id" varchar PRIMARY KEY NOT NULL, "sipetraId" varchar(100), "name" varchar(150) NOT NULL, "email" varchar(150), "nip" varchar(50), "jabatan" varchar(150), "sipetraToken" text, "sipetraRefreshToken" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
                await queryRunner.query(`CREATE UNIQUE INDEX "IDX_386a4692e4955a3ab784e2f661" ON "users" ("sipetraId")`);
            }
            const hasUserCol = await queryRunner.hasColumn("api_keys", "userId").catch(() => false);
            if (!hasUserCol) {
                await queryRunner.query(`ALTER TABLE "api_keys" ADD COLUMN "userId" varchar`);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Do not drop tables or columns to preserve database integrity
    }

}
