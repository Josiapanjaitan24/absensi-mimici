const { buildSuccess, buildError } = require('../utils/response');
const { loginUser, getUserProfile } = require('../services/authService');

const login = async (req, res, next) => {
  try {
    const payload = await loginUser(req.body);

    return buildSuccess(res, payload, 200, 'Login berhasil.');
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const profile = await getUserProfile(req.user.id_pengguna);

    if (!profile) {
      return buildError(res, 404, 'Profil pengguna tidak ditemukan.');
    }

    return buildSuccess(res, {
      id_pengguna: profile.id_pengguna,
      nama_pengguna: profile.nama_pengguna,
      peran: profile.peran,
      nama_lengkap: profile.nama_lengkap,
      id_cabang_utama: profile.id_cabang_utama,
      status_aktif: profile.status_aktif,
    }, 200, 'Profil pengguna berhasil diambil.');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  login,
  me,
};
