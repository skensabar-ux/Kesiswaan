-- Counter nomor surat: dari per-jenis (enum) menjadi "scope" (ALL = satu urutan per tahun,
-- atau kode jenis bila format nomor memuat {jenis}). Nomor yang sudah terbit tidak berubah.
DROP INDEX `LetterCounter_year_type_key` ON `LetterCounter`;
ALTER TABLE `LetterCounter` CHANGE `type` `scope` VARCHAR(20) NOT NULL;
-- gabungkan counter lama per-jenis menjadi satu counter ALL (ambil nomor tertinggi) agar tidak ada nomor ganda
INSERT INTO `LetterCounter` (`id`, `year`, `scope`, `lastNumber`)
  SELECT CONCAT('c', `year`, 'all'), `year`, 'ALL', MAX(`lastNumber`) FROM `LetterCounter` GROUP BY `year`;
DELETE FROM `LetterCounter` WHERE `scope` <> 'ALL';
CREATE UNIQUE INDEX `LetterCounter_year_scope_key` ON `LetterCounter`(`year`, `scope`);
