const pool = require('../config/db');

const requestTables = {
  izin: { table: 'pengajuan_izin', idColumn: 'id_pengajuan' },
  'perubahan-jadwal': {
    table: 'pengajuan_perubahan_jadwal',
    idColumn: 'id_pengajuan_perubahan',
  },
};

const updateEmployeeRequestDecision = async (
  type,
  id,
  decision,
  id_pengguna_pemroses,
  dbPool = pool
) => {
  const requestTable = requestTables[type];
  if (!requestTable) {
    const error = new Error('Jenis pengajuan tidak valid.');
    error.statusCode = 400;
    throw error;
  }

  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `
        SELECT status_pengajuan
        FROM ${requestTable.table}
        WHERE ${requestTable.idColumn} = $1
        FOR UPDATE
      `,
      [id]
    );

    if (existing.rowCount === 0) {
      const error = new Error('Pengajuan tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }
    if (existing.rows[0].status_pengajuan !== 'menunggu') {
      const error = new Error('Pengajuan ini sudah diproses sebelumnya.');
      error.statusCode = 409;
      throw error;
    }

    const updated = await client.query(
      `
        UPDATE ${requestTable.table}
        SET status_pengajuan = $2,
            catatan_admin = $3,
            id_pengguna_pemroses = $4,
            waktu_diproses = CURRENT_TIMESTAMP
        WHERE ${requestTable.idColumn} = $1
          AND status_pengajuan = 'menunggu'
        RETURNING ${requestTable.idColumn}, status_pengajuan, catatan_admin, waktu_diproses
      `,
      [id, decision.status_pengajuan, decision.catatan_admin, id_pengguna_pemroses]
    );

    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getDashboardSummary = async () => {
  const result = await pool.query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM cabang WHERE status_aktif = TRUE) AS cabang_aktif,
        (SELECT COUNT(*)::int FROM karyawan WHERE status_aktif = TRUE) AS karyawan_aktif,
        (
          SELECT COUNT(*)::int
          FROM jadwal_kerja
          WHERE tanggal_kerja = timezone('Asia/Jakarta', CURRENT_TIMESTAMP)::date
            AND status_jadwal = 'terjadwal'
        ) AS jadwal_hari_ini,
        (
          SELECT COUNT(*)::int
          FROM absensi a
          INNER JOIN jadwal_kerja j ON j.id_jadwal = a.id_jadwal
          WHERE j.tanggal_kerja = timezone('Asia/Jakarta', CURRENT_TIMESTAMP)::date
            AND a.waktu_masuk IS NOT NULL
        ) AS absensi_masuk_hari_ini,
        (
          (SELECT COUNT(*) FROM pengajuan_izin WHERE status_pengajuan = 'menunggu')
          +
          (SELECT COUNT(*) FROM pengajuan_perubahan_jadwal WHERE status_pengajuan = 'menunggu')
        )::int AS pengajuan_menunggu
    `
  );

  return result.rows[0];
};

const getBranches = async () => {
  const result = await pool.query(
    `
      SELECT id_cabang, nama_cabang, slug, radius_meter, status_aktif
      FROM cabang
      ORDER BY id_cabang ASC
    `
  );

  return result.rows;
};

const updateBranch = async (id_cabang, changes) => {
  const columns = [];
  const values = [id_cabang];

  if (Object.hasOwn(changes, 'status_aktif')) {
    values.push(changes.status_aktif);
    columns.push(`status_aktif = $${values.length}`);
  }

  if (Object.hasOwn(changes, 'radius_meter')) {
    values.push(changes.radius_meter);
    columns.push(`radius_meter = $${values.length}`);
  }

  const result = await pool.query(
    `
      UPDATE cabang
      SET ${columns.join(', ')}
      WHERE id_cabang = $1
      RETURNING id_cabang, nama_cabang, slug, radius_meter, status_aktif
    `,
    values
  );

  if (result.rowCount === 0) {
    const error = new Error('Cabang tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

const getEmployeeRequests = async () => {
  const [leaveResult, scheduleChangeResult] = await Promise.all([
    pool.query(
      `
        SELECT
          p.id_pengajuan,
          p.id_karyawan,
          k.nama_lengkap,
          p.jenis_pengajuan,
          p.tanggal_mulai,
          p.tanggal_selesai,
          p.alasan,
          p.status_pengajuan,
          p.catatan_admin,
          p.waktu_diajukan,
          p.waktu_diproses
        FROM pengajuan_izin p
        INNER JOIN karyawan k ON k.id_karyawan = p.id_karyawan
        ORDER BY p.waktu_diajukan DESC
        LIMIT 200
      `
    ),
    pool.query(
      `
        SELECT
          p.id_pengajuan_perubahan,
          p.id_karyawan,
          k.nama_lengkap,
          p.id_jadwal_asal,
          jadwal_asal.tanggal_kerja AS tanggal_jadwal_asal,
          cabang_asal.nama_cabang AS nama_cabang_asal,
          shift_asal.nama_shift AS nama_shift_asal,
          p.id_cabang_tujuan,
          c.nama_cabang AS nama_cabang_tujuan,
          p.tanggal_jadwal_baru,
          p.id_shift_baru,
          s.nama_shift AS nama_shift_baru,
          p.jenis_perubahan,
          p.alasan,
          p.status_pengajuan,
          p.catatan_admin,
          p.waktu_diajukan,
          p.waktu_diproses
        FROM pengajuan_perubahan_jadwal p
        INNER JOIN karyawan k ON k.id_karyawan = p.id_karyawan
        LEFT JOIN jadwal_kerja jadwal_asal ON jadwal_asal.id_jadwal = p.id_jadwal_asal
        LEFT JOIN cabang cabang_asal ON cabang_asal.id_cabang = jadwal_asal.id_cabang
        LEFT JOIN shift_kerja shift_asal ON shift_asal.id_shift = jadwal_asal.id_shift
        LEFT JOIN cabang c ON c.id_cabang = p.id_cabang_tujuan
        LEFT JOIN shift_kerja s ON s.id_shift = p.id_shift_baru
        ORDER BY p.waktu_diajukan DESC
        LIMIT 200
      `
    ),
  ]);

  return {
    izin: leaveResult.rows,
    perubahan_jadwal: scheduleChangeResult.rows,
  };
};

module.exports = {
  getDashboardSummary,
  getBranches,
  updateBranch,
  getEmployeeRequests,
  updateEmployeeRequestDecision,
};
