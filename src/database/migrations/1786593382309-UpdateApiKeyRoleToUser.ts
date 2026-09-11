import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateApiKeyRoleToUser1786593382309 implements MigrationInterface {
    name = 'UpdateApiKeyRoleToUser1786593382309'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "api_keys" SET "role" = 'user' WHERE "role" IN ('operator', 'viewer')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Do not drop tables or columns to preserve database integrity
    }

}
