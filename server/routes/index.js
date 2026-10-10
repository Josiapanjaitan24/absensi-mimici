const express = require('express');
const { getHealth, getCabang } = require('../controllers/cabangController');
const { login, me } = require('../controllers/authController');
const {
  getSchedule,
  getActiveShifts,
  getAttendanceHistory,
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
  validateDateRange,
  validateAttendanceRequest,
  validateLeaveRequest,
  validateScheduleChangeRequest,
} = require('../middleware/employeeValidators');

const router = express.Router();

router.get('/health', getHealth);
router.get('/cabang', getCabang);
router.post('/auth/login', validateLoginRequest, login);
router.get('/auth/me', requireAuth, requireRole('admin', 'karyawan'), me);

router.use('/karyawan', requireAuth, requireRole('karyawan'), requireEmployee);
router.get('/karyawan/shift', getActiveShifts);
router.get('/karyawan/jadwal', validateDateRange, getSchedule);
router.get('/karyawan/absensi', validateDateRange, getAttendanceHistory);
router.post('/karyawan/absensi/masuk', validateAttendanceRequest, clockIn);
router.post('/karyawan/absensi/pulang', validateAttendanceRequest, clockOut);
router.get('/karyawan/pengajuan-izin', getLeaveRequests);
router.post('/karyawan/pengajuan-izin', validateLeaveRequest, createLeaveRequest);
router.get('/karyawan/perubahan-jadwal', getScheduleChangeRequests);
router.post('/karyawan/perubahan-jadwal', validateScheduleChangeRequest, createScheduleChangeRequest);

module.exports = router;
