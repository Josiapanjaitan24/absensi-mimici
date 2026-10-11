const pool = require('../config/db');
const { currentJakartaDate } = require('../middleware/employeeValidators');

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const getSchedule = async (id_karyawan, { mulai, selesai }) => {
  const result = await pool.query(
    `
      SELECT
        j.id_jadwal,
        j.tanggal_kerja,
        j.status_jadwal,
        j.catatan,
        c.id_cabang,
        c.nama_cabang,
        (c.latitude IS NOT NULL AND c.longitude IS NOT NULL) AS lokasi_absensi_tersedia,
        c.radius_meter,
        s.id_shift,
        s.nama_shift,
        s.jam_masuk::text AS jam_masuk,
        s.jam_pulang::text AS jam_pulang,
        s.toleransi_terlambat_menit,
        a.id_absensi,
        a.waktu_masuk,
        a.waktu_pulang,
        a.status_kehadiran
      FROM jadwal_kerja j
      INNER JOIN cabang c ON c.id_cabang = j.id_cabang
      LEFT JOIN shift_kerja s ON s.id_shift = j.id_shift
      LEFT JOIN absensi a ON a.id_jadwal = j.id_jadwal
      WHERE j.id_karyawan = $1
        AND j.tanggal_kerja BETWEEN $2::date AND $3::date
      ORDER BY j.tanggal_kerja ASC, j.id_jadwal ASC
    `,
    [id_karyawan, mulai, selesai]
  );

  return result.rows;
};

const getActiveShifts = async () => {
  const result = await pool.query(
    `
      SELECT
        id_shift,
        nama_shift,
        jam_masuk::text AS jam_masuk,
        jam_pulang::text AS jam_pulang,
        toleransi_terlambat_menit
      FROM shift_kerja
      WHERE status_aktif = TRUE
      ORDER BY nama_shift ASC
    `
  );

  return result.rows;
};

const getAttendanceHistory = async (id_karyawan, { mulai, selesai }) => {
  const result = await pool.query(
    `
      SELECT
        a.id_absensi,
        a.id_jadwal,
        a.tanggal AS tanggal_kerja,
        c.nama_cabang,
        NULL::text AS nama_shift,
        NULL::text AS jam_masuk_terjadwal,
        NULL::text AS jam_pulang_terjadwal,
        a.jam_masuk::text AS waktu_masuk,
        a.jam_pulang::text AS waktu_pulang,
        a.status_absensi AS status_kehadiran,
        0 AS menit_terlambat,
        0 AS menit_terlambat_diluar_toleransi,
        NULL::text AS catatan
      FROM absensi a
      INNER JOIN cabang c ON c.id_cabang = a.id_cabang
      WHERE a.id_karyawan = $1
        AND a.tanggal BETWEEN $2::date AND $3::date
      ORDER BY a.tanggal DESC, a.id_absensi DESC
    `,
    [id_karyawan, mulai, selesai]
  );

  return result.rows;
};

const getLeaveRequests = async (id_karyawan) => {
  const result = await pool.query(
    `
      SELECT
        id_pengajuan,
        tanggal_mulai,
        tanggal_selesai,
        jenis_pengajuan,
        alasan,
        status_pengajuan,
        catatan_admin,
        waktu_diajukan,
        waktu_diproses
      FROM pengajuan_izin
      WHERE id_karyawan = $1
      ORDER BY waktu_diajukan DESC
      LIMIT 50
    `,
    [id_karyawan]
  );

  return result.rows;
};

const createLeaveRequest = async (id_karyawan, data) => {
  const result = await pool.query(
    `
      INSERT INTO pengajuan_izin (
        id_karyawan,
        tanggal_mulai,
        tanggal_selesai,
        jenis_pengajuan,
        alasan,
        status_pengajuan
      )
      VALUES ($1, $2::date, $3::date, $4, $5, 'menunggu')
      RETURNING
        id_pengajuan,
        tanggal_mulai,
        tanggal_selesai,
        jenis_pengajuan,
        alasan,
        status_pengajuan,
        waktu_diajukan
    `,
    [
      id_karyawan,
      data.tanggal_mulai,
      data.tanggal_selesai,
      data.jenis_pengajuan,
      data.alasan,
    ]
  );

  return result.rows[0];
};

const getScheduleChangeRequests = async (id_karyawan) => {
  const result = await pool.query(
    `
      SELECT
        p.id_pengajuan_perubahan,
        p.id_jadwal_asal,
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
      LEFT JOIN cabang c ON c.id_cabang = p.id_cabang_tujuan
      LEFT JOIN shift_kerja s ON s.id_shift = p.id_shift_baru
      WHERE p.id_karyawan = $1
      ORDER BY p.waktu_diajukan DESC
      LIMIT 50
    `,
    [id_karyawan]
  );

  return result.rows;
};

const createScheduleChangeRequest = async (id_karyawan, data) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (data.id_jadwal_asal) {
      const sourceSchedule = await client.query(
        `
          SELECT id_jadwal
          FROM jadwal_kerja
          WHERE id_jadwal = $1
            AND id_karyawan = $2
          FOR SHARE
        `,
        [data.id_jadwal_asal, id_karyawan]
      );

      if (sourceSchedule.rowCount === 0) {
        fail(404, 'Jadwal asal tidak ditemukan untuk akun ini.');
      }
    }

    if (data.id_cabang_tujuan) {
      const branch = await client.query(
        'SELECT id_cabang FROM cabang WHERE id_cabang = $1 AND status_aktif = TRUE',
        [data.id_cabang_tujuan]
      );

      if (branch.rowCount === 0) {
        fail(400, 'Cabang tujuan tidak ditemukan atau tidak aktif.');
      }
    }

    if (data.id_shift_baru) {
      const shift = await client.query(
        'SELECT id_shift FROM shift_kerja WHERE id_shift = $1 AND status_aktif = TRUE',
        [data.id_shift_baru]
      );

      if (shift.rowCount === 0) {
        fail(400, 'Shift baru tidak ditemukan atau tidak aktif.');
      }
    }

    const result = await client.query(
      `
        INSERT INTO pengajuan_perubahan_jadwal (
          id_karyawan,
          id_jadwal_asal,
          id_cabang_tujuan,
          tanggal_jadwal_baru,
          id_shift_baru,
          jenis_perubahan,
          alasan,
          status_pengajuan
        )
        VALUES ($1, $2, $3, $4::date, $5, $6, $7, 'menunggu')
        RETURNING
          id_pengajuan_perubahan,
          id_jadwal_asal,
          id_cabang_tujuan,
          tanggal_jadwal_baru,
          id_shift_baru,
          jenis_perubahan,
          alasan,
          status_pengajuan,
          waktu_diajukan
      `,
      [
        id_karyawan,
        data.id_jadwal_asal,
        data.id_cabang_tujuan,
        data.tanggal_jadwal_baru,
        data.id_shift_baru,
        data.jenis_perubahan,
        data.alasan,
      ]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const haversineDistanceMeters = (latitude1, longitude1, latitude2, longitude2) => {
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const earthRadiusMeters = 6371000;
  const deltaLatitude = toRadians(latitude2 - latitude1);
  const deltaLongitude = toRadians(longitude2 - longitude1);
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(toRadians(latitude1))
    * Math.cos(toRadians(latitude2))
    * Math.sin(deltaLongitude / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isWithinAttendanceRadius = (distanceMeters, configuredRadius) => {
  const radius = Number(configuredRadius);
  const effectiveRadius = Number.isFinite(radius) && radius > 0
    ? Math.min(radius, 100)
    : 100;
  return Number.isFinite(distanceMeters) && distanceMeters <= effectiveRadius;
};

const getShiftStartTimestamp = (date, time) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute, second = '0'] = time.split(':');

  return Date.UTC(year, month - 1, day, Number(hour), Number(minute), Number(second)) - (7 * 60 * 60 * 1000);
};

const calculateTardiness = (currentTimestamp, date, time, tolerance) => {
  const shiftStart = getShiftStartTimestamp(date, time);
  const minutesLate = Math.max(0, Math.ceil((currentTimestamp - shiftStart) / 60000));

  return {
    minutesLate,
    minutesOutsideTolerance: Math.max(0, minutesLate - tolerance),
    status: minutesLate > tolerance ? 'telat' : 'hadir',
  };
};

const recordAttendance = async (id_karyawan, data, action) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const scheduleResult = await client.query(
      `
        SELECT
          j.id_jadwal,
          j.tanggal_kerja::text AS tanggal_kerja,
          j.status_jadwal,
          c.latitude AS latitude_cabang,
          c.longitude AS longitude_cabang,
          c.radius_meter,
          c.status_aktif AS cabang_aktif,
          s.id_shift,
          s.jam_masuk::text AS jam_masuk,
          s.jam_pulang::text AS jam_pulang,
          s.toleransi_terlambat_menit,
          CURRENT_TIMESTAMP AS waktu_sekarang,
          timezone('Asia/Jakarta', CURRENT_TIMESTAMP)::date::text AS tanggal_jakarta
        FROM jadwal_kerja j
        INNER JOIN cabang c ON c.id_cabang = j.id_cabang
        LEFT JOIN shift_kerja s ON s.id_shift = j.id_shift
        WHERE j.id_jadwal = $1
          AND j.id_karyawan = $2
        FOR UPDATE OF j
      `,
      [data.id_jadwal, id_karyawan]
    );
    const schedule = scheduleResult.rows[0];

    if (!schedule) {
      fail(404, 'Jadwal tidak ditemukan untuk akun karyawan ini.');
    }

    if (schedule.status_jadwal !== 'terjadwal') {
      fail(409, 'Absensi hanya tersedia untuk jadwal kerja yang terjadwal.');
    }

    if (!schedule.id_shift) {
      fail(409, 'Jadwal ini belum memiliki shift yang dapat digunakan untuk absensi.');
    }

    if (schedule.latitude_cabang === null || schedule.longitude_cabang === null) {
      fail(409, 'Lokasi GPS cabang belum dikonfigurasi untuk absensi.');
    }

    if (!schedule.cabang_aktif) {
      fail(409, 'Cabang pada jadwal ini tidak aktif.');
    }

    if (action === 'masuk' && schedule.tanggal_kerja !== schedule.tanggal_jakarta) {
      fail(409, 'Absensi masuk hanya dapat dilakukan pada tanggal jadwal di WIB.');
    }

    const distance = haversineDistanceMeters(
      data.latitude,
      data.longitude,
      Number(schedule.latitude_cabang),
      Number(schedule.longitude_cabang)
    );

    if (!isWithinAttendanceRadius(distance, schedule.radius_meter)) {
      fail(403, 'Lokasi perangkat berada di luar radius maksimal 100 meter dari cabang.');
    }

    const existingResult = await client.query(
      `
        SELECT id_absensi, waktu_masuk, waktu_pulang
        FROM absensi
        WHERE id_jadwal = $1
        FOR UPDATE
      `,
      [data.id_jadwal]
    );
    const existing = existingResult.rows[0];
    const now = new Date(schedule.waktu_sekarang).getTime();

    if (action === 'masuk') {
      if (existing) {
        fail(409, 'Absensi masuk untuk jadwal ini sudah tercatat.');
      }

      const tolerance = Number(schedule.toleransi_terlambat_menit);
      const tardiness = calculateTardiness(
        now,
        schedule.tanggal_kerja,
        schedule.jam_masuk,
        tolerance
      );
      const result = await client.query(
        `
          INSERT INTO absensi (
            id_jadwal,
            waktu_masuk,
            latitude_masuk,
            longitude_masuk,
            status_kehadiran,
            menit_terlambat,
            menit_terlambat_diluar_toleransi
          )
          VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5, $6)
          RETURNING
            id_absensi,
            id_jadwal,
            waktu_masuk,
            waktu_pulang,
            status_kehadiran,
            menit_terlambat,
            menit_terlambat_diluar_toleransi
        `,
        [
          data.id_jadwal,
          data.latitude,
          data.longitude,
          tardiness.status,
          tardiness.minutesLate,
          tardiness.minutesOutsideTolerance,
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    }

    if (!existing || !existing.waktu_masuk) {
      fail(409, 'Absensi masuk belum tercatat untuk jadwal ini.');
    }

    if (existing.waktu_pulang) {
      fail(409, 'Absensi pulang untuk jadwal ini sudah tercatat.');
    }

    const currentDate = schedule.tanggal_jakarta;
    const isOvernightShift = schedule.jam_pulang < schedule.jam_masuk;
    const tomorrow = new Date(`${schedule.tanggal_kerja}T00:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const nextDate = tomorrow.toISOString().slice(0, 10);
    const validCheckoutDate = currentDate === schedule.tanggal_kerja
      || (isOvernightShift && currentDate === nextDate);

    if (!validCheckoutDate) {
      fail(409, 'Absensi pulang hanya tersedia pada tanggal kerja, atau keesokan harinya untuk shift lintas tengah malam.');
    }

    const result = await client.query(
      `
        UPDATE absensi
        SET waktu_pulang = CURRENT_TIMESTAMP,
            latitude_pulang = $2,
            longitude_pulang = $3
        WHERE id_absensi = $1
          AND waktu_pulang IS NULL
        RETURNING
          id_absensi,
          id_jadwal,
          waktu_masuk,
          waktu_pulang,
          status_kehadiran,
          menit_terlambat,
          menit_terlambat_diluar_toleransi
      `,
      [existing.id_absensi, data.latitude, data.longitude]
    );

    if (result.rowCount === 0) {
      fail(409, 'Absensi pulang sudah tercatat.');
    }

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getBranchAttendanceStatus = async (id_karyawan, id_cabang, dbPool = pool) => {
  const result = await dbPool.query(
    `
      SELECT
        c.id_cabang,
        c.nama_cabang,
        c.latitude,
        c.longitude,
        c.status_aktif AS cabang_aktif,
        timezone('Asia/Jakarta', CURRENT_TIMESTAMP)::date::text AS tanggal,
        a.id_absensi,
        a.jam_masuk::text AS jam_masuk,
        a.jam_pulang::text AS jam_pulang,
        a.status_absensi
      FROM cabang c
      LEFT JOIN absensi a
        ON a.id_cabang = c.id_cabang
       AND a.id_karyawan = $1
       AND a.tanggal = timezone('Asia/Jakarta', CURRENT_TIMESTAMP)::date
      WHERE c.id_cabang = $2
    `,
    [id_karyawan, id_cabang]
  );

  if (result.rowCount === 0) {
    fail(404, 'Cabang tidak ditemukan.');
  }

  return result.rows[0];
};

const recordBranchAttendance = async (id_karyawan, data, dbPool = pool) => {
  const client = await dbPool.connect();

  try {
    await client.query('BEGIN');
    const branchResult = await client.query(
      `
        SELECT
          id_cabang,
          nama_cabang,
          latitude,
          longitude,
          status_aktif,
          timezone('Asia/Jakarta', CURRENT_TIMESTAMP)::date::text AS tanggal
        FROM cabang
        WHERE id_cabang = $1
        FOR SHARE
      `,
      [data.id_cabang]
    );
    const branch = branchResult.rows[0];

    if (!branch) {
      fail(404, 'Cabang tidak ditemukan.');
    }
    if (!branch.status_aktif) {
      fail(409, 'Cabang sedang tidak aktif untuk absensi.');
    }
    if (branch.latitude === null || branch.longitude === null) {
      fail(409, 'Koordinat cabang belum dikonfigurasi. Hubungi admin.');
    }

    const distance = haversineDistanceMeters(
      data.latitude,
      data.longitude,
      Number(branch.latitude),
      Number(branch.longitude)
    );
    if (!isWithinAttendanceRadius(distance, 100)) {
      fail(403, `Absensi ditolak: lokasi berjarak ${Math.round(distance)} meter, melebihi radius 100 meter.`);
    }

    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [`attendance:${id_karyawan}`, `${data.id_cabang}:${branch.tanggal}`]
    );

    const existingResult = await client.query(
      `
        SELECT id_absensi, jam_masuk::text AS jam_masuk, jam_pulang::text AS jam_pulang
        FROM absensi
        WHERE id_karyawan = $1
          AND id_cabang = $2
          AND tanggal = $3::date
        ORDER BY id_absensi DESC
        LIMIT 1
        FOR UPDATE
      `,
      [id_karyawan, data.id_cabang, branch.tanggal]
    );
    const existing = existingResult.rows[0];
    let attendance;
    let action;

    if (!existing || !existing.jam_masuk) {
      action = 'masuk';
      const result = await client.query(
        `
          INSERT INTO absensi (
            id_karyawan,
            id_jadwal,
            id_cabang,
            tanggal,
            jam_masuk,
            status_absensi,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            NULL,
            $2,
            $3::date,
            CURRENT_TIMESTAMP,
            'hadir',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
          RETURNING
            id_absensi,
            id_cabang,
            tanggal::text AS tanggal,
            jam_masuk::text AS jam_masuk,
            jam_pulang::text AS jam_pulang,
            status_absensi
        `,
        [id_karyawan, data.id_cabang, branch.tanggal]
      );
      attendance = result.rows[0];
    } else if (!existing.jam_pulang) {
      action = 'pulang';
      const result = await client.query(
        `
          UPDATE absensi
          SET jam_pulang = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id_absensi = $1
          RETURNING
            id_absensi,
            id_cabang,
            tanggal::text AS tanggal,
            jam_masuk::text AS jam_masuk,
            jam_pulang::text AS jam_pulang,
            status_absensi
        `,
        [existing.id_absensi]
      );
      attendance = result.rows[0];
    } else {
      fail(409, 'Absensi masuk dan pulang untuk cabang ini sudah tercatat hari ini.');
    }

    await client.query('COMMIT');
    return {
      ...attendance,
      nama_cabang: branch.nama_cabang,
      action,
      distance_meter: Math.round(distance),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getSchedule,
  getActiveShifts,
  getAttendanceHistory,
  getLeaveRequests,
  createLeaveRequest,
  getScheduleChangeRequests,
  createScheduleChangeRequest,
  recordAttendance,
  getBranchAttendanceStatus,
  recordBranchAttendance,
  calculateTardiness,
  haversineDistanceMeters,
  isWithinAttendanceRadius,
  getShiftStartTimestamp,
};
