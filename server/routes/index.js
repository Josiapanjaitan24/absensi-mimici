const express = require('express');
const { getHealth, getCabang } = require('../controllers/cabangController');
const { login, me } = require('../controllers/authController');
const {
  getDashboardSummary,
  getBranches: getAdminBranches,
  updateBranch: updateAdminBranch,
  getEmployeeRequests,
  updateEmployeeRequestDecision,
} = require('../controllers/adminController');
const {
  getMonthlyReportPreview,
  downloadMonthlyReport,
} = require('../controllers/monthlyReportController');
const {
  getSchedule,
  getActiveShifts,
  getAttendanceHistory,
  getBranchAttendanceStatus,
  recordBranchAttendance,
  clockIn,
  clockOut,
  getLeaveRequests,
  createLeaveRequest,
  getScheduleChangeRequests,
  createScheduleChangeRequest,
} = require('../controllers/employeeController');
const { requireAuth, requireRole, requireEmployee } = require('../middleware/auth');
const { validateLoginRequest } = require('../middleware/validators');
const {
  validateBranchId,
  validateBranchUpdate,
  validateEmployeeRequestId,
  validateEmployeeRequestDecision,
} = require('../middleware/adminValidators');
const { validateMonthlyReport } = require('../middleware/reportValidators');
const {
  validateDateRange,
  validateAttendanceRequest,
  validateBranchAttendanceRequest,
  validateAttendanceBranchId,
  validateLeaveRequest,
  validateScheduleChangeRequest,
} = require('../middleware/employeeValidators');

const router = express.Router();

router.get('/health', getHealth);
router.get('/cabang', getCabang);
router.post('/auth/login', validateLoginRequest, login);
router.get('/auth/me', requireAuth, requireRole('admin', 'karyawan'), me);

router.use('/admin', requireAuth, requireRole('admin'));
router.get('/admin/dashboard', getDashboardSummary);
router.get('/admin/cabang', getAdminBranches);
router.patch('/admin/cabang/:id', validateBranchId, validateBranchUpdate, updateAdminBranch);
router.get('/admin/pengajuan', getEmployeeRequests);
router.patch(
  '/admin/pengajuan/:type/:id',
  validateEmployeeRequestId,
  validateEmployeeRequestDecision,
  updateEmployeeRequestDecision
);
router.get('/admin/rekap-bulanan', validateMonthlyReport, getMonthlyReportPreview);
router.get('/admin/rekap-bulanan.xlsx', validateMonthlyReport, downloadMonthlyReport);

router.use('/karyawan', requireAuth, requireRole('karyawan'), requireEmployee);
router.get('/karyawan/shift', getActiveShifts);
router.get('/karyawan/jadwal', validateDateRange, getSchedule);
router.get('/karyawan/absensi', validateDateRange, getAttendanceHistory);
router.get('/karyawan/absensi/cabang/:id', validateAttendanceBranchId, getBranchAttendanceStatus);
router.post('/karyawan/absensi/cabang', validateBranchAttendanceRequest, recordBranchAttendance);
router.post('/karyawan/absensi/masuk', validateAttendanceRequest, clockIn);
router.post('/karyawan/absensi/pulang', validateAttendanceRequest, clockOut);
router.get('/karyawan/pengajuan-izin', getLeaveRequests);
router.post('/karyawan/pengajuan-izin', validateLeaveRequest, createLeaveRequest);
router.get('/karyawan/perubahan-jadwal', getScheduleChangeRequests);
router.post('/karyawan/perubahan-jadwal', validateScheduleChangeRequest, createScheduleChangeRequest);

module.exports = router;
