const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const pool = require('../config/db');
const { validateMonthlyReport } = require('../middleware/reportValidators');
const {
  getMonthlyAttendance,
  buildMonthlyAttendanceWorkbook,
  safeSpreadsheetText,
} = require('../services/monthlyReportService');

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const invoke = (query) => {
  const req = { query };
  const res = createResponse();
  let nextCalled = false;
  validateMonthlyReport(req, res, () => {
    nextCalled = true;
  });
  return { req, res, nextCalled };
};

test('monthly report validation accepts month, four-digit year, and optional branch', () => {
  const result = invoke({ bulan: '10', tahun: '2026', id_cabang: '7' });
  assert.equal(result.nextCalled, true);
  assert.deepEqual(result.req.validatedMonthlyReport, {
    bulan: 10,
    tahun: 2026,
    id_cabang: '7',
  });

  const allBranches = invoke({ bulan: '2', tahun: '2025' });
  assert.equal(allBranches.nextCalled, true);
  assert.equal(allBranches.req.validatedMonthlyReport.id_cabang, null);
});

test('monthly report validation rejects invalid period and branch filters', () => {
  for (const query of [
    { bulan: '0', tahun: '2026' },
    { bulan: '13', tahun: '2026' },
    { bulan: '1.5', tahun: '2026' },
    { bulan: '1', tahun: '26' },
    { bulan: '1', tahun: '0000' },
    { bulan: '1', tahun: '2026', id_cabang: '0' },
    { bulan: '1', tahun: '2026', id_cabang: ['1', '2'] },
    { bulan: '1', tahun: '2026', id_cabang: '0001' },
    { bulan: '1', tahun: '2026', id_cabang: 'x' },
    { bulan: '1', tahun: '2026', id_cabang: '9223372036854775808' },
  ]) {
    const result = invoke(query);
    assert.equal(result.nextCalled, false);
    assert.equal(result.res.statusCode, 400);
  }
});

test('monthly report query binds filters and limits preview without limiting exports', async () => {
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, values) => {
    calls.push({ sql, values });
    return { rows: [] };
  };

  try {
    const preview = await getMonthlyAttendance({
      bulan: 10,
      tahun: 2026,
      id_cabang: '7',
      limit: 20,
    });
    assert.deepEqual(preview, { rows: [], total: 0 });
    assert.match(calls[0].sql, /j\.id_cabang = \$3::bigint/);
    assert.match(calls[0].sql, /leave_request\.status_pengajuan = 'disetujui'/);
    assert.match(calls[0].sql, /generate_series/);
    assert.match(calls[0].sql, /a\.id_jadwal IS NULL/);
    assert.match(calls[0].sql, /LIMIT \$4/);
    assert.deepEqual(calls[0].values, [2026, 10, '7', 20]);

    await getMonthlyAttendance({ bulan: 10, tahun: 2026, id_cabang: null });
    assert.doesNotMatch(calls[1].sql, /LIMIT \$\d/);
    assert.deepEqual(calls[1].values, [2026, 10, null]);
  } finally {
    pool.query = originalQuery;
  }
});

test('spreadsheet text escapes formula-leading values', () => {
  for (const value of ['=1+1', '+SUM(A1:A2)', '-2+3', '@SUM(A1)', ' \t=1+1']) {
    assert.equal(safeSpreadsheetText(value), `'${value}`);
  }
  assert.equal(safeSpreadsheetText('Nama karyawan'), 'Nama karyawan');
  assert.equal(safeSpreadsheetText(null), '');
});

test('monthly attendance workbook is a readable XLSX with typed dates and safe text', async () => {
  const buffer = await buildMonthlyAttendanceWorkbook([
    {
      id_karyawan: '15',
      kode_karyawan: 'K-015',
      nama_lengkap: '=HYPERLINK("https://invalid.example","klik")',
      nama_cabang: 'Cabang Utama',
      tanggal_kerja: '2026-10-01',
      nama_shift: 'Pagi',
      jam_masuk_terjadwal: '08:00:00',
      jam_pulang_terjadwal: '16:00:00',
      waktu_masuk: new Date('2026-10-01T01:00:00.000Z'),
      waktu_pulang: null,
      status_kehadiran: 'hadir',
      menit_terlambat: 0,
      menit_terlambat_diluar_toleransi: 0,
      keterangan: null,
    },
  ], { bulan: 10, tahun: 2026 });

  assert.equal(Buffer.from(buffer).subarray(0, 2).toString(), 'PK');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(buffer));
  const worksheet = workbook.getWorksheet('Rekap Absensi');

  assert.equal(worksheet.getCell('A2').value, '15');
  assert.equal(worksheet.getCell('C2').value, '\'=HYPERLINK("https://invalid.example","klik")');
  assert.equal(worksheet.getCell('C2').type, ExcelJS.ValueType.String);
  assert.equal(worksheet.getCell('E2').value instanceof Date, true);
  assert.equal(worksheet.getCell('E2').numFmt, 'dd mmm yyyy');
  assert.equal(worksheet.getCell('L2').value, 0);
  assert.equal(worksheet.getCell('J2').value, null);
  assert.equal(worksheet.getCell('N1').value, 'Keterangan');
  assert.equal(worksheet.getCell('N2').value, '');
});

test('monthly workbook includes an approved sick leave row and its reason', async () => {
  const buffer = await buildMonthlyAttendanceWorkbook([
    {
      id_karyawan: '15',
      kode_karyawan: 'K-015',
      nama_lengkap: 'Josia',
      nama_cabang: 'Pakuan',
      tanggal_kerja: '2026-10-11',
      nama_shift: null,
      jam_masuk_terjadwal: null,
      jam_pulang_terjadwal: null,
      waktu_masuk: null,
      waktu_pulang: null,
      status_kehadiran: 'sakit',
      menit_terlambat: 0,
      menit_terlambat_diluar_toleransi: 0,
      keterangan: 'Demam.',
    },
  ], { bulan: 10, tahun: 2026 });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(buffer));
  const worksheet = workbook.getWorksheet('Rekap Absensi');
  assert.equal(worksheet.getCell('C2').value, 'Josia');
  assert.equal(worksheet.getCell('E2').value.toISOString(), '2026-10-11T00:00:00.000Z');
  assert.equal(worksheet.getCell('K2').value, 'sakit');
  assert.equal(worksheet.getCell('N2').value, 'Demam.');
});
