const { buildError } = require('../utils/response');

const validateBranchId = (req, res, next) => {
  const { id } = req.params;

  if (!/^\d+$/.test(String(id)) || BigInt(id) <= 0n) {
    return buildError(res, 400, 'ID cabang harus berupa bilangan positif.');
  }

  req.validatedBranchId = String(id);
  return next();
};

const validateBranchUpdate = (req, res, next) => {
  const body = req.body;
  const allowedKeys = new Set(['status_aktif', 'radius_meter']);

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return buildError(res, 400, 'Data perubahan cabang tidak valid.');
  }

  const keys = Object.keys(body);
  if (keys.length === 0 || keys.some((key) => !allowedKeys.has(key))) {
    return buildError(res, 400, 'Ubah status aktif atau radius GPS cabang.');
  }

  const changes = {};
  if (Object.hasOwn(body, 'status_aktif')) {
    if (typeof body.status_aktif !== 'boolean') {
      return buildError(res, 400, 'Status aktif harus berupa boolean.');
    }
    changes.status_aktif = body.status_aktif;
  }

  if (Object.hasOwn(body, 'radius_meter')) {
    if (
      typeof body.radius_meter !== 'number'
      || !Number.isSafeInteger(body.radius_meter)
      || body.radius_meter <= 0
      || body.radius_meter > 100
    ) {
      return buildError(res, 400, 'Radius GPS harus berupa bilangan bulat antara 1 dan 100 meter.');
    }
    changes.radius_meter = body.radius_meter;
  }

  req.validatedBranchChanges = changes;
  return next();
};

const validateEmployeeRequestId = (req, res, next) => {
  const { id } = req.params;

  if (!/^\d+$/.test(String(id)) || BigInt(id) <= 0n) {
    return buildError(res, 400, 'ID pengajuan harus berupa bilangan positif.');
  }

  req.validatedEmployeeRequestId = String(id);
  return next();
};

const validateEmployeeRequestDecision = (req, res, next) => {
  const body = req.body;
  const allowedKeys = new Set(['status_pengajuan', 'catatan_admin']);

  if (
    !body
    || typeof body !== 'object'
    || Array.isArray(body)
    || Object.keys(body).some((key) => !allowedKeys.has(key))
    || !['disetujui', 'ditolak'].includes(body.status_pengajuan)
  ) {
    return buildError(res, 400, 'Status pengajuan harus disetujui atau ditolak.');
  }

  if (
    body.catatan_admin !== undefined
    && body.catatan_admin !== null
    && (typeof body.catatan_admin !== 'string' || body.catatan_admin.trim().length > 2000)
  ) {
    return buildError(res, 400, 'Catatan admin maksimal 2000 karakter.');
  }

  req.validatedEmployeeRequestDecision = {
    status_pengajuan: body.status_pengajuan,
    catatan_admin: body.catatan_admin?.trim() || null,
  };
  return next();
};

module.exports = {
  validateBranchId,
  validateBranchUpdate,
  validateEmployeeRequestId,
  validateEmployeeRequestDecision,
};
