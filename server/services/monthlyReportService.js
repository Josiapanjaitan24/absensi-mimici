const ExcelJS = require('exceljs');
const pool = require('../config/db');

const getMonthlyAttendance = async ({ bulan, tahun, id_cabang, limit = null }) => {
  const parameters = [tahun, bulan, id_cabang];
  const limitClause = Number.isSafeInteger(limit) && limit > 0
    ? `LIMIT $${parameters.push(limit)}`
    : '';
  const result = await pool.query(
    `
      WITH periode AS (
        SELECT
          make_date($1::integer, $2::integer, 1) AS mulai,
          (make_date($1::integer, $2::integer, 1) + INTERVAL '1 month')::date AS selesai
      ),
      catatan_absensi AS (
        SELECT
          k.id_karyawan::text AS id_karyawan,
          k.kode_karyawan,
          k.nama_lengkap,
          c.nama_cabang,
          j.tanggal_kerja AS tanggal_kerja,
          s.nama_shift,
          s.jam_masuk::text AS jam_masuk_terjadwal,
          s.jam_pulang::text AS jam_pulang_terjadwal,
          a.waktu_masuk,
          a.waktu_pulang,
          a.status_kehadiran,
          a.menit_terlambat,
          a.menit_terlambat_diluar_toleransi,
          a.catatan AS keterangan,
          a.id_absensi
        FROM absensi a
        INNER JOIN jadwal_kerja j ON j.id_jadwal = a.id_jadwal
        INNER JOIN karyawan k ON k.id_karyawan = j.id_karyawan
        INNER JOIN cabang c ON c.id_cabang = j.id_cabang
        LEFT JOIN shift_kerja s ON s.id_shift = j.id_shift
        CROSS JOIN periode p
        WHERE j.tanggal_kerja >= p.mulai
          AND j.tanggal_kerja < p.selesai
          AND ($3::bigint IS NULL OR j.id_cabang = $3::bigint)
          AND NOT EXISTS (
            SELECT 1
            FROM pengajuan_izin leave_request
            WHERE leave_request.id_karyawan = k.id_karyawan
              AND leave_request.status_pengajuan = 'disetujui'
              AND j.tanggal_kerja BETWEEN leave_request.tanggal_mulai AND leave_request.tanggal_selesai
          )

        UNION ALL

        SELECT
          k.id_karyawan::text,
          k.kode_karyawan,
          k.nama_lengkap,
          c.nama_cabang,
          a.tanggal,
          NULL::text AS nama_shift,
          NULL::text AS jam_masuk_terjadwal,
          NULL::text AS jam_pulang_terjadwal,
          a.jam_masuk AS waktu_masuk,
          a.jam_pulang AS waktu_pulang,
          a.status_absensi AS status_kehadiran,
          0 AS menit_terlambat,
          0 AS menit_terlambat_diluar_toleransi,
          a.catatan AS keterangan,
          a.id_absensi
        FROM absensi a
        INNER JOIN karyawan k ON k.id_karyawan = a.id_karyawan
        INNER JOIN cabang c ON c.id_cabang = a.id_cabang
        CROSS JOIN periode p
        WHERE a.id_jadwal IS NULL
          AND a.tanggal >= p.mulai
          AND a.tanggal < p.selesai
          AND ($3::bigint IS NULL OR a.id_cabang = $3::bigint)
          AND NOT EXISTS (
            SELECT 1
            FROM pengajuan_izin leave_request
            WHERE leave_request.id_karyawan = k.id_karyawan
              AND leave_request.status_pengajuan = 'disetujui'
              AND a.tanggal BETWEEN leave_request.tanggal_mulai AND leave_request.tanggal_selesai
          )

        UNION ALL

        SELECT
          k.id_karyawan::text,
          k.kode_karyawan,
          k.nama_lengkap,
          c.nama_cabang,
          leave_day.tanggal_kerja::date AS tanggal_kerja,
          NULL::text AS nama_shift,
          NULL::text AS jam_masuk_terjadwal,
          NULL::text AS jam_pulang_terjadwal,
          NULL::timestamptz AS waktu_masuk,
          NULL::timestamptz AS waktu_pulang,
          leave_request.jenis_pengajuan AS status_kehadiran,
          0 AS menit_terlambat,
          0 AS menit_terlambat_diluar_toleransi,
          leave_request.alasan AS keterangan,
          leave_request.id_pengajuan AS id_absensi
        FROM pengajuan_izin leave_request
        INNER JOIN karyawan k ON k.id_karyawan = leave_request.id_karyawan
        LEFT JOIN cabang c ON c.id_cabang = k.id_cabang_utama
        CROSS JOIN periode p
        CROSS JOIN LATERAL generate_series(
          GREATEST(leave_request.tanggal_mulai, p.mulai)::timestamp,
          LEAST(leave_request.tanggal_selesai, p.selesai - 1)::timestamp,
          INTERVAL '1 day'
        ) AS leave_day(tanggal_kerja)
        WHERE leave_request.status_pengajuan = 'disetujui'
          AND leave_request.tanggal_mulai < p.selesai
          AND leave_request.tanggal_selesai >= p.mulai
          AND ($3::bigint IS NULL OR k.id_cabang_utama = $3::bigint)
      )
      SELECT
        COUNT(*) OVER() AS total_records,
        id_karyawan,
        kode_karyawan,
        nama_lengkap,
        nama_cabang,
        to_char(tanggal_kerja, 'YYYY-MM-DD') AS tanggal_kerja,
        nama_shift,
        jam_masuk_terjadwal,
        jam_pulang_terjadwal,
        waktu_masuk,
        waktu_pulang,
        status_kehadiran,
        menit_terlambat,
        menit_terlambat_diluar_toleransi,
        keterangan
      FROM catatan_absensi
      ORDER BY tanggal_kerja ASC, nama_cabang ASC NULLS LAST, nama_lengkap ASC, id_absensi ASC
      ${limitClause}
    `,
    parameters
  );

  return {
    rows: result.rows.map(({ total_records, ...row }) => row),
    total: Number(result.rows[0]?.total_records ?? 0),
  };
};

const safeSpreadsheetText = (value) => {
  if (typeof value !== 'string') return value ?? '';
  return /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value;
};

const asExcelDate = (value) => {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
};

const buildMonthlyAttendanceWorkbook = async (rows, { bulan, tahun }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Absensi Mimici';
  workbook.created = new Date();
  workbook.subject = `Rekap absensi ${tahun}-${String(bulan).padStart(2, '0')}`;

  const worksheet = workbook.addWorksheet('Rekap Absensi', {
    views: [{ state: 'frozen', ySplit: 1 }],
    autoFilter: 'A1:N1',
  });

  worksheet.columns = [
    { header: 'ID Karyawan', key: 'id_karyawan', width: 16 },
    { header: 'Kode Karyawan', key: 'kode_karyawan', width: 18 },
    { header: 'Nama Karyawan', key: 'nama_lengkap', width: 30 },
    { header: 'Cabang', key: 'nama_cabang', width: 24 },
    { header: 'Tanggal Kerja', key: 'tanggal_kerja', width: 18 },
    { header: 'Shift', key: 'nama_shift', width: 22 },
    { header: 'Jadwal Masuk', key: 'jam_masuk_terjadwal', width: 18 },
    { header: 'Jadwal Pulang', key: 'jam_pulang_terjadwal', width: 18 },
    { header: 'Waktu Masuk', key: 'waktu_masuk', width: 23 },
    { header: 'Waktu Pulang', key: 'waktu_pulang', width: 23 },
    { header: 'Status Kehadiran', key: 'status_kehadiran', width: 20 },
    { header: 'Terlambat (menit)', key: 'menit_terlambat', width: 20 },
    { header: 'Terlambat di luar toleransi (menit)', key: 'menit_terlambat_diluar_toleransi', width: 34 },
    { header: 'Keterangan', key: 'keterangan', width: 48 },
  ];

  const header = worksheet.getRow(1);
  header.height = 30;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF244766' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });

  for (const source of rows) {
    const row = worksheet.addRow({
      id_karyawan: safeSpreadsheetText(source.id_karyawan),
      kode_karyawan: safeSpreadsheetText(source.kode_karyawan),
      nama_lengkap: safeSpreadsheetText(source.nama_lengkap),
      nama_cabang: safeSpreadsheetText(source.nama_cabang),
      tanggal_kerja: asExcelDate(source.tanggal_kerja),
      nama_shift: safeSpreadsheetText(source.nama_shift),
      jam_masuk_terjadwal: safeSpreadsheetText(source.jam_masuk_terjadwal),
      jam_pulang_terjadwal: safeSpreadsheetText(source.jam_pulang_terjadwal),
      waktu_masuk: source.waktu_masuk ?? null,
      waktu_pulang: source.waktu_pulang ?? null,
      status_kehadiran: safeSpreadsheetText(source.status_kehadiran),
      menit_terlambat: source.menit_terlambat,
      menit_terlambat_diluar_toleransi: source.menit_terlambat_diluar_toleransi,
      keterangan: safeSpreadsheetText(source.keterangan),
    });
    row.getCell('tanggal_kerja').numFmt = 'dd mmm yyyy';
    row.getCell('jam_masuk_terjadwal').numFmt = 'hh:mm';
    row.getCell('jam_pulang_terjadwal').numFmt = 'hh:mm';
    row.getCell('waktu_masuk').numFmt = 'dd mmm yyyy hh:mm';
    row.getCell('waktu_pulang').numFmt = 'dd mmm yyyy hh:mm';
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle' };
    });
  }

  return workbook.xlsx.writeBuffer();
};

module.exports = {
  getMonthlyAttendance,
  buildMonthlyAttendanceWorkbook,
  safeSpreadsheetText,
};
