-- AlterTable
ALTER TABLE `SummonsLetter` ADD COLUMN `parentName` VARCHAR(191) NULL,
    ADD COLUMN `responseToken` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `SummonsLetter_responseToken_key` ON `SummonsLetter`(`responseToken`);
