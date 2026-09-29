-- CreateTable
CREATE TABLE `ThresholdHit` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `academicYearId` VARCHAR(191) NOT NULL,
    `thresholdId` VARCHAR(191) NOT NULL,
    `incidentId` VARCHAR(191) NULL,
    `totalPoints` INTEGER NOT NULL,
    `reachedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ThresholdHit_academicYearId_idx`(`academicYearId`),
    UNIQUE INDEX `ThresholdHit_studentId_academicYearId_thresholdId_key`(`studentId`, `academicYearId`, `thresholdId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ThresholdHit` ADD CONSTRAINT `ThresholdHit_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThresholdHit` ADD CONSTRAINT `ThresholdHit_academicYearId_fkey` FOREIGN KEY (`academicYearId`) REFERENCES `AcademicYear`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThresholdHit` ADD CONSTRAINT `ThresholdHit_thresholdId_fkey` FOREIGN KEY (`thresholdId`) REFERENCES `SanctionThreshold`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
