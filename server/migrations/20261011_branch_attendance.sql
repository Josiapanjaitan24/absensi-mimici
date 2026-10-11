BEGIN;

DO $$
DECLARE
  branch_id_type TEXT;
  employee_id_type TEXT;
  schedule_date_column TEXT;
BEGIN
  SELECT format_type(attribute.atttypid, attribute.atttypmod)
    INTO branch_id_type
  FROM pg_attribute AS attribute
  WHERE attribute.attrelid = 'cabang'::regclass
    AND attribute.attname = 'id_cabang'
    AND NOT attribute.attisdropped;

  SELECT format_type(attribute.atttypid, attribute.atttypmod)
    INTO employee_id_type
  FROM pg_attribute AS attribute
  WHERE attribute.attrelid = 'karyawan'::regclass
    AND attribute.attname = 'id_karyawan'
    AND NOT attribute.attisdropped;

  IF branch_id_type IS NULL OR employee_id_type IS NULL THEN
    RAISE EXCEPTION 'Kolom id_cabang atau id_karyawan tidak ditemukan.';
  END IF;

  EXECUTE format(
    'ALTER TABLE absensi ADD COLUMN IF NOT EXISTS id_cabang %s REFERENCES cabang(id_cabang)',
    branch_id_type
  );
  EXECUTE format(
    'ALTER TABLE absensi ADD COLUMN IF NOT EXISTS id_karyawan %s REFERENCES karyawan(id_karyawan)',
    employee_id_type
  );
  ALTER TABLE absensi ADD COLUMN IF NOT EXISTS tanggal DATE;
  ALTER TABLE absensi ADD COLUMN IF NOT EXISTS jam_masuk TIMESTAMPTZ;
  ALTER TABLE absensi ADD COLUMN IF NOT EXISTS jam_pulang TIMESTAMPTZ;
  ALTER TABLE absensi ADD COLUMN IF NOT EXISTS status_absensi VARCHAR(32);
  ALTER TABLE absensi ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
  ALTER TABLE absensi ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'jadwal_kerja'
      AND column_name = 'tanggal_kerja'
  ) THEN
    schedule_date_column := 'tanggal_kerja';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'jadwal_kerja'
      AND column_name = 'tanggal'
  ) THEN
    schedule_date_column := 'tanggal';
  ELSE
    RAISE EXCEPTION 'Kolom tanggal pada jadwal_kerja tidak ditemukan.';
  END IF;

  EXECUTE format(
    'UPDATE absensi AS attendance
     SET id_cabang = COALESCE(attendance.id_cabang, schedule.id_cabang),
         id_karyawan = COALESCE(attendance.id_karyawan, schedule.id_karyawan),
         tanggal = COALESCE(attendance.tanggal, schedule.%I)
     FROM jadwal_kerja AS schedule
     WHERE attendance.id_jadwal = schedule.id_jadwal',
    schedule_date_column
  );

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'absensi'
      AND column_name = 'waktu_masuk'
  ) THEN
    UPDATE absensi SET jam_masuk = waktu_masuk WHERE jam_masuk IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'absensi'
      AND column_name = 'waktu_pulang'
  ) THEN
    UPDATE absensi SET jam_pulang = waktu_pulang WHERE jam_pulang IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'absensi'
      AND column_name = 'status_kehadiran'
  ) THEN
    UPDATE absensi
    SET status_absensi = status_kehadiran
    WHERE status_absensi IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'absensi'
      AND column_name = 'dibuat_pada'
  ) THEN
    UPDATE absensi SET created_at = dibuat_pada WHERE created_at IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'absensi'
      AND column_name = 'status_kehadiran'
  ) THEN
    EXECUTE 'ALTER TABLE absensi ALTER COLUMN status_kehadiran SET DEFAULT ''hadir''';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'absensi'
      AND column_name = 'menit_terlambat'
  ) THEN
    EXECUTE 'ALTER TABLE absensi ALTER COLUMN menit_terlambat SET DEFAULT 0';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'absensi'
      AND column_name = 'menit_terlambat_diluar_toleransi'
  ) THEN
    EXECUTE 'ALTER TABLE absensi ALTER COLUMN menit_terlambat_diluar_toleransi SET DEFAULT 0';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'absensi'
      AND column_name = 'dibuat_pada'
  ) THEN
    EXECUTE 'ALTER TABLE absensi ALTER COLUMN dibuat_pada SET DEFAULT CURRENT_TIMESTAMP';
  END IF;

  UPDATE absensi SET status_absensi = 'hadir' WHERE status_absensi IS NULL;
  UPDATE absensi SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
  UPDATE absensi SET updated_at = created_at WHERE updated_at IS NULL;
END;
$$;

UPDATE cabang
SET latitude = COALESCE(latitude, CASE nama_cabang
      WHEN 'Pakuan' THEN -6.5989022
      WHEN 'Botani' THEN -6.6025274
      WHEN 'Azimar' THEN -6.5697676
      WHEN 'ATS' THEN -6.5469479
      WHEN 'Warung Nangka' THEN -6.6764374
      WHEN 'Ciapus' THEN -6.6229549
    END),
    longitude = COALESCE(longitude, CASE nama_cabang
      WHEN 'Pakuan' THEN 106.8125596
      WHEN 'Botani' THEN 106.806923
      WHEN 'Azimar' THEN 106.8141759
      WHEN 'ATS' THEN 106.7551105
      WHEN 'Warung Nangka' THEN 106.8474526
      WHEN 'Ciapus' THEN 106.7814796
    END)
WHERE nama_cabang IN ('Pakuan', 'Botani', 'Azimar', 'ATS', 'Warung Nangka', 'Ciapus')
  AND (latitude IS NULL OR longitude IS NULL);

ALTER TABLE absensi
  ALTER COLUMN id_jadwal DROP NOT NULL,
  ALTER COLUMN status_absensi SET DEFAULT 'hadir',
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_absensi_employee_branch_date
  ON absensi (id_karyawan, id_cabang, tanggal);

COMMIT;
