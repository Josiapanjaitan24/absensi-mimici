const { buildSuccess } = require('../utils/response');
const adminService = require('../services/adminService');

const getDashboardSummary = async (req, res, next) => {
  try {
    const summary = await adminService.getDashboardSummary();
    return buildSuccess(res, summary, 200, 'Ringkasan dashboard admin berhasil diambil.');
  } catch (error) {
    return next(error);
  }
};

const getBranches = async (req, res, next) => {
  try {
    const branches = await adminService.getBranches();
    return buildSuccess(res, branches, 200, 'Data cabang berhasil diambil.');
  } catch (error) {
    return next(error);
  }
};

const updateBranch = async (req, res, next) => {
  try {
    const branch = await adminService.updateBranch(
      req.validatedBranchId,
      req.validatedBranchChanges
    );
    return buildSuccess(res, branch, 200, 'Data cabang berhasil diperbarui.');
  } catch (error) {
    return next(error);
  }
};

const getEmployeeRequests = async (req, res, next) => {
  try {
    const requests = await adminService.getEmployeeRequests();
    return buildSuccess(res, requests, 200, 'Pengajuan karyawan berhasil diambil.');
  } catch (error) {
    return next(error);
  }
};

const updateEmployeeRequestDecision = async (req, res, next) => {
  try {
    const request = await adminService.updateEmployeeRequestDecision(
      req.params.type,
      req.validatedEmployeeRequestId,
      req.validatedEmployeeRequestDecision,
      req.user.id_pengguna
    );
    return buildSuccess(res, request, 200, 'Status pengajuan berhasil diperbarui.');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getDashboardSummary,
  getBranches,
  updateBranch,
  getEmployeeRequests,
  updateEmployeeRequestDecision,
};
