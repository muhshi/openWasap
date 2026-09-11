import { MigrationInterface, QueryRunner } from "typeorm";

export class ContactGroupMemberMetadata1786555322871 implements MigrationInterface {
    name = 'ContactGroupMemberMetadata1786555322871'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const isPostgres = queryRunner.connection.options.type === 'postgres';
        if (isPostgres) {
            await queryRunner.query(`ALTER TABLE "contact_group_members" ADD COLUMN IF NOT EXISTS "metadata" jsonb`);
        } else {
            const hasCol = await queryRunner.hasColumn("contact_group_members", "metadata").catch(() => false);
            if (!hasCol) {
                await queryRunner.query(`ALTER TABLE "contact_group_members" ADD COLUMN "metadata" text`);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Do not drop tables or columns to preserve database integrity
    }

}
