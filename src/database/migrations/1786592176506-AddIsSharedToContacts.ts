import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsSharedToContacts1786592176506 implements MigrationInterface {
    name = 'AddIsSharedToContacts1786592176506'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const isPostgres = queryRunner.connection.options.type === 'postgres';
        if (isPostgres) {
            await queryRunner.query(`ALTER TABLE "imported_contacts" ADD COLUMN IF NOT EXISTS "isShared" boolean NOT NULL DEFAULT false`);
            await queryRunner.query(`ALTER TABLE "contact_groups" ADD COLUMN IF NOT EXISTS "isShared" boolean NOT NULL DEFAULT false`);
        } else {
            const hasShared1 = await queryRunner.hasColumn("imported_contacts", "isShared").catch(() => false);
            if (!hasShared1) {
                await queryRunner.query(`ALTER TABLE "imported_contacts" ADD COLUMN "isShared" boolean NOT NULL DEFAULT (0)`);
            }
            const hasShared2 = await queryRunner.hasColumn("contact_groups", "isShared").catch(() => false);
            if (!hasShared2) {
                await queryRunner.query(`ALTER TABLE "contact_groups" ADD COLUMN "isShared" boolean NOT NULL DEFAULT (0)`);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Do not drop tables or columns to preserve database integrity
    }

}
