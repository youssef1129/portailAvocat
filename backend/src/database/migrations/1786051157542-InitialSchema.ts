import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1786051157542 implements MigrationInterface {
    name = 'InitialSchema1786051157542'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "lawyers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "name" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_80c69bc638ef3b1c6c3a60dcb6f" UNIQUE ("email"), CONSTRAINT "PK_8adba1a65dc0076bb9fa0910d8b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "deposited_files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "storageKey" character varying NOT NULL, "originalName" character varying NOT NULL, "mimeType" character varying NOT NULL, "sizeBytes" bigint NOT NULL, "uploadedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "requestId" uuid, CONSTRAINT "PK_95f1241adb551e86b59e66e56d5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "deposit_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "publicToken" character varying NOT NULL, "pinHash" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "lawyerId" uuid, CONSTRAINT "UQ_d727bbd9101c6460ceb39555cf9" UNIQUE ("publicToken"), CONSTRAINT "PK_5474ff41b8c5aca99ac263e9b57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "deposit_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "requestId" uuid, CONSTRAINT "PK_92e87db0f8c2099d7115e748008" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "deposited_files" ADD CONSTRAINT "FK_e8ebe4ea7338d816f6f590c8486" FOREIGN KEY ("requestId") REFERENCES "deposit_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deposit_requests" ADD CONSTRAINT "FK_50855555387af0e7eee144b2ca3" FOREIGN KEY ("lawyerId") REFERENCES "lawyers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deposit_sessions" ADD CONSTRAINT "FK_000471b53c49a45dfc10789c238" FOREIGN KEY ("requestId") REFERENCES "deposit_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "deposit_sessions" DROP CONSTRAINT "FK_000471b53c49a45dfc10789c238"`);
        await queryRunner.query(`ALTER TABLE "deposit_requests" DROP CONSTRAINT "FK_50855555387af0e7eee144b2ca3"`);
        await queryRunner.query(`ALTER TABLE "deposited_files" DROP CONSTRAINT "FK_e8ebe4ea7338d816f6f590c8486"`);
        await queryRunner.query(`DROP TABLE "deposit_sessions"`);
        await queryRunner.query(`DROP TABLE "deposit_requests"`);
        await queryRunner.query(`DROP TABLE "deposited_files"`);
        await queryRunner.query(`DROP TABLE "lawyers"`);
    }

}
