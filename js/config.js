/**
 * ============================================================
 * KONFIGURASI FRONTEND — Sistem Manajemen Radioterapi
 * ============================================================
 * Satu-satunya berkas yang perlu Anda ubah sebelum upload ke GitHub.
 *
 * GAS_URL : URL Web App Google Apps Script (backend), berakhiran /exec
 *           Didapat dari Apps Script → Deploy → New deployment → Web app → salin "Web app URL".
 *           Contoh: 'https://script.google.com/macros/s/AKfycb.../exec'
 * NAMA_RS : nama rumah sakit yang tampil di halaman masuk sebelum data dari server terbaca.
 *
 * Aman untuk repository publik: berkas ini tidak berisi password atau API key.
 * Semua data pasien tetap dilindungi login (username + password) di server.
 */
window.RT_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbw7bnkCZktYDcFkoH5nZvUm-s2FS-yfv21UVg1Vw6BGjXh251MLMQrbMxzj9z3Byu8s/exec',
  NAMA_RS: 'RS Siloam Agora'
};
