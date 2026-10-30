/**
 * Sistem Manajemen Radioterapi — Frontend (js/app.js) · v2.0
 * Arsitektur GAS-PRO-API: situs statis (GitHub Pages) ⇄ fetch() ⇄ Google Apps Script (REST JSON).
 * Prinsip gas-instant-ux: SPA 0ms · state lokal (S) · optimistic UI + antrean sinkron
 * · pencarian/filter/TAT dihitung lokal · server hanya dipanggil untuk baca/simpan data.
 * Alamat API diatur di js/config.js (RT_CONFIG.GAS_URL).
 */
(function () {
'use strict';
const B = {}; // info boot (nama RS / status database) — diisi dari GET ?action=boot

// ═════════ API (fetch → Google Apps Script Web App, JSON) ═════════
const CFG = window.RT_CONFIG || {};
const GAS_URL = String(CFG.GAS_URL || '').trim();
const API_SIAP = /^https?:\/\/\S+$/.test(GAS_URL) && !/XXXX|GANTI|PASTE/i.test(GAS_URL);
const API_TIMEOUT = 300000; // 5 menit (batas eksekusi Apps Script 6 menit)
const PESAN_KONEKSI = 'Koneksi ke server gagal. Periksa internet Anda, lalu pastikan URL API di js/config.js benar dan Web App di-deploy dengan akses "Anyone".';
/** POST JSON ke GAS. WAJIB text/plain agar tidak memicu CORS preflight (diblok Apps Script). */
function panggil(body) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const tm = ctl ? setTimeout(() => ctl.abort(), API_TIMEOUT) : 0;
  return fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', signal: ctl ? ctl.signal : undefined })
    .then(res => res.text().then(t => {
      try { return JSON.parse(t); }
      catch (e) { throw new Error(res.ok ? 'Respons server bukan JSON. Pastikan URL di js/config.js adalah URL Web App yang berakhiran /exec dan aksesnya "Anyone".' : 'Server error (HTTP ' + res.status + '). Coba lagi sesaat lagi.'); }
    }), e => { throw new Error(e && e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : PESAN_KONEKSI); })
    .finally(() => clearTimeout(tm));
}
/** GET info boot (nama RS & status database). Gagal → diam saja; halaman masuk tetap tampil. */
function bootInfo() {
  fetch(GAS_URL + (GAS_URL.indexOf('?') < 0 ? '?' : '&') + 'action=boot', { redirect: 'follow' }).then(r => r.json()).then(j => {
    const d = (j && j.data) || {};
    if (d.error) { B.error = d.error; if (!TOKEN) gate(`<div class="ic"><i class="bi bi-exclamation-triangle"></i></div><h2 class="t">Sistem belum siap</h2><p class="muted" style="margin:8px 0 16px">${esc(B.error)}</p>`); return; }
    if (d.rs && d.rs !== B.rs) {
      B.rs = d.rs; try { localStorage.setItem('rt_rs', d.rs); } catch (e) { /* abaikan */ }
      const el = document.querySelector('#login .lg-rs'); if (el) el.innerHTML = '<i class="bi bi-hospital"></i>' + esc(B.rs);
    }
  }).catch(() => { /* jaringan/API belum siap — pesan jelas muncul saat tombol Masuk ditekan */ });
}

// ═════════ UTIL ═════════
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const bersihNull = v => String(v == null ? '' : v).replace(/\bnull\b/gi, ' ').replace(/\s+/g, ' ').replace(/(\s*[-\/,]\s*)+$/, '').replace(/^(\s*[-\/,]\s*)+/, '').trim(); // buang kata "null" sisa HIS
const dpjpList = () => [...new Set(S.staf.filter(s => s.peran === 'Dokter' || (s.peran === 'Super Admin' && /^dr/i.test(String(s.nama).trim()))).map(s => s.nama))];
const normNRM = v => String(v == null ? '' : v).replace(/\D/g, '').replace(/^0+/, ''); // aturan NRM: hanya angka, tanpa nol di depan
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const fd = s => { if (!s) return '–'; const a = String(s).slice(0, 10).split('-'); return a.length === 3 ? a[2] + '/' + a[1] + '/' + a[0] : '–'; };
const dnum = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
const diff = (a, b) => (a && b) ? Math.round(dnum(b) - dnum(a)) : null;
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => iso(new Date());
const nowStr = () => { const d = new Date(); return iso(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); };
const n1 = x => x == null || isNaN(x) ? '–' : (Math.round(x * 10) / 10).toFixed(1);
const avg = a => { a = a.filter(x => x != null); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null; };
const umur = s => { if (!s) return ''; const b = new Date(s), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
const initials = n => String(n || '?').replace(/^(dr|drg)\.?\s{0,3}/i, '').split(/\s+/).slice(0, 2).map(w => (w[0] || '')).join('').toUpperCase();
const ago = s => { const t = new Date(String(s).replace(' ', 'T')); const m = Math.round((Date.now() - t) / 6e4); if (isNaN(m)) return ''; if (m < 1) return 'baru saja'; if (m < 60) return m + ' mnt lalu'; if (m < 1440) return Math.floor(m / 60) + ' jam lalu'; return Math.floor(m / 1440) + ' hari lalu'; };
// ═════════ BAHASA (Indonesia / English) ═════════
// Template ditulis dalam Bahasa Indonesia; saat English dipilih, teks yang tampil diterjemahkan otomatis
// (kamus EN + pola RX) oleh pengamat DOM. Teks asli disimpan agar bisa dikembalikan tanpa memuat ulang.
let LANG = 'id'; try { LANG = localStorage.getItem('rt_lang') === 'en' ? 'en' : 'id'; } catch (e) { LANG = 'id'; }
const EN = {"URL API belum diatur": "API URL not configured", "Buka berkas js/config.js, isi GAS_URL dengan URL Web App Google Apps Script (berakhiran /exec), lalu unggah ulang ke GitHub.": "Open js/config.js, set GAS_URL to the Google Apps Script Web App URL (ending in /exec), then upload it to GitHub again.", "Koneksi ke server gagal. Periksa internet Anda, lalu pastikan URL API di js/config.js benar dan Web App di-deploy dengan akses \"Anyone\".": "Connection to the server failed. Check your internet, then make sure the API URL in js/config.js is correct and the Web App is deployed with \"Anyone\" access.", "Respons server bukan JSON. Pastikan URL di js/config.js adalah URL Web App yang berakhiran /exec dan aksesnya \"Anyone\".": "The server response is not JSON. Make sure the URL in js/config.js is the Web App URL ending in /exec with \"Anyone\" access.", "Server terlalu lama merespons. Coba lagi.": "The server took too long to respond. Please try again.", "Permintaan kosong.": "Empty request.", "Action tidak dikenal.": "Unknown action.","Menu utama":"Main menu","Navigasi utama":"Main navigation","Dashboard":"Dashboard","Data Pasien":"Patients","Carepath":"Carepath","Kalender":"Calendar","Inventory Masker":"Mask Inventory","Report TAT":"TAT Report","Kelola Users":"Manage Users","Detail Pasien":"Patient Detail","Mode gelap":"Dark mode","Mode terang":"Light mode","Keluar":"Sign out","Buka menu":"Open menu","Ganti tema terang/gelap":"Toggle light/dark theme","Cari nama atau NRM…":"Search name or MRN…","Cari pasien berdasarkan nama atau NRM":"Search patients by name or MRN","Tersinkron":"Synced","Menyimpan…":"Saving…","Offline":"Offline","Akun saya":"My account","RADIOTERAPI":"RADIOTHERAPY","Memuat sistem…":"Loading system…","Sistem Manajemen Radioterapi":"Radiotherapy Management System","Aplikasi gagal dimuat":"Application failed to load","Muat ulang":"Reload","Coba lagi":"Try again","Masuk ulang":"Sign in again","Gagal memulai aplikasi":"Failed to start the application","Tidak dapat memuat data":"Unable to load data","Sistem belum siap":"System not ready","Masuk":"Sign in","Username":"Username","Password":"Password","Tampilkan password":"Show password","Sembunyikan password":"Hide password","Gunakan username dan password yang diberikan Super Admin.":"Use the username and password provided by the Super Admin.","Lupa password? Hubungi Super Admin.":"Forgot your password? Contact the Super Admin.","Memeriksa…":"Checking…","Anda telah keluar.":"You have signed out.","Carepath, jadwal radiasi, inventaris masker, dan laporan TAT dalam satu tempat.":"Carepath, radiation schedule, mask inventory and TAT reports in one place.","Isi username dan password.":"Enter your username and password.","Username atau password salah.":"Incorrect username or password.","Sesi berakhir. Silakan masuk kembali.":"Session expired. Please sign in again.","Server tidak merespons.":"Server is not responding.","Koneksi ke server gagal.":"Connection to the server failed.","Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit atau hubungi Super Admin.":"Too many failed attempts. Try again in 15 minutes or contact the Super Admin.","Akun Anda tidak aktif. Hubungi Super Admin.":"Your account is inactive. Contact the Super Admin.","Simpan":"Save","Batal":"Cancel","Tutup":"Close","Ubah":"Edit","Isi":"Fill in","Hapus":"Delete","Tambah":"Add","Kurangi":"Reduce","Reset":"Reset","Reset semua":"Reset all","Simpan perubahan":"Save changes","Ya, lanjutkan":"Yes, continue","Tersimpan":"Saved","Opsional":"Optional","opsional":"optional","Semua":"All","Aktif":"Active","Nonaktif":"Inactive","Selesai":"Completed","Terjadwal":"Scheduled","Ada":"There are","Status":"Status","Catatan":"Notes","Catatan (opsional)":"Notes (optional)","Tanggal":"Date","Jam":"Time","Jenis":"Type","Pasien":"Patient","Petugas":"Staff","Oleh":"By","Waktu":"Time","Total":"Total","Target":"Target","Lainnya":"Other","Hari":"Day","Minggu":"Week","Bulan":"Month","Hari ini":"Today","Sebelumnya":"Previous","Berikutnya":"Next","— pilih —":"— select —","— tidak ada —":"— none —","— pilih dokter —":"— select doctor —","— pilih pasien —":"— select patient —","— pilih provinsi —":"— select province —","Belum ada data.":"No data yet.","Belum diisi":"Not set","belum diisi":"not set","(belum diisi)":"(not set)","Belum pernah":"Never","Lihat semua":"View all","Hanya lihat":"View only","Tidak berwenang":"Not authorised","Tidak diizinkan":"Not allowed","Gagal menyimpan":"Save failed","Gagal memuat":"Load failed","Data diperbarui":"Data refreshed","baru saja":"just now","pasien":"patients","hari":"days","jadwal":"schedules","kategori":"categories","pcs":"pcs","Unduh":"Download","Berkas":"File","Menyinkron…":"Syncing…","Masih menyimpan data":"Still saving data","Tunggu hingga status \"Tersinkron\", lalu keluar.":"Wait until the status shows \"Synced\", then sign out.","Akses terbatas staf terdaftar":"Restricted to registered staff","Sistem":"System","Peran":"Role","Model":"Model","Wajib":"Required","Dokter":"Doctor","Radioterapis":"Radiation Therapist","Fisikawan Medis":"Medical Physicist","Fisikawan medis":"Medical physicist","Admin":"Admin","Super Admin":"Super Admin","Consult":"Consult","CT Planning":"CT Planning","Contouring":"Contouring","Planning":"Planning","Radiation":"Radiation","Rujuk Kembali":"Referral Back","Menunggu Dokter":"Waiting for Doctor","Menunggu Radioterapis":"Waiting for Radiation Therapist","Menunggu Fisikawan Medis":"Waiting for Medical Physicist","Oleh: Dokter":"By: Doctor","Oleh: Radioterapis":"By: Radiation Therapist","Oleh: Fisikawan Medis":"By: Medical Physicist","Seluruh tahap, akun pengguna & konfigurasi":"All stages, user accounts & configuration","Data Pasien & Kalender":"Patients & Calendar","Consult, Contouring, Approval, Rujuk Kembali (pasien sendiri)":"Consult, Contouring, Approval, Referral Back (own patients)","CT Planning, Radiation, inventaris":"CT Planning, Radiation, inventory","Pasien aktif":"Active patients","Pasien baru bulan ini":"New patients this month","Sedang radiasi":"On treatment","Rata-rata TAT":"Average TAT","Belum Rujuk Kembali":"Not yet referred back","Consult s/d Radiasi mulai":"Consult to start of radiation","Distribusi pasien per tahapan":"Patients by stage","Tahap carepath saat ini":"Current carepath stage","TOTAL AKTIF":"TOTAL ACTIVE","Pasien baru per bulan":"New patients per month","Tren pendaftaran 6 bulan terakhir":"Registrations over the last 6 months","Stok masker fiksasi":"Immobilisation mask stock","Kelola stok":"Manage stock","Pasien sedang radiasi":"Patients on treatment","Pasien & NRM":"Patient & MRN","Mulai":"Start","Fraksi":"Fractions","Aktivitas terbaru":"Recent activity","Belum ada aktivitas.":"No activity yet.","Belum ada pasien yang sedang radiasi.":"No patients currently on treatment.","Pasien Baru":"New Patient","PERHATIAN INVENTARIS:":"INVENTORY ALERT:","Stok menipis:":"Low stock:","Lihat Inventory":"View inventory","Belum ada jenis masker.":"No mask types yet.","dalam siklus radioterapi aktif.":"in an active radiotherapy cycle.","Tidak ada pasien yang menunggu giliran Anda.":"No patients are waiting for you.","Direktori klinis radioterapi":"Radiotherapy clinical directory","Diagnosa, kasus, preskripsi, teknik, dan tim yang menangani setiap pasien.":"Diagnosis, case, prescription, technique and care team for every patient.","Tambah Pasien":"Add Patient","Cari nama, NRM, atau diagnosa…":"Search name, MRN or diagnosis…","Cari pasien":"Search patients","Filter bertahap: pilihan di setiap langkah menyesuaikan hasil langkah sebelumnya. Angka dalam kurung = jumlah pasien.":"Cascading filters: each step narrows the results of the previous one. Numbers in brackets = patient count.","NRM":"MRN","Diagnosa & kasus":"Diagnosis & case","Preskripsi":"Prescription","Teknik":"Technique","Dokter onkologi":"Radiation oncologist","Kasus":"Case","Tipe pasien":"Patient type","Payer":"Payer","Selesai (rujuk kembali)":"Completed (referred back)","Unduh treatment summary (PDF)":"Download treatment summary (PDF)","Tidak ada pasien yang cocok dengan pencarian/filter.":"No patients match the search/filter.","Belum ada pasien.":"No patients yet.","Klik “Tambah Pasien” untuk memulai.":"Click “Add Patient” to get started.","Filter Kasus":"Filter case","Filter Teknik":"Filter technique","Filter Dokter onkologi":"Filter radiation oncologist","Filter Fisikawan medis":"Filter medical physicist","Filter Tipe pasien":"Filter patient type","Filter Payer":"Filter payer","Filter Status":"Filter status","Rawat jalan":"Outpatient","Rawat inap":"Inpatient","OPD · Rawat jalan":"OPD · Outpatient","IPD · Rawat inap":"IPD · Inpatient","Laki-laki":"Male","Perempuan":"Female","Asuransi Swasta":"Private insurance","Umum / Pribadi":"Self-pay","Perusahaan":"Company","Asuransi":"Insurance","Tambah Pasien Baru":"Add New Patient","Ubah Data Pasien":"Edit Patient Data","Registrasi identitas, rujukan, dan penjamin":"Identity, referral and payer registration","Simpan Data Pasien":"Save Patient","Isi otomatis dari stiker pasien":"Auto-fill from patient sticker","Tempel gambar (Ctrl+V), seret ke sini, atau pilih file/foto.":"Paste an image (Ctrl+V), drop it here, or choose a file/photo.","Pilih gambar":"Choose image","Pratinjau stiker pasien":"Patient sticker preview","Identitas pasien":"Patient identity","Nama lengkap pasien":"Patient full name","Jenis kelamin":"Sex","No. rekam medis (NRM)":"Medical record number (MRN)","Angka saja, tanpa nol di depan.":"Digits only, no leading zeros.","Tanggal lahir":"Date of birth","No. HP (WhatsApp)":"Mobile (WhatsApp)","Alamat domisili":"Address","Kecamatan":"District","Kota / Kabupaten":"City / Regency","Provinsi":"Province","Jalan / RT / RW (opsional)":"Street / RT / RW (optional)","mis. Jakarta Utara":"e.g. Jakarta Utara","mis. Jl. Boulevard Barat Blok LC-7 No. 12, RT 04/RW 09":"e.g. Jl. Boulevard Barat Blok LC-7 No. 12, RT 04/RW 09","Layanan & penjamin":"Service & payer","Payer (penjamin)":"Payer","mis. BPJS Kesehatan":"e.g. BPJS Kesehatan","Rujukan & dokter":"Referral & doctor","Dokter perujuk":"Referring doctor","Rumah sakit perujuk":"Referring hospital","Dokter onkologi radiasi (DPJP)":"Radiation oncologist (attending)","Belum ada pengguna berperan Dokter. Tambahkan di Kelola Users.":"No users with the Doctor role yet. Add one in Manage Users.","Membaca stiker…":"Reading sticker…","File harus berupa gambar (JPG/PNG/WebP).":"The file must be an image (JPG/PNG/WebP).","Tidak ada data yang terbaca. Coba gambar yang lebih jelas.":"Nothing could be read. Try a clearer image.","NRM wajib diisi dan harus mengandung angka.":"MRN is required and must contain digits.","Kecamatan wajib diisi.":"District is required.","Kota/Kabupaten wajib diisi.":"City/Regency is required.","Provinsi wajib diisi.":"Province is required.","Nama wajib diisi.":"Name is required.","Tanggal lahir wajib diisi.":"Date of birth is required.","Jenis kelamin wajib diisi.":"Sex is required.","No. HP wajib diisi.":"Mobile number is required.","Tipe pasien wajib diisi.":"Patient type is required.","Payer wajib diisi.":"Payer is required.","Dokter perujuk wajib diisi.":"Referring doctor is required.","RS perujuk wajib diisi.":"Referring hospital is required.","Dokter onkologi radiasi wajib diisi.":"Radiation oncologist is required.","Format tanggal lahir tidak valid.":"Invalid date of birth.","Tipe pasien harus OPD atau IPD.":"Patient type must be OPD or IPD.","Jenis kelamin harus Laki-laki atau Perempuan.":"Sex must be Male or Female.","Hanya Admin yang dapat menambah/mengubah Data Pasien.":"Only Admin can add or edit patient data.","Hanya Admin yang dapat mengubah Data Pasien.":"Only Admin can edit patient data.","Dokter onkologi radiasi harus dipilih dari daftar pengguna berperan Dokter (Kelola Users).":"The radiation oncologist must be chosen from users with the Doctor role (Manage Users).","NRM harus mengandung angka (nol di depan dibuang, mis. SHAG.0004598 menjadi 4598).":"MRN must contain digits (leading zeros removed, e.g. SHAG.0004598 becomes 4598).","Edit Data Pasien":"Edit Patient Data","Treatment Summary":"Treatment Summary","Ringkasan klinis & demografi":"Clinical & demographic summary","Identitas & kontak":"Identity & contact","Telepon / WA":"Phone / WhatsApp","Dokter, rujukan & penjamin":"Doctor, referral & payer","RS perujuk":"Referring hospital","CAREPATHWAY PASIEN":"PATIENT CAREPATHWAY","Alur perjalanan terapi radiasi":"Radiotherapy care pathway","Riwayat & status pelaksanaan tahapan":"Stage history & status","Terkunci":"Locked","Menunggu":"Waiting","Giliran sekarang":"Your turn now","Berjalan":"In progress","Menunggu approval dokter":"Awaiting doctor approval","Perlu revisi":"Revision needed","Perbarui Status Fraksi":"Update Fraction Status","Tanggal simulasi":"Simulation date","Masker utama":"Main mask","Masker 2":"Mask 2","Tanggal selesai":"Completion date","Jumlah fraksi penyinaran":"Number of treatment fractions","Nama target":"Target name","Dosis/fx":"Dose/fx","Dosis diterima (target 1)":"Dose received (target 1)","Catatan dokter":"Doctor's notes","Tanggal rujuk kembali":"Referral-back date","Catatan klinis":"Clinical notes","Diagnosa":"Diagnosis","Approval planning oleh dokter":"Planning approval by doctor","Disetujui":"Approved","Menunggu approval":"Awaiting approval","Minta revisi":"Request revision","Setujui planning":"Approve planning","Hasil planning (foto & video)":"Planning results (photos & videos)","Unggah foto/video":"Upload photo/video","Belum ada berkas hasil planning.":"No planning files yet.","Unggah tangkapan layar distribusi dosis, DVH, atau video plan untuk ditinjau dokter (maks 15 MB per berkas).":"Upload dose distribution screenshots, DVHs or plan videos for the doctor to review (max 15 MB per file).","MU referensi per lapangan":"Reference MU per field","Belum ada — diisi petugas saat verifikasi fraksi berikutnya":"None yet — entered by staff at the next fraction verification","Perubahan selama radiasi":"Changes during treatment","Catat perubahan":"Record change","Riwayat verifikasi fraksi":"Fraction verification history","Waktu selesai":"End time","Dosis harian":"Daily dose","Dosis kumulatif":"Cumulative dose","MU terdeliver":"Delivered MU","Input MU":"MU entered","Sesuai":"As planned","Parsial/Error":"Partial/Error","Alert fraksi untuk radioterapis":"Fraction alerts for radiation therapists","terlewati":"skipped","menunggu":"pending","Kembali ke Data Pasien":"Back to Patients","Kembali ke Carepath":"Back to Carepath","Kembali ke Kalender":"Back to Calendar","Kembali ke Dashboard":"Back to Dashboard","Kembali ke Report TAT":"Back to TAT Report","Pasien tidak ditemukan.":"Patient not found.","Selesai pasien":"Completed patient","Radiasi dihentikan":"Treatment stopped","MU referensi diisi ulang di fraksi berikutnya":"Reference MU re-entered at the next fraction","Pasien aktif (belum rujuk kembali)":"Active patients (not yet referred back)","Seluruh pasien yang masih berada dalam alur Consult hingga Rujuk Kembali.":"All patients still in the Consult to Referral Back pathway.","Filter tahap":"Filter stage","Semua dokter":"All doctors","Semua teknik":"All techniques","Semua kasus":"All cases","Filter dokter":"Filter doctor","Filter teknik":"Filter technique","Filter kasus":"Filter case","Tidak ada pasien aktif pada tahap/filter ini.":"No active patients at this stage/filter.","Planning perlu revisi":"Planning needs revision","Tanggal konsul":"Consultation date","Ketik untuk mencari; kasus baru otomatis masuk daftar.":"Type to search; new cases are added to the list automatically.","Diagnosa (opsional)":"Diagnosis (optional)","mis. Ca mammae dextra T2N1M0 / ICD-10 C50.9":"e.g. Ca mammae dextra T2N1M0 / ICD-10 C50.9","Catatan klinis dokter (opsional)":"Doctor's clinical notes (optional)","Masker":"Mask","Masker 2 (opsional)":"Mask 2 (optional)","Petugas radioterapis 1":"Radiation therapist 1","Petugas radioterapis 2":"Radiation therapist 2","Masker habis pakai berkurang saat disimpan. Alat pakai ulang (mis. Vacuum lock) baru terpakai saat radiasi dimulai dan kembali saat radiasi selesai.":"Single-use masks are deducted on save. Reusable devices (e.g. Vacuum lock) are only in use from the start to the end of treatment.","Tanggal selesai contouring":"Contouring completion date","Otomatis = fraksi target terbanyak. Untuk boost sekuensial, isi total fraksi.":"Defaults to the highest target fraction count. For a sequential boost, enter the total fractions.","Target & preskripsi":"Targets & prescription","— target 1 wajib, target 2–3 opsional. Total dosis terisi otomatis (fraksi × dosis/fx) dan dapat diubah.":"— target 1 required, targets 2–3 optional. Total dose fills automatically (fractions × dose/fx) and can be edited.","Dosis/fx (cGy)":"Dose/fx (cGy)","Total (cGy)":"Total (cGy)","mis. PTV 50":"e.g. PTV 50","Target 2 (opsional)":"Target 2 (optional)","Target 3 (opsional)":"Target 3 (optional)","Tanggal selesai planning":"Planning completion date","Tahap berikutnya sudah berjalan; tanggal tersimpan dipertahankan.":"The next stage has started; the saved date is kept.","Pilih foto/video":"Choose photos/videos","Diunggah otomatis saat Anda klik simpan, sebelum notifikasi WA dikirim ke dokter. Maks 15 MB per berkas.":"Uploaded automatically when you click save, before the WhatsApp notification is sent to the doctor. Max 15 MB per file.","Saat pasien akan menjalani fraksi yang ditentukan, seluruh radioterapis menerima WA berisi catatan ini (dikirim setelah fraksi sebelumnya diverifikasi; fraksi 1 saat radiasi dimulai).":"When the patient reaches the specified fraction, all radiation therapists receive a WhatsApp with this note (sent after the previous fraction is verified; fraction 1 when treatment starts).","Fraksi ke-":"Fraction no.","Catatan alert":"Alert note","Tambah alert":"Add alert","Hapus alert":"Remove alert","mis. 10":"e.g. 10","mis. CBCT verifikasi / foto port film / cek berat badan":"e.g. CBCT verification / port film / weight check","Menyimpan mengirim WA ke dokter untuk approval. Menyimpan ulang mengembalikan status ke “Menunggu approval”.":"Saving sends a WhatsApp to the doctor for approval. Saving again resets the status to “Awaiting approval”.","Radiasi sudah berjalan: perubahan planning sebaiknya juga dicatat lewat “Catat perubahan”.":"Treatment is under way: planning changes should also be recorded via “Record change”.","Tanggal mulai radiasi":"Treatment start date","Tanggal selesai (opsional)":"End date (optional)","Terisi otomatis saat fraksi terakhir diverifikasi.":"Filled automatically when the last fraction is verified.","Catatan dokter (opsional)":"Doctor's notes (optional)","mis. jadwal kontrol, rencana tindak lanjut":"e.g. follow-up schedule, further plans","Selesai & simpan":"Complete & save","WA ke dokter: giliran Contouring":"WhatsApp to doctor: contouring turn","WA ke dokter: approval planning":"WhatsApp to doctor: planning approval","Belum ada pengguna berperan Fisikawan Medis (Kelola Users).":"No users with the Medical Physicist role yet (Manage Users).","Belum ada pengguna berperan Radioterapis.":"No users with the Radiation Therapist role yet.","Tanggal wajib diisi.":"Date is required.","Kasus wajib diisi.":"Case is required.","Pilih masker.":"Choose a mask.","Pilih petugas radioterapis 1.":"Choose radiation therapist 1.","Petugas 1 dan 2 tidak boleh sama.":"Staff 1 and 2 must be different.","Petugas 1 dan 2 harus orang yang berbeda.":"Staff 1 and 2 must be different people.","Target 1 wajib diisi.":"Target 1 is required.","Jumlah fraksi penyinaran harus bilangan bulat.":"Number of fractions must be a whole number.","Pilih teknik.":"Choose a technique.","Pilih fisikawan medis.":"Choose a medical physicist.","Tanggal mulai wajib diisi.":"Start date is required.","Tanggal selesai tidak valid.":"Invalid end date.","Tahap terkunci":"Stage locked","Selesaikan tahap sebelumnya terlebih dahulu.":"Complete the previous stage first.","Planning sedang diminta revisi oleh dokter.":"The doctor has requested a planning revision.","Tanggal selesai tidak boleh lebih awal dari tanggal mulai.":"End date cannot be earlier than the start date.","Tanggal selesai tidak boleh dikosongkan karena pasien sudah Rujuk Kembali.":"End date cannot be cleared because the patient has been referred back.","Maksimal 10 alert":"Maximum 10 alerts","Alert: fraksi harus bilangan bulat ≥ 1.":"Alert: fraction must be a whole number ≥ 1.","Tahap tidak dikenal.":"Unknown stage.","Verifikasi fraksi radiasi":"Radiation fraction verification","Dosis hari ini (target 1)":"Today's dose (target 1)","Akumulasi setelah ini":"Cumulative after this","Checklist keselamatan & time-out":"Safety checklist & time-out","Identitas pasien & gelang NRM terverifikasi":"Patient identity & MRN wristband verified","Nama lengkap dan tanggal lahir dikonfirmasi ulang via 2 parameter.":"Full name and date of birth reconfirmed with 2 identifiers.","Fiksasi & posisi pasien sesuai preskripsi":"Immobilisation & patient position as prescribed","Masker/aksesori fiksasi terpasang presisi dengan tanda tattoo.":"Mask/immobilisation accessories fitted precisely to the tattoo marks.","Matching citra (IGRT) dalam toleransi":"Image matching (IGRT) within tolerance","Pergeseran couch sesuai batas yang ditetapkan, diverifikasi tim.":"Couch shifts within the set limits, verified by the team.","MU per lapangan radiasi":"MU per treatment field","Fraksi pertama":"First fraction","Isi ulang setelah perubahan planning/dosis":"Re-enter after planning/dose change","Tulis jumlah MU setiap lapangan yang disinar. Nilai ini menjadi acuan checklist pada fraksi berikutnya.":"Enter the MU for each treated field. These values become the checklist reference for later fractions.","Lapangan":"Field","Energi":"Energy","MU planning":"Planned MU","Tambah lapangan":"Add field","Hapus lapangan":"Remove field","mis. Arc 1 / G0":"e.g. Arc 1 / G0","Error / parsial treatment":"Error / partial treatment","Isi MU yang terdeliver bila penyinaran tidak lengkap.":"Enter the delivered MU if the treatment was incomplete.","MU per lapangan (acuan planning)":"MU per field (planning reference)","MU terdeliver sesuai planning":"Delivered MU as planned","Seluruh lapangan tersinar lengkap sesuai MU acuan di atas.":"All fields fully delivered according to the reference MU above.","Tulis MU yang sudah terdeliver dan MU yang seharusnya dideliver.":"Enter the delivered MU and the MU that should have been delivered.","MU seharusnya":"Expected MU","Tanggal & waktu selesai radiasi":"Treatment end date & time","Waktu penyinaran selesai; dipakai untuk report Radiation Time (cek-in → selesai).":"Time the beam finished; used for the Radiation Time report (check-in → end).","Catatan (wajib bila error/parsial)":"Notes (required if error/partial)","Reaksi pasien, penyebab interupsi, rencana kompensasi MU…":"Patient reaction, cause of interruption, MU compensation plan…","Perlu minimal 2 pengguna aktif berperan Radioterapis di Kelola Users.":"At least 2 active Radiation Therapist users are needed in Manage Users.","MU (terdeliver/seharusnya)":"MU (delivered/expected)","Seluruh checklist keselamatan harus dicentang.":"All safety checklist items must be ticked.","Isi MU minimal 1 lapangan radiasi.":"Enter MU for at least 1 treatment field.","Nama setiap lapangan wajib diisi.":"Each field name is required.","Tuliskan catatan penyebab error/parsial treatment.":"Describe the cause of the error/partial treatment.","Pilih 2 petugas radioterapis.":"Choose 2 radiation therapists.","Tanggal & waktu wajib diisi.":"Date & time are required.","Seluruh fraksi selesai":"All fractions completed","Seluruh fraksi sudah diverifikasi.":"All fractions have been verified.","Seluruh fraksi sudah selesai.":"All fractions are completed.","Tanggal selesai radiasi terisi otomatis. Tahap Rujuk Kembali kini terbuka.":"Treatment end date filled automatically. The Referral Back stage is now open.","Dicatat sebagai error/parsial — tampil sebagai catatan penting di fraksi berikutnya.":"Recorded as error/partial — shown as an important note at the next fraction.","Centang “MU terdeliver sesuai planning”, atau pilih Error/parsial bila ada perbedaan.":"Tick “Delivered MU as planned”, or choose Error/partial if there is a difference.","Centang \"MU sesuai planning\", atau pilih Error/Parsial bila ada perbedaan.":"Tick \"MU as planned\", or choose Error/Partial if there is a difference.","Tanggal & waktu selesai radiasi tidak valid.":"Invalid treatment end date & time.","Tanggal fraksi tidak boleh lebih awal dari tanggal mulai radiasi.":"The fraction date cannot be earlier than the treatment start date.","Maksimal 12 lapangan":"Maximum 12 fields","Hanya Radioterapis yang dapat memverifikasi fraksi.":"Only radiation therapists can verify fractions.","Tanggal mulai radiasi belum diisi.":"Treatment start date has not been set.","Pasien sudah Rujuk Kembali.":"The patient has been referred back.","Catat perubahan selama radiasi":"Record a change during treatment","Simpan catatan":"Save note","Diminta oleh (dokter)":"Requested by (doctor)","CT Evaluasi":"CT Evaluation","Perubahan Planning":"Planning Change","Perubahan Dosis":"Dose Change","Teknik baru (bila berubah)":"New technique (if changed)","MU acuan direset: petugas mengisi ulang MU per lapangan di fraksi berikutnya.":"Reference MU reset: staff re-enter the MU per field at the next fraction.","Jumlah fraksi baru":"New number of fractions","Dosis/fx baru (cGy)":"New dose/fx (cGy)","Total dosis baru (cGy)":"New total dose (cGy)","Catatan / alasan":"Note / reason","mis. penurunan berat badan, re-simulasi, respon tumor…":"e.g. weight loss, re-simulation, tumour response…","Catatan / alasan wajib diisi.":"Note / reason is required.","Pilih dokter yang meminta.":"Choose the requesting doctor.","Tanggal tidak boleh sebelum mulai radiasi.":"The date cannot be before the treatment start.","Jumlah fraksi baru harus bilangan bulat > 0.":"New number of fractions must be a whole number > 0.","Dosis/fx harus angka > 0.":"Dose/fx must be a number > 0.","Total dosis harus angka > 0.":"Total dose must be a number > 0.","Catatan tersimpan":"Note saved","Perubahan dosis hanya dapat dicatat oleh Dokter.":"Dose changes can only be recorded by a doctor.","Pencatatan perubahan hanya untuk pasien yang sedang menjalani radiasi.":"Changes can only be recorded for patients currently on treatment.","Minta revisi planning":"Request planning revision","Kirim permintaan revisi":"Send revision request","Catatan revisi untuk fisikawan":"Revision notes for the physicist","Tuliskan catatan revisi.":"Write the revision notes.","Revisi diminta":"Revision requested","Planning disetujui":"Planning approved","Fisikawan medis mendapat notifikasi.":"The medical physicist has been notified.","Tahap Radiation kini terbuka.":"The Radiation stage is now open.","Belum ada foto/video hasil planning yang diunggah. Anda tetap dapat menyetujui bila sudah meninjau di TPS.":"No planning photos/videos have been uploaded. You can still approve if you have reviewed it in the TPS.","Hapus berkas?":"Delete file?","Memuat berkas…":"Loading file…","Unggah gagal":"Upload failed","Format tidak didukung":"Unsupported format","Berkas terlalu besar":"File too large","Gagal membaca berkas.":"Could not read the file.","Gambar tidak valid.":"Invalid image.","Hanya Fisikawan Medis yang dapat mengunggah hasil planning.":"Only medical physicists can upload planning results.","Planning sudah disetujui; ubah planning terlebih dahulu bila perlu unggah ulang.":"Planning is already approved; edit the planning first if you need to re-upload.","Radiasi sudah dimulai; hasil planning tidak dapat ditambah lagi.":"Treatment has started; planning results can no longer be added.","Media planning yang sudah disetujui tidak dapat dihapus.":"Approved planning media cannot be deleted.","Tahap Contouring belum selesai.":"The Contouring stage is not complete.","Jadwal layanan radioterapi":"Radiotherapy service schedule","Radiasi reguler Senin–Jumat dibuat otomatis dari Radiasi Pertama. Radiasi Sabtu/Minggu ditambahkan manual.":"Regular Monday–Friday treatments are scheduled automatically from the First Radiation. Saturday/Sunday treatments are added manually.","Tambah Agenda":"Add Appointment","Radiasi":"Radiation","Radiasi Pertama":"First Radiation","Cek Lab":"Lab Check","Konsultasi":"Consultation","Semua agenda":"All appointments","Radiasi saja":"Radiation only","Filter jenis agenda":"Filter appointment type","Tidak ada agenda.":"No appointments.","otomatis":"automatic","Akhir pekan":"Weekend","Akhir pekan: radiasi reguler tidak dijadwalkan otomatis; tambahkan manual bila diperlukan.":"Weekend: regular treatments are not scheduled automatically; add them manually if needed.","Cek-in & detail agenda":"Check-in & appointment details","Pasien sudah cek-in":"Patient has checked in","Centang saat pasien hadir; tanggal & jam terisi otomatis sekarang.":"Tick when the patient arrives; the date & time fill in automatically.","Tanggal & jam cek-in":"Check-in date & time","Simpan cek-in":"Save check-in","Status agenda":"Appointment status","Detail pasien":"Patient details","Ubah agenda":"Edit appointment","Cek-in dicatat oleh Admin atau Radioterapis.":"Check-in is recorded by Admin or Radiation Therapists.","Agenda dibatalkan.":"Appointment cancelled.","Cek-in tercatat":"Check-in recorded","Cek-in dibatalkan":"Check-in removed","Waktu cek-in tidak boleh di masa depan.":"Check-in time cannot be in the future.","Tambah agenda":"Add appointment","Jenis agenda":"Appointment type","CT Planning, Cek Lab, Konsultasi, Radiasi":"CT Planning, Lab Check, Consultation, Radiation","Agenda dibuat otomatis — mengubah tanggal menjadikannya agenda manual":"Automatic appointment — changing the date turns it into a manual appointment","Pilih pasien.":"Choose a patient.","Agenda diperbarui":"Appointment updated","Agenda ditambahkan":"Appointment added","Batalkan agenda":"Cancel appointment","Alasan pembatalan":"Reason for cancellation","Alasan pembatalan wajib diisi.":"Reason for cancellation is required.","mis. pasien demam, mesin maintenance, keluarga berhalangan…":"e.g. patient has fever, machine maintenance, family unavailable…","Pasien berhalangan hadir. Satu jadwal radiasi pengganti otomatis ditambahkan pada hari kerja setelah jadwal terakhir.":"The patient cannot attend. One replacement treatment is added automatically on the working day after the last scheduled session.","Agenda ditandai batal dan tetap tercatat.":"The appointment is marked as cancelled and kept on record.","Agenda dibatalkan":"Appointment cancelled","Jadwal pengganti ditambahkan di akhir.":"Replacement session added at the end.","Hapus agenda?":"Delete appointment?","Hapus agenda":"Delete appointment","Agenda akan dihapus permanen.":"The appointment will be deleted permanently.","Agenda Radiasi Pertama beserta seluruh jadwal radiasi otomatis yang belum terlaksana akan dihapus.":"The First Radiation appointment and all pending automatic treatment sessions will be deleted.","Jumlah jadwal radiasi dijaga sama dengan jumlah fraksi, sehingga 1 jadwal pengganti ditambahkan di akhir. Untuk mengurangi jumlah fraksi, catat Perubahan Dosis di detail pasien.":"The number of treatment sessions is kept equal to the number of fractions, so 1 replacement session is added at the end. To reduce the fractions, record a Dose Change in the patient details.","Pasien belum punya agenda Radiasi Pertama; sebaiknya buat Radiasi Pertama agar jadwal lanjutan dibuat otomatis.":"The patient has no First Radiation appointment; create one so later sessions are scheduled automatically.","Jumlah fraksi belum diketahui (Contouring belum diisi). Jadwal lanjutan dibuat otomatis setelah Contouring disimpan.":"Number of fractions unknown (Contouring not filled in). Later sessions are scheduled automatically once Contouring is saved.","Pasien ini sudah memiliki Radiasi Pertama. Ubah agenda tersebut bila tanggal berganti.":"This patient already has a First Radiation appointment. Edit that appointment if the date changes.","(pasien tidak ditemukan)":"(patient not found)","Hanya Admin atau Radioterapis yang dapat mencatat cek-in.":"Only Admin or Radiation Therapists can record check-ins.","Hanya Admin atau Radioterapis yang dapat membatalkan agenda.":"Only Admin or Radiation Therapists can cancel appointments.","Hanya Admin yang dapat menambah atau mengubah agenda.":"Only Admin can add or edit appointments.","Hanya Admin yang dapat menghapus agenda.":"Only Admin can delete appointments.","Hanya agenda berstatus Terjadwal yang dapat dibatalkan.":"Only scheduled appointments can be cancelled.","Agenda tidak ditemukan.":"Appointment not found.","Terhubung CT Planning":"Linked to CT Planning","Inventory Masker Fiksasi":"Immobilisation Mask Inventory","Stok berkurang otomatis saat CT Planning disimpan; setiap perubahan tercatat.":"Stock is deducted automatically when CT Planning is saved; every change is logged.","Tambah Jenis":"Add Type","Stok Opname":"Stock Take","Stok fisik":"Physical stock","Log pemakaian & mutasi":"Usage & movement log","Total masker":"Total masks","Semua jenis aktif":"All active types","Perlu re-order":"Needs re-order","Stok ≤ ambang minimum":"Stock ≤ minimum threshold","Integrasi CT Sim":"CT Sim integration","Auto":"Auto","Stok terpotong saat CT Planning":"Stock deducted at CT Planning","Jenis aktif":"Active types","Kelola via Tambah Jenis":"Manage via Add Type","Lokasi belum diisi":"Location not set","Pakai ulang":"Reusable","KETERSEDIAAN":"AVAILABILITY","Ambang kritis":"Critical threshold","Rasio kapasitas rak":"Shelf capacity ratio","Terakhir dipakai:":"Last used:","Sedang dipakai radiasi:":"In use for treatment:","Aman":"OK","Menipis":"Low","Habis":"Out of stock","Perubahan":"Change","Stok akhir":"Final stock","Alasan":"Reason","Belum ada mutasi stok.":"No stock movements yet.","Stok opname":"Stock take","Masukkan jumlah fisik hasil hitung; selisih dicatat di log.":"Enter the physical count; differences are logged.","Fisik":"Physical","Simpan hasil opname":"Save stock take","Tidak ada selisih":"No differences","Stok sistem sesuai hitungan fisik.":"System stock matches the physical count.","Opname tersimpan":"Stock take saved","Tambah jenis masker":"Add mask type","Daftarkan alat fiksasi baru ke inventaris":"Register a new immobilisation device in the inventory","Nama jenis":"Type name","Stok awal":"Initial stock","Ambang minimum":"Minimum threshold","Lokasi rak":"Shelf location","Alat pakai ulang":"Reusable device","Stok hanya berkurang selama pasien menjalani radiasi dan kembali saat radiasi selesai (mis. Vacuum lock).":"Stock is only reduced while a patient is on treatment and returns when treatment ends (e.g. Vacuum lock).","Nama jenis wajib diisi.":"Type name is required.","Jenis ditambahkan":"Type added","Stok tidak boleh negatif":"Stock cannot be negative","Penyesuaian manual":"Manual adjustment","Dipakai CT Planning":"Used at CT Planning","Koreksi pilihan masker CT Planning":"CT Planning mask correction","Dipakai selama radiasi (pakai ulang)":"In use during treatment (reusable)","Kembali setelah radiasi selesai":"Returned after treatment","Efisiensi klinis & operasional":"Clinical & operational efficiency","Report Turn Around Time (TAT)":"Turn Around Time (TAT) Report","Latensi antar-tahapan dari konsultasi hingga radiasi pertama.":"Latency between stages from consultation to first treatment.","Export CSV":"Export CSV","Dari (tgl Consult)":"From (Consult date)","Sampai":"To","Bottleneck":"Bottleneck","Target RS:":"Hospital target:","Rata-rata TAT per tahap (hari)":"Average TAT per stage (days)","Realisasi vs target RS":"Actual vs hospital target","Tren durasi total s/d radiasi":"Total time to treatment trend","Seluruh tahap berada dalam target operasional.":"All stages are within operational targets.","Belum ada data TAT pada filter ini.":"No TAT data for this filter.","Daftar pasien & penguraian latensi":"Patient list & latency breakdown","Sel kuning = melampaui target tahap":"Yellow cell = exceeds stage target","Belum ada data pada filter ini.":"No data for this filter.","Kepatuhan TAT bulanan":"Monthly TAT compliance","Target tercapai":"Target met","Di bawah target":"Below target","Jumlah pasien per bulan":"Patients per month","Berdasarkan bulan Consult (atau tanggal registrasi bila belum Consult)":"By Consult month (or registration date if not yet consulted)","Profil pasien":"Patient profile","Teknik radiasi":"Treatment technique","Dokter onkologi radiasi":"Radiation oncologist","Provinsi pasien":"Patient province","Kota / kabupaten pasien":"Patient city / regency","Kecamatan pasien":"Patient district","Realisasi":"Actual","Target maks":"Max target","Rata-rata (hari)":"Average (days)","Pasien baru":"New patients","Tidak ada pasien":"No patients","Tidak ada sesi":"No sessions","% sesi":"% sessions","menit":"min","sesi":"sessions","Export dibuat":"Export created","Export gagal":"Export failed","Browser memblokir unduhan di dalam bingkai ini.":"The browser blocked the download inside this frame.","TAT Radiation Time < 30 menit":"TAT Radiation Time < 30 min","% sesi radiasi dari cek-in (Kalender) sampai selesai radiasi (verifikasi fraksi) · target 90% sesi":"% of sessions from check-in (Calendar) to treatment end (fraction verification) · target 90% of sessions","Grafik tidak dapat dimuat":"Charts could not be loaded","Periksa koneksi internet. Fitur lain tetap berfungsi.":"Check your internet connection. Other features still work.","Menyiapkan treatment summary…":"Preparing treatment summary…","Gagal membuat treatment summary":"Failed to create treatment summary","Bila unduhan tidak otomatis berjalan, gunakan tombol berikut.":"If the download does not start automatically, use this button.","Unduh PDF":"Download PDF","Grafik TAT per tahap":"TAT per stage chart","Grafik tren durasi total":"Total duration trend chart","Grafik jumlah pasien per bulan":"Patients per month chart","Grafik radiation time per bulan":"Radiation time per month chart","Grafik donat distribusi tahap":"Stage distribution donut chart","Grafik batang pasien baru per bulan":"New patients per month bar chart","Keamanan & otoritas medis · RBAC":"Security & clinical authority · RBAC","Manajemen Pengguna & Hak Akses":"User & Access Management","Pemisahan tugas klinis antara Dokter, Radioterapis, Fisikawan Medis, dan Admin.":"Separation of clinical duties between Doctors, Radiation Therapists, Medical Physicists and Admin.","Tambah Pengguna":"Add User","Pengguna":"Users","Pengaturan":"Settings","Daftar akun pengguna":"User accounts","Masuk dengan username & password · akun nonaktif tidak dapat masuk":"Sign in with username & password · inactive accounts cannot sign in","No. HP":"Mobile","Hak ubah":"Permissions","Login terakhir":"Last sign-in","Password belum diatur":"Password not set","Belum ada pengguna.":"No users yet.","Tambah pengguna":"Add user","Ubah pengguna":"Edit user","Kosongkan password bila tidak diganti":"Leave the password blank to keep it","Username & password dipakai untuk masuk aplikasi":"Username & password are used to sign in","Nama (beserta gelar)":"Name (with titles)","mis. dr. Mima Primasari, Sp.Onk.Rad":"e.g. dr. Mima Primasari, Sp.Onk.Rad","Jabatan":"Position","Akun login":"Login account","Huruf kecil, angka, titik, garis bawah, atau strip (3–30 karakter, tanpa spasi).":"Lowercase letters, digits, dots, underscores or hyphens (3–30 characters, no spaces).","Huruf kecil, angka, titik, garis bawah, atau strip (3–30 karakter, tanpa spasi). Bila diganti, pengguna ini masuk dengan username baru.":"Lowercase letters, digits, dots, underscores or hyphens (3–30 characters, no spaces). If changed, this user signs in with the new username.","Password baru (opsional)":"New password (optional)","Kosongkan bila tidak diganti":"Leave blank to keep","Minimal 6 karakter":"At least 6 characters","Ulangi password":"Repeat password","Nomor HP tidak valid (contoh: 081234567890).":"Invalid mobile number (e.g. 081234567890).","Username 3–30 karakter: huruf kecil, angka, titik, garis bawah, atau strip.":"Username 3–30 characters: lowercase letters, digits, dots, underscores or hyphens.","Password wajib diisi.":"Password is required.","Password minimal 6 karakter.":"Password must be at least 6 characters.","Ulangi password tidak sama.":"Passwords do not match.","Anda tidak dapat mencabut peran Super Admin dari akun sendiri.":"You cannot remove the Super Admin role from your own account.","Anda tidak dapat menonaktifkan akun sendiri.":"You cannot deactivate your own account.","Harus tersisa minimal satu Super Admin aktif.":"At least one active Super Admin must remain.","Hanya Super Admin yang dapat mengelola pengguna.":"Only the Super Admin can manage users.","Target TAT (hari)":"TAT targets (days)","Consult → CT Plan":"Consult → CT Plan","CT Plan → Contour":"CT Plan → Contour","Contour → Planning":"Contour → Planning","Planning → Rad #1":"Planning → Rad #1","Total s/d radiasi":"Total to treatment","Notifikasi WhatsApp dokter (MPWA)":"Doctor WhatsApp notifications (MPWA)","Pesan otomatis dikirim ke":"Automatic messages are sent to the","WA pribadi dokter onkologi":"radiation oncologist's personal WhatsApp","masing-masing pasien (No. HP di daftar pengguna) saat:":"of each patient (mobile number in the user list) when:","giliran Contouring":"it is their turn for Contouring","(CT Planning selesai) dan":"(CT Planning completed) and","planning menunggu approval":"planning awaits approval","URL server MPWA":"MPWA server URL","Path endpoint":"Endpoint path","Sender (nomor pengirim)":"Sender (sending number)","API key":"API key","tersimpan":"saved","Demi keamanan, API key yang tersimpan tidak ditampilkan lagi (kolom tetap kosong). Isi hanya bila ingin mengganti.":"For security, the saved API key is not shown again (the field stays empty). Fill it in only to replace it.","•••••• tersimpan (kosongkan jika tidak diubah)":"•••••• saved (leave blank to keep)","Baca stiker: AI (opsional)":"Sticker reading: AI (optional)","API key Anthropic":"Anthropic API key","Kosong = pakai OCR Google Drive (gratis)":"Empty = use Google Drive OCR (free)","Bawaan: OCR Google Drive, gratis, data tetap di Google. Jika diisi, stiker dikirim ke Anthropic (berbayar, lebih akurat); pastikan sudah disetujui kebijakan privasi RS.":"Default: Google Drive OCR, free, data stays in Google. If filled in, stickers are sent to Anthropic (paid, more accurate); make sure this is approved under the hospital privacy policy.","Simpan pengaturan":"Save settings","Kirim tes WhatsApp":"Send test WhatsApp","Pengaturan tersimpan":"Settings saved","Pengaturan GAGAL disimpan":"Settings were NOT saved","Target tidak valid":"Invalid target","Target TAT harus angka lebih dari 0.":"TAT targets must be numbers greater than 0.","Mengirim tes…":"Sending test…","Menghubungi server WhatsApp":"Contacting the WhatsApp server","Tes berhasil":"Test succeeded","Tes gagal":"Test failed","Pesan terkirim ke No. HP akun Anda.":"Message sent to your account mobile number.","WhatsApp nonaktif atau API key belum diisi.":"WhatsApp is inactive or the API key is missing.","Pengiriman gagal. Lihat Log Aktivitas (Aksi: WA Gagal).":"Sending failed. See the Activity Log (Action: WA Gagal).","Isi dulu No. HP akun Anda di Kelola Users — pesan tes dikirim ke nomor tersebut.":"First fill in your account mobile number in Manage Users — the test message is sent to it.","WA ke dokter gagal terkirim":"WhatsApp to doctor failed","Data tersimpan. Periksa No. HP dokter di Kelola Users / Log Aktivitas.":"Data saved. Check the doctor's mobile number in Manage Users / Activity Log.","Status aktif":"Active status","Keluar dari aplikasi":"Sign out of the application","Ganti password":"Change password","Password lama":"Current password","Password baru":"New password","Ulangi password baru":"Repeat new password","Simpan password baru":"Save new password","Isi password lama.":"Enter your current password.","Password baru minimal 6 karakter.":"The new password must be at least 6 characters.","Ulangi password baru tidak sama.":"The new passwords do not match.","Password diganti":"Password changed","Gunakan password baru saat masuk berikutnya.":"Use the new password next time you sign in.","Password lama salah.":"Current password is incorrect.","Password baru harus berbeda dari password lama.":"The new password must differ from the current one.","Isi Tahap":"Stage filled","Ubah Tahap":"Stage edited","Ubah Pasien":"Patient edited","Verifikasi Fraksi":"Fraction verified","Adjust Stok":"Stock adjusted","WA Gagal":"WhatsApp failed","Approve Planning":"Planning approved","Revisi Planning":"Planning revision","Unggah Media Planning":"Planning media uploaded","Hapus Media Planning":"Planning media deleted","Ubah Agenda":"Appointment edited","Hapus Agenda":"Appointment deleted","Batal Agenda":"Appointment cancelled","Cek-in Pasien":"Patient check-in","Batal Cek-in":"Check-in removed","Alert Fraksi":"Fraction alert","Unduh Treatment Summary":"Treatment summary downloaded","Baca Stiker":"Sticker read","Ganti Password":"Password changed","Ubah Pengguna":"User edited","Ubah Pengguna & Password":"User & password edited","Ubah Pengaturan":"Settings changed","Tambah Jenis Masker":"Mask type added","Catat CT Evaluasi":"CT Evaluation recorded","Catat Perubahan Planning":"Planning change recorded","Catat Perubahan Dosis":"Dose change recorded","Catat Lainnya":"Other change recorded","sistem":"system","Pasien tidak ditemukan":"Patient not found","Data pasien tidak ditemukan.":"Patient data not found.","Sistem sedang sibuk, coba lagi sesaat lagi.":"The system is busy, please try again shortly.","Fungsi tidak dikenal.":"Unknown function.","Hanya Radioterapis yang dapat menyesuaikan stok.":"Only radiation therapists can adjust stock.","Hanya Radioterapis yang dapat melakukan stok opname.":"Only radiation therapists can do a stock take.","Hanya Radioterapis yang dapat menambah jenis masker.":"Only radiation therapists can add mask types.","Hanya Super Admin yang dapat mengubah pengaturan.":"Only the Super Admin can change settings.","Hanya Dokter yang dapat memberi approval planning.":"Only doctors can approve planning.","Tuliskan catatan revisi untuk fisikawan medis.":"Write revision notes for the medical physicist.","Planning belum diisi fisikawan medis.":"Planning has not been filled in by the medical physicist.","Peran Anda tidak dapat mencatat perubahan.":"Your role cannot record changes.","Pilih dokter yang meminta dari daftar dokter.":"Choose the requesting doctor from the doctor list.","Teknik harus salah satu dari 3D, IMRT, VMAT.":"Technique must be one of 3D, IMRT, VMAT.","Fisikawan medis harus dipilih dari daftar pengguna berperan Fisikawan Medis.":"The medical physicist must be chosen from users with the Medical Physicist role.","Petugas radioterapis 1 wajib dipilih.":"Radiation therapist 1 is required.","Petugas 1 dan 2 tidak boleh orang yang sama.":"Staff 1 and 2 must not be the same person.","Tanggal & jam cek-in tidak valid.":"Invalid check-in date & time.","Agenda sudah dibatalkan.":"The appointment has already been cancelled.","Tanggal agenda wajib diisi.":"Appointment date is required.","Format jam tidak valid.":"Invalid time format.","Jenis agenda tidak valid.":"Invalid appointment type.","Pilih pasien untuk agenda ini.":"Choose a patient for this appointment.","Ukuran berkas maksimal 15 MB. Kompres atau potong video terlebih dahulu.":"Maximum file size is 15 MB. Compress or trim the video first.","Format harus JPG, PNG, WebP, MP4, WebM, atau MOV.":"Format must be JPG, PNG, WebP, MP4, WebM or MOV.","Berkas kosong.":"The file is empty.","Media tidak ditemukan.":"Media not found.","Hanya Fisikawan Medis yang dapat menghapus media.":"Only medical physicists can delete media.","Stok tidak boleh negatif.":"Stock cannot be negative.","Perubahan stok tidak valid.":"Invalid stock change.","Jenis masker tidak ditemukan.":"Mask type not found.","Status approval tidak valid.":"Invalid approval status.","Jenis perubahan tidak valid.":"Invalid change type.","Teknik tidak valid.":"Invalid technique.","Peran tidak valid.":"Invalid role.","Password wajib diisi untuk pengguna baru.":"A password is required for new users.","Hanya Super Admin.":"Super Admin only.","Nomor WhatsApp tujuan tidak valid/kosong.":"Destination WhatsApp number is invalid/empty.","Format gambar harus JPG, PNG, atau WebP.":"Image format must be JPG, PNG or WebP.","Gambar kosong atau terlalu besar (maks ±4 MB).":"Image is empty or too large (max ±4 MB).","Hanya Admin yang dapat memakai fitur baca stiker.":"Only Admin can use sticker reading.","Stiker tidak terbaca. Coba foto yang lebih jelas dan lurus.":"The sticker could not be read. Try a clearer, straighter photo.","Hasil bacaan tidak valid. Coba ulangi dengan gambar yang lebih jelas.":"Invalid reading. Try again with a clearer image.","Tanggal lahir tidak terbaca, isi manual.":"Date of birth could not be read; enter it manually.","NRM tidak mengandung angka.":"MRN contains no digits.","Tahap":"Stage","· Sedang dipakai radiasi:":"· In use for treatment:","CT Planning → Radiasi":"CT Planning → Radiation","Consult → CT Planning":"Consult → CT Planning","Ubah bila ada kesalahan tanggal.":"Change it if the date is wrong.","Terisi otomatis dengan tanggal hari ini saat Anda klik Selesai; ubah bila perlu.":"Filled with today's date when you click Complete; change if needed.","Bahasa / Language":"Language / Bahasa","Dibatalkan":"Cancelled","Pilih energi":"Choose energy","kota belum diisi":"city not set","provinsi belum diisi":"province not set","kecamatan belum diisi":"district not set","belum Consult":"not yet consulted","belum Planning":"not yet planned","Sen":"Mon","Sel":"Tue","Rab":"Wed","Kam":"Thu","Jum":"Fri","Sab":"Sat","Min":"Sun","No. HP pada stiker terbaca menyambung dengan angka lain; periksa kembali nomornya.":"The mobile number on the sticker ran into other digits; please double-check it.","No. HP tidak terbaca dengan jelas, isi manual.":"The mobile number could not be read clearly; enter it manually.","Ketik diagnosa atau kode ICD-10 — mis. payudara, nasofaring, C50":"Type a diagnosis or ICD-10 code — e.g. breast, nasopharynx, C50","Pilih dari daftar ICD-10, lalu lengkapi bila perlu (mis. dextra, T2N1M0).":"Choose from the ICD-10 list, then complete it if needed (e.g. right, T2N1M0).","CT Simulasi":"CT Planning","Delineasi":"Contouring","Perencanaan":"Planning","Alur Layanan":"Clinical Pathway","Laporan":"Report","Konsultasi s/d Radiasi mulai":"Consultation to start of radiation","ALUR LAYANAN PASIEN":"PATIENT CLINICAL PATHWAY","Seluruh pasien yang masih berada dalam alur Konsultasi hingga Rujuk Kembali.":"All patients still in the Consultation to Referral Back pathway.","Perencanaan perlu revisi":"Planning needs revision","Terhubung CT Simulasi":"Linked to CT Planning","Stok berkurang otomatis saat CT Simulasi disimpan; setiap perubahan tercatat.":"Stock is deducted automatically when CT Planning is saved; every change is logged.","Stok terpotong saat CT Simulasi":"Stock deducted at CT Planning","Konsultasi → CT Simulasi":"Consultation → CT Planning","Konsul → CT Sim":"Consult → CT","CT Simulasi → Delineasi":"CT Planning → Contouring","CT Sim → Delineasi":"CT → Contour","Delineasi → Perencanaan":"Contouring → Planning","Delineasi → Rencana":"Contour → Plan","Perencanaan → Radiasi #1":"Planning → Rad #1","Rencana → Rad #1":"Plan → Rad","Dari (tgl Konsultasi)":"From (Consultation date)","Konsultasi, Delineasi, Persetujuan perencanaan, Rujuk Kembali (pasien sendiri)":"Consultation, Contouring, Planning approval, Referral Back (own patients)","CT Simulasi, Radiasi, inventaris":"CT Planning, Radiation, inventory","giliran Delineasi":"it is their turn for Contouring","(CT Simulasi selesai) dan":"(CT Planning completed) and","Dipakai CT Simulasi":"Used at CT Planning","Koreksi pilihan masker CT Simulasi":"CT Planning mask correction","WA ke dokter: giliran Delineasi":"WhatsApp to doctor: contouring turn","WA ke dokter: persetujuan perencanaan":"WhatsApp to doctor: planning approval","Perencanaan sedang diminta revisi oleh dokter.":"The doctor has requested a planning revision.","Perencanaan disetujui":"Planning approved","Tahap Radiasi kini terbuka.":"The Radiation stage is now open.","Jumlah fraksi belum diketahui (Delineasi belum diisi). Jadwal lanjutan dibuat otomatis setelah Delineasi disimpan.":"Number of fractions unknown (Contouring not filled in). Later sessions are scheduled automatically once Contouring is saved.","CT Simulasi → Radiasi":"CT Planning → Radiation","Berdasarkan bulan Konsultasi (atau tanggal registrasi bila belum Konsultasi)":"By Consultation month (or registration date if not yet consulted)","Alur layanan, jadwal radiasi, inventaris masker, dan laporan TAT dalam satu tempat.":"Clinical pathway, radiation schedule, mask inventory and TAT reports in one place.","Diagnosa wajib diisi.":"Diagnosis is required.","Kembali ke Alur Layanan":"Back to Clinical Pathway","Kembali ke Laporan":"Back to Report","Tahap Delineasi belum selesai.":"The Contouring stage is not complete.","Perencanaan belum diisi fisikawan medis.":"Planning has not been filled in by the medical physicist.","belum Konsultasi":"not yet consulted","belum Perencanaan":"not yet planned","CT Simulasi, Cek Lab, Konsultasi, Radiasi":"CT Planning, Lab Check, Consultation, Radiation","Persediaan":"Inventory","Rekam Pasien Radioterapi":"Radiotherapy Patient Records","Telusuri identitas, diagnosis, preskripsi, dan tim klinis setiap pasien dalam satu tampilan.":"Browse each patient's identity, diagnosis, prescription and clinical team in one view.","Pasien dalam Perawatan Aktif":"Patients in Active Care","Pantau posisi setiap pasien dari konsultasi hingga rujuk kembali, beserta tahap yang sedang menunggu tindakan.":"Track where every patient is, from consultation to referral back, and which stage awaits action.","Alat Fiksasi Pasien":"Patient Immobilisation Devices","Persediaan Masker Fiksasi":"Immobilisation Mask Inventory","Kinerja Klinis & Operasional":"Clinical & Operational Performance","Laporan Turn Around Time (TAT)":"Turn Around Time (TAT) Report","Ukur kecepatan layanan antartahap, dari konsultasi hingga radiasi pertama, terhadap target rumah sakit.":"Measure turnaround between stages, from consultation to first treatment, against hospital targets.","Keamanan & Hak Akses":"Security & Access","Manajemen Pengguna":"User Management","Atur akun, peran, dan kewenangan klinis Dokter, Radioterapis, Fisikawan Medis, serta Admin.":"Manage accounts, roles and clinical permissions for Doctors, Radiation Therapists, Medical Physicists and Admin.","Penjadwalan Layanan":"Service Scheduling","Kembali ke Persediaan":"Back to Inventory","Kelola agenda harian, mingguan, dan bulanan pasien dalam satu tampilan.":"Manage patients' daily, weekly and monthly appointments in one view.","Pantau persediaan masker fiksasi dan atur sesuai kondisi stok fisik di Rumah Sakit.":"Monitor immobilisation mask stock and adjust it to match the hospital's physical stock.","Habis pakai":"Single-use","Ambang minimal":"Minimum threshold","Atur":"Set","Ambang minimal stok":"Minimum stock threshold","Ambang minimal (pcs)":"Minimum threshold (pcs)","Simpan ambang":"Save threshold","Status menjadi “Menipis” bila stok sama dengan atau di bawah angka ini, dan “Habis” bila stok 0.":"Status becomes “Low” when stock is at or below this number, and “Out of stock” at 0.","Ambang minimal harus bilangan bulat ≥ 0.":"The minimum threshold must be a whole number ≥ 0.","Ambang disimpan":"Threshold saved","Ubah Ambang Stok":"Stock threshold changed","Hanya Radioterapis yang dapat mengatur ambang stok.":"Only radiation therapists can set stock thresholds.","TERSEDIA":"AVAILABLE","MINIMAL":"MINIMUM","Atur ambang minimal":"Set minimum threshold","Mode demo":"Demo mode","Mode demo: aktif":"Demo mode: on","Mode demo aktif":"Demo mode on","Mode demo nonaktif":"Demo mode off","Data pasien kembali ditampilkan lengkap.":"Patient data is shown in full again.","Nonaktifkan mode demo untuk mengubah data pasien.":"Turn off demo mode to edit patient data.","Sembunyikan data pasien untuk rekaman/demo":"Hide patient data for recording/demo","Mode gelap / terang":"Dark / light mode","Nama pasien, No. RM, No. HP, dokter perujuk, dan RS perujuk disamarkan di layar.":"Patient names, MRNs, mobile numbers, referring doctors and referring hospitals are masked on screen.","KONS":"CONS","LAIN":"OTH","Keterangan warna agenda":"Appointment colour legend","Tahap alur layanan saat ini":"Current clinical pathway stage"};
const RX = [
  [/^Selamat (Pagi|Siang|Sore|Malam), (.+)$/, (m, a, b) => ({ Pagi: 'Good morning', Siang: 'Good afternoon', Sore: 'Good afternoon', Malam: 'Good evening' })[a] + ', ' + b],
  [/^Sistem berjalan normal • WA (aktif|nonaktif)$/, (m, a) => 'System running normally • WA ' + (a === 'aktif' ? 'active' : 'inactive')],
  [/^Ada$/, 'There are'],
  [/^(\d+) pasien$/, '$1 patients'], [/^(\d+) pasien sesuai filter$/, '$1 patients matching the filter'], [/^· (\d+) pasien sesuai filter$/, '· $1 patients matching the filter'],
  [/^(\d+) menunggu giliran (.+) untuk diisi\.$/, (m, n, r) => n + ' waiting for ' + tx(r) + ' to fill in.'], [/^menunggu giliran (.+) untuk diisi\.$/, (m, r) => 'waiting for ' + tx(r) + ' to fill in.'],
  [/^(\d+) hari$/, '$1 days'], [/^(\d+(?:\.\d+)?) hari$/, '$1 days'], [/^([+-]?\d+(?:\.\d+)?) hr$/, '$1 d'], [/^(\d+) tahun$/, '$1 years'], [/^(\d+) th$/, '$1 y'], [/^(\d+) fraksi$/, '$1 fractions'],
  [/^(\d+) jenis$/, '$1 types'], [/^(\d+) user$/, '$1 users'], [/^(\d+) berkas$/, '$1 files'], [/^(\d+) berkas tersimpan$/, '$1 files saved'], [/^(\d+) catatan$/, '$1 notes'], [/^(\d+) aktif$/, '$1 active'],
  [/^(\d+) agenda$/, '$1 appointments'], [/^(\d+) hari di tahap ini$/, '$1 days at this stage'], [/^(\d+)% dari aktif$/, '$1% of active'], [/^Rata-rata (\d+(?:\.\d+)?|–)\/bln$/, 'Average $1/mo'],
  [/^Rata-rata (\d+(?:\.\d+)?)\/bulan$/, 'Average $1/month'], [/^Masker tipis: (\d+) item$/, 'Low masks: $1 items'], [/^(\d+) baris diekspor\.$/, '$1 rows exported.'],
  [/^Menampilkan (\d+) dari (\d+) pasien$/, 'Showing $1 of $2 patients'], [/^Menampilkan (\d+) dari (\d+)$/, 'Showing $1 of $2'], [/^Semua \((\d+)\)$/, 'All ($1)'], [/^Aktif \((\d+)\)$/, 'Active ($1)'],
  [/^Selesai \(rujuk kembali\) \((\d+)\)$/, 'Completed (referred back) ($1)'], [/^\(belum diisi\) \((\d+)\)$/, '(not set) ($1)'], [/^(\d+)\. (.+)$/, (m, n, r) => n + '. ' + tx(r)],
  [/^(\d+) mnt lalu$/, '$1 min ago'], [/^(\d+) jam lalu$/, '$1 h ago'], [/^(\d+) hari lalu$/, '$1 d ago'],
  [/^Tahap (\d+): (.+)$/, (m, n, r) => 'Stage ' + n + ': ' + tx(r)], [/^Tahap (I|II|III|IV)$/, 'Stage $1'], [/^Tahap (\d+)$/, 'Stage $1'], [/^Menunggu tahap (.+) selesai\.$/, (m, r) => 'Waiting for ' + tx(r) + ' to finish.'],
  [/^Menunggu (.+)$/, (m, r) => 'Waiting for ' + tx(r)], [/^Oleh: (.+)$/, (m, r) => 'By: ' + tx(r)], [/^Dibuat (.+) oleh (.+)$/, 'Created $1 by $2'], [/^TAT: (\d+) hari$/, 'TAT: $1 days'],
  [/^Radiasi \((\d+)\/(\d+|\?)\)$/, 'Radiation ($1/$2)'], [/^Progres fraksi: (\d+) dari (\d+)$/, 'Fraction progress: $1 of $2'], [/^(\d+) dari (\d+) fraksi selesai$/, '$1 of $2 fractions completed'],
  [/^(\d+) Fx \(selesai\)$/, '$1 Fx (completed)'], [/^Fraksi (\d+)\/(\d+|\?)$/, 'Fraction $1/$2'], [/^Fraksi ke-(\d+) dari (\d+) · (.+)$/, 'Fraction $1 of $2 · $3'],
  [/^Simpan & Konfirmasi Fraksi ke-(\d+)$/, 'Save & Confirm Fraction $1'], [/^Fraksi ke-(\d+) terverifikasi$/, 'Fraction $1 verified'], [/^Alert fraksi ke-(\d+)$/, 'Fraction $1 alert'],
  [/^Perhatian: fraksi ke-(\d+) sebelumnya error\/parsial$/, 'Attention: previous fraction $1 was error/partial'], [/^Catatan penting: fraksi ke-(\d+) error\/parsial$/, 'Important: fraction $1 was error/partial'],
  [/^(.+) · fraksi (\d+)\/(\d+)$/, '$1 · fraction $2/$3'], [/^Fx (\d+)$/, 'Fx $1'], [/^WA terkirim (.+)$/, 'WhatsApp sent $1'], [/^Terkirim (.+)$/, 'Sent $1'],
  [/^Tidak boleh sebelum (.+)$/, 'Not before $1'], [/^Terisi otomatis tanggal hari ini \(sebelumnya (.+)\); ubah bila perlu\.$/, "Filled automatically with today's date (previously $1); change if needed."],
  [/^Terisi otomatis tanggal hari ini; ubah bila perlu\.$/, "Filled automatically with today's date; change if needed."],
  [/^(.+) diperbarui\.$/, (m, a) => { const k = a.match(/^(Konsultasi|CT Simulasi|Delineasi|Perencanaan|Radiasi|Rujuk Kembali) (.+)$/); return (k ? tx(k[1]) + ' ' + k[2] : a) + ' updated.'; }],
  [/^(.+) ditambahkan\.$/, '$1 added.'], [/^Perencanaan (.+) — menunggu approval dokter\.$/, 'Planning $1 — awaiting doctor approval.'],
  [/^Kembali ke (.+)$/, (m, a) => 'Back to ' + tx(a)], [/^(.+) — stok (\d+) pcs( \(pakai ulang\))?$/, (m, a, n, r) => a + ' — stock ' + n + ' pcs' + (r ? ' (reusable)' : '')],
  [/^min (\d+) pcs$/, 'min $1 pcs'], [/^Atur ambang minimal (.+)$/, 'Set minimum threshold $1'], [/^(.+) · stok saat ini (\d+) pcs$/, '$1 · current stock $2 pcs'], [/^(Kurangi|Tambah) stok (.+)$/, (m, a, b) => (a === 'Kurangi' ? 'Reduce' : 'Add') + ' stock ' + b], [/^Jumlah fisik (.+)$/, 'Physical count $1'],
  [/^Stok opname \(selisih (.+)\)$/, 'Stock take (difference $1)'], [/^(\d+) jenis disesuaikan\.$/, '$1 types adjusted.'], [/^Stok (.+) tidak cukup \(tersisa (\d+) pcs\)\.$/, 'Not enough $1 stock ($2 pcs left).'],
  [/^Jenis "(.+)" sudah ada\.$/, 'Type "$1" already exists.'], [/^Jenis masker "(.+)" tidak ada\.$/, 'Mask type "$1" does not exist.'],
  [/^Rujukan: (.+)$/, 'Referral: $1'], [/^(.+) · diminta (.+) · dicatat (.+)$/, '$1 · requested by $2 · recorded by $3'],
  [/^Pasien yang menunggu tindakan Anda pada tahap (.+)\.$/, (m, a) => 'Patients awaiting your action at the ' + a.split(' & ').map(tx).join(' & ') + ' stage.'], [/^Pasien pada tahap (.+) sesuai peran Anda\.$/, (m, a) => 'Patients at the ' + a.split(' & ').map(tx).join(' & ') + ' stage for your role.'],
  [/^Batalkan (.+)$/, (m, a) => 'Cancel ' + tx(a)], [/^Ubah (.+)$/, (m, a) => 'Edit ' + a], [/^Status aktif (.+)$/, 'Active status $1'], [/^Lihat (.+)$/, 'View $1'], [/^Hapus (.+)$/, 'Delete $1'],
  [/^Unduh treatment summary (.+)$/, 'Download treatment summary $1'], [/^Batalkan (.+)$/, 'Cancel $1'],
  [/^Jadwal radiasi berikutnya dibuat otomatis Senin–Jumat hingga total$/, 'Subsequent treatments are scheduled automatically Monday–Friday up to a total of'],
  [/^, mulai hari kerja setelah tanggal ini\.$/, ', starting the working day after this date.'],
  [/^Total jadwal radiasi dijaga = (\d+|\?) fraksi: menambah jadwal ini akan mengurangi 1 jadwal otomatis paling akhir\.(.*)$/, (m, n, r) => 'Total sessions are kept at ' + n + ' fractions: adding this session removes the last automatic one.' + (r ? ' (Weekend treatment.)' : '')],
  [/^(Minggu|Senin|Selasa|Rabu|Kamis|Jumat|Sabtu), (.+): (\d+) agenda$/, (m, d, t, n) => d + ', ' + t + ': ' + n + ' appointments'],
  [/^\+(\d+) lagi$/, '+$1 more'], [/^Cek-in (\d\d:\d\d)$/, 'Check-in $1'], [/^Cek-in oleh (.+)$/, 'Checked in by $1'], [/^Dicatat oleh (.+)$/, 'Recorded by $1'],
  [/^Dilaksanakan (.+) \(jadwal awal (.+)\)(.*)$/, 'Delivered $1 (originally scheduled $2)$3'], [/^Batal: (.+)$/, 'Cancelled: $1'],
  [/^Berlaku untuk target 1\. Jadwal radiasi di Kalender menyesuaikan jumlah fraksi\. Sudah dijalankan: (\d+) fraksi\.$/, 'Applies to target 1. The Calendar schedule follows the number of fractions. Delivered so far: $1 fractions.'],
  [/^— tetap (.*) —$/, '— keep $1 —'], [/^(.+) · fraksi (\d+)\/(\d+)$/, '$1 · fraction $2/$3'],
  [/^% pasien memenuhi batas per bulan (Konsultasi|CT Simulasi) · target (\d+)% pasien$/, (m, a, n) => '% of patients within the limit per ' + tx(a) + ' month · target ' + n + '% of patients'],
  [/^TAT (.+) ≤ (\d+) hari$/, (m, a, n) => 'TAT ' + tx(a) + ' ≤ ' + n + ' days'], [/^Grafik kepatuhan TAT (.+)$/, (m, a) => 'TAT compliance chart ' + tx(a)],
  [/^(\d+) (kota|provinsi|kecamatan) belum diisi$/, (m, n, a) => n + ' ' + ({ kota: 'city', provinsi: 'province', kecamatan: 'district' })[a] + ' not set'], [/^fraksi (\d+)$/, 'fraction $1'], [/^Grafik distribusi (.+)$/, (m, a) => 'Distribution chart ' + tx(a)], [/^Distribusi (.+)$/, (m, a) => tx(a) + ' distribution'],
  [/^(\d+) pasien dalam 12 bulan · (\d+) memenuhi ≤ (\d+) hari · (\d+) dari (\d+) bulan mencapai target\. Arahkan kursor ke batang untuk rinciannya\.$/, '$1 patients in 12 months · $2 within ≤ $3 days · $4 of $5 months met the target. Hover over a bar for details.'],
  [/^(\d+) sesi dalam 12 bulan · (\d+) sesi < (\d+) menit( · median (\d+) menit)? · (\d+) dari (\d+) bulan mencapai target\.( (\d+) fraksi tanpa data cek-in pada hari yang sama tidak dihitung\.)?$/,
    (m, a, b, c, d, e, f, g, h, i) => a + ' sessions in 12 months · ' + b + ' sessions < ' + c + ' min' + (d ? ' · median ' + e + ' min' : '') + ' · ' + f + ' of ' + g + ' months met the target.' + (h ? ' ' + i + ' fractions without same-day check-in were excluded.' : '')],
  [/^· 12 bulan s\/d (.+) · mengikuti filter di atas$/, '· 12 months to $1 · follows the filters above'],
  [/^(\d+) pasien · terbanyak$/, '$1 patients · most common'], [/^\((\d+)%\) · (\d+) (belum Konsultasi|belum Perencanaan|kota belum diisi|provinsi belum diisi|kecamatan belum diisi|belum diisi)$/,
    (m, p, n, t) => '(' + p + '%) · ' + n + ' ' + ({ 'belum Konsultasi': 'not yet consulted', 'belum Perencanaan': 'not yet planned', 'kota belum diisi': 'city not set', 'provinsi belum diisi': 'province not set', 'kecamatan belum diisi': 'district not set', 'belum diisi': 'not set' })[t]],
  [/^(\d+) pasien · (\d+) (kota belum diisi|provinsi belum diisi|kecamatan belum diisi|belum diisi|belum Konsultasi|belum Perencanaan)$/, (m, a, n, t) => a + ' patients · ' + n + ' ' + tx(t)],
  [/^pasien · (\d+)%$/, 'patients · $1%'], [/^(.+): (\d+) pasien \((\d+)%\)$/, (m, a, n, p) => tx(a) + ': ' + n + ' patients (' + p + '%)'], [/^(\d+) pasien \((\d+)%\)$/, '$1 patients ($2%)'],
  [/^Tahap (.+) rata-rata$/, 'Stage $1 averages'], [/^rata-rata (.+) hari, melebihi target (.+) hari\. Pertimbangkan meninjau beban kerja pada tahap ini\.$/, 'average $1 days, exceeding the $2-day target. Consider reviewing the workload at this stage.'],
  [/^Rata-rata per bulan mulai radiasi · target (.+) hari$/, 'Monthly average by treatment start · target $1 days'], [/^% pasien ≤ (\d+) hari$/, '% patients ≤ $1 days'],
  [/^(\d+) dari (\d+) pasien ≤ (\d+) hari$/, '$1 of $2 patients ≤ $3 days'], [/^Median (\d+) hari · terlama (\d+) hari$/, 'Median $1 days · longest $2 days'], [/^(✓ Memenuhi|⚠ Di bawah) target (\d+)%$/, (m, a, n) => (a[0] === '✓' ? '✓ Meets' : '⚠ Below') + ' target ' + n + '%'],
  [/^Target (\d+)%$/, 'Target $1%'], [/^(\d+) (pcs|kategori)$/, (m, n, u) => n + ' ' + (u === 'pcs' ? 'pcs' : 'categories')],
  [/^(\d+) (pasien|jadwal)$/, (m, n, u) => n + ' ' + (u === 'pasien' ? 'patients' : 'schedules')],
  [/^Fraksi (\d+)$/, 'Fraction $1'], [/^Nama target (\d+)$/, 'Target name $1'], [/^Fraksi target (\d+)$/, 'Target $1 fractions'], [/^Dosis per fraksi target (\d+)$/, 'Target $1 dose per fraction'], [/^Total dosis target (\d+)$/, 'Target $1 total dose'],
  [/^Target (\d+) \(opsional\)$/, 'Target $1 (optional)'], [/^Nama lapangan (\d+)$/, 'Field name $1'], [/^Energi lapangan (\d+)$/, 'Field $1 energy'], [/^MU planning lapangan (\d+)$/, 'Field $1 planned MU'], [/^MU terdeliver lapangan (\d+)$/, 'Field $1 delivered MU'],
  [/^MU seharusnya (.+)$/, 'Expected MU $1'], [/^MU terdeliver (.+)$/, 'Delivered MU $1'], [/^Fraksi alert (\d+)$/, 'Alert $1 fraction'], [/^Catatan alert (\d+)$/, 'Alert $1 note'], [/^Batalkan (.+)$/, 'Cancel $1'],
  [/^Target (\d+): (.+)$/, (m, n, r) => 'Target ' + n + ': ' + tx(r)], [/^nama target wajib diisi\.$/, 'target name is required.'], [/^fraksi harus bilangan bulat > 0\.$/, 'fractions must be a whole number > 0.'],
  [/^dosis\/fraksi harus angka > 0\.$/, 'dose/fraction must be a number > 0.'], [/^total dosis harus angka > 0\.$/, 'total dose must be a number > 0.'],
  [/^Jumlah fraksi penyinaran minimal (\d+) \(fraksi target terbanyak\)\.$/, 'Number of fractions must be at least $1 (highest target fraction count).'],
  [/^Jumlah fraksi tidak boleh kurang dari fraksi yang sudah dijalankan \((\d+)\)\.$/, 'The number of fractions cannot be less than those already delivered ($1).'],
  [/^Tidak boleh kurang dari fraksi yang sudah dijalankan \((\d+)\)\.$/, 'Cannot be less than the fractions already delivered ($1).'],
  [/^Tahap (.+) belum selesai\. Tahap tidak boleh dilompati\.$/, (m, a) => 'Stage ' + tx(a) + ' is not complete. Stages cannot be skipped.'],
  [/^Tahap (.+) belum selesai diisi\. Tahap tidak boleh dilompati\.$/, (m, a) => 'Stage ' + tx(a) + ' is not complete. Stages cannot be skipped.'],
  [/^Tanggal (.+) tidak boleh lebih awal dari tahap (.+) \((.+)\)\.$/, (m, a, b, c) => 'The ' + tx(a) + ' date cannot be earlier than the ' + tx(b) + ' stage (' + c + ').'],
  [/^Tanggal (.+) tidak boleh melewati tahap sesudahnya \((.+)\)\.$/, (m, a, b) => 'The ' + tx(a) + ' date cannot be later than the next stage (' + b + ').'],
  [/^Tanggal fraksi tidak boleh lebih awal dari tanggal mulai radiasi \((.+)\)\.$/, 'The fraction date cannot be earlier than the treatment start date ($1).'], [/^Tanggal tidak boleh sebelum mulai radiasi \((.+)\)\.$/, 'The date cannot be before the treatment start ($1).'],
  [/^Peran Anda tidak dapat mengisi tahap (.+)\.$/, (m, a) => 'Your role cannot fill in the ' + tx(a) + ' stage.'], [/^Peran (.+) tidak berwenang mengisi tahap (.+)\.$/, (m, a, b) => 'The ' + tx(a) + ' role is not authorised to fill in the ' + tx(b) + ' stage.'],
  [/^Pilih energi \(6 MV \/ 10 MV\) untuk lapangan (.+)\.$/, 'Choose the energy (6 MV / 10 MV) for field $1.'], [/^MU planning lapangan (.+) harus angka > 0\.$/, 'Planned MU for field $1 must be a number > 0.'],
  [/^Isi MU terdeliver lapangan (.+)\.$/, 'Enter the delivered MU for field $1.'], [/^Isi MU seharusnya dan terdeliver untuk lapangan (.+)\.$/, 'Enter the expected and delivered MU for field $1.'],
  [/^Alert: fraksi ke-(\d+) melebihi jumlah fraksi \((\d+)\)\.$/, 'Alert: fraction $1 exceeds the number of fractions ($2).'], [/^Alert fraksi ke-(\d+): catatan wajib diisi\.$/, 'Fraction $1 alert: a note is required.'],
  [/^Alert untuk fraksi ke-(\d+) ditulis lebih dari sekali; gabungkan catatannya\.$/, 'The alert for fraction $1 is entered more than once; combine the notes.'],
  [/^Alert (\d+): (.+)$/, 'Alert $1: $2'], [/^Unggah gagal — (.+?)\.? Perencanaan belum disimpan; perbaiki lalu klik simpan lagi \(berkas yang sudah terunggah tidak diulang\)\.$/, 'Upload failed — $1. Planning was not saved; fix it and click save again (files already uploaded are not repeated).'],
  [/^Mengunggah (\d+)\/(\d+)…$/, 'Uploading $1/$2…'], [/^Menyiapkan (.+)…$/, 'Preparing $1…'], [/^Mengunggah (.+)…$/, 'Uploading $1…'],
  [/^NRM sudah terdaftar atas nama (.+?)!?\.?$/, 'MRN already registered to $1.'], [/^Username "(.+)" sudah dipakai\.$/, 'Username "$1" is already taken.'],
  [/^(.+) wajib diisi\.$/, (m, a) => tx(a) + ' is required.'], [/^Pasien ini bukan pasien Anda \(DPJP: (.+)\)\.$/, 'This patient is not yours (attending: $1).'],
  [/^Petugas "(.+)" bukan pengguna (aktif )?berperan Radioterapis\.$/, 'Staff "$1" is not an active user with the Radiation Therapist role.'],
  [/^(\d+) kolom terisi \(kuning\) via (AI|OCR Drive)\. Periksa kembali sebelum menyimpan\.(.*)$/, '$1 fields filled (yellow) via $2. Check before saving.$3'],
  [/^Tersimpan$/, 'Saved'], [/^(.+) · username kini (.+)$/, '$1 · username is now $2'], [/^(.+) · password diganti$/, '$1 · password changed'],
  [/^WhatsApp (AKTIF|nonaktif) · API key (tersimpan|belum diisi)$/, (m, a, b) => 'WhatsApp ' + (a === 'AKTIF' ? 'ACTIVE' : 'inactive') + ' · API key ' + (b === 'tersimpan' ? 'saved' : 'not set')],
  [/^Rata-rata (.+)$/, 'Average $1'], [/^Tren (.+)$/, 'Trend $1'],
  [/^Fraksi ke-(\d+)$/, 'Fraction $1'], [/^Unggah gagal$/, 'Upload failed'],
  [/^(.+): (\d+) agenda$/, '$1: $2 appointments'], [/^(.+) \((\d+)\)$/, (m, a, n) => tx(a) + ' (' + n + ')']
];
const MEMO = new Map();
function trTeks(t) {
  if (LANG !== 'en' || !t) return t;
  if (MEMO.has(t)) return MEMO.get(t);
  const h = trTeks0(t); if (MEMO.size > 6000) MEMO.clear(); MEMO.set(t, h); return h;
}
function trTeks0(t) {
  const m = t.match(/^(\s*)([\s\S]*?)(\s*)$/), k = m[2]; if (!k) return t;
  if (EN[k] != null) return m[1] + EN[k] + m[3];
  for (const r of RX) { if (r[0].test(k)) return m[1] + k.replace(r[0], r[1]) + m[3]; }
  if (k.indexOf(' · ') > 0) { const parts = k.split(' · '), tr = parts.map(x => trTeks(x)); if (tr.some((x, i) => x !== parts[i])) return m[1] + tr.join(' · ') + m[3]; }
  return t;
}
const tx = s => trTeks(String(s == null ? '' : s));
const ASLI = new WeakMap(), ATTR_I18N = ['placeholder', 'title', 'aria-label'];
function trNode(root) {
  if (!root) return;
  if (root.nodeType === 3) { const r = ASLI.get(root), o = r && r.t === root.nodeValue ? r.o : root.nodeValue, pe = root.parentElement, n = LANG === 'en' && pe && pe.hasAttribute('data-en') && o.trim() ? o.replace(o.trim(), pe.getAttribute('data-en')) : trTeks(o); if (n !== root.nodeValue || (r && r.o !== o)) { ASLI.set(root, { o, t: n }); if (n !== root.nodeValue) root.nodeValue = n; } return; }
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  const el = root.nodeType === 1 ? root : null;
  if (el && (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.hasAttribute('data-noi18n') || el.isContentEditable)) return;
  if (el) ATTR_I18N.forEach(a => { if (!el.hasAttribute(a)) return; let m = ASLI.get(el); const o = m && m[a] != null ? m[a] : el.getAttribute(a), n = trTeks(o);
    if (n !== el.getAttribute(a)) { if (!m) ASLI.set(el, m = {}); if (m[a] == null) m[a] = o; el.setAttribute(a, n); } });
  if (el && el.tagName === 'TEXTAREA') return; // isi textarea = data pengguna, tidak diterjemahkan
  for (let c = root.firstChild; c; c = c.nextSibling) trNode(c);
}
function pulihkan(root) { // kembali ke Bahasa Indonesia
  if (root.nodeType === 3) { const r = ASLI.get(root); if (r) { if (root.nodeValue === r.t) root.nodeValue = r.o; ASLI.delete(root); } return; }
  if (root.nodeType === 1) { const m = ASLI.get(root); if (m) { Object.keys(m).forEach(a => root.setAttribute(a, m[a])); ASLI.delete(root); } }
  for (let c = root.firstChild; c; c = c.nextSibling) pulihkan(c);
}
let OBS = null;
function pasangI18n() {
  document.documentElement.lang = LANG;
  if (LANG === 'en') trNode(document.body);
  if (OBS || typeof MutationObserver === 'undefined') return;
  OBS = new MutationObserver(list => { if (LANG !== 'en') return; list.forEach(m => { if (m.type === 'characterData') trNode(m.target); else m.addedNodes.forEach(trNode); }); });
  OBS.observe(document.body, { childList: true, subtree: true, characterData: true });
}
const debounce = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };

// ═════════ DEFINISI TAHAP (cermin server) ═════════
const ST = [
  { k: 'consult', n: 'Konsultasi', ic: 'bi-clipboard2-pulse', who: 'Dokter', roles: ['Dokter'], s: 'ConsultTgl', e: 'ConsultTgl', done: c => !!(c.ConsultTgl && c.ConsultKasus) },
  { k: 'ct', n: 'CT Simulasi', ic: 'bi-bounding-box', who: 'Radioterapis', roles: ['Radioterapis'], s: 'CTTgl', e: 'CTTgl', done: c => !!(c.CTTgl && c.CTMasker) },
  { k: 'contour', n: 'Delineasi', ic: 'bi-vector-pen', who: 'Dokter', roles: ['Dokter'], s: 'ContourTgl', e: 'ContourTgl', done: c => !!(c.ContourTgl && c.Fraksi && c.Dosis && c.TotalDosis) },
  { k: 'plan', n: 'Perencanaan', ic: 'bi-cpu', who: 'Fisikawan Medis', roles: ['Fisikawan Medis'], s: 'PlanTgl', e: 'PlanTgl', done: c => !!(c.PlanTgl && c.Teknik && c.Fisikawan && (c.PlanStatus === 'Disetujui' || (!c.PlanStatus && c.RadMulai))) },
  { k: 'radiation', n: 'Radiasi', ic: 'bi-lightning-charge', who: 'Radioterapis', roles: ['Radioterapis'], s: 'RadMulai', e: 'RadSelesai', done: c => !!c.RadMulai },
  { k: 'rujuk', n: 'Rujuk Kembali', ic: 'bi-arrow-return-left', who: 'Dokter', roles: ['Dokter'], s: 'RujukTgl', e: 'RujukTgl', done: c => !!c.RujukTgl }
];
const TEKNIK = ['3D', 'IMRT', 'VMAT'];
const TAHAP_LAMA = { 'Consult': 'Konsultasi', 'CT Planning': 'CT Simulasi', 'Contouring': 'Delineasi', 'Planning': 'Perencanaan', 'Radiation': 'Radiasi' }; // nama tahap di log lama
const VIEWS = ['dashboard', 'pasien', 'detail', 'carepath', 'calendar', 'inventory', 'report', 'users'];
const TITLES = { dashboard: 'Dashboard', pasien: 'Data Pasien', detail: 'Detail Pasien', carepath: 'Alur Layanan', calendar: 'Kalender', inventory: 'Persediaan', report: 'Laporan', users: 'Kelola Users' };

// ═════════ STATE LOKAL (satu-satunya sumber kebenaran di klien) ═════════
const S = {
  me: null, pasien: [], cp: {}, inv: [], logStok: [], akt: [], users: [], staf: [], kasus: [], cfg: {},
  fraksiLog: [], perubahan: [], media: [], agenda: [],
  view: 'dashboard', detailId: null, backTo: 'pasien', q: '',
  pf: {}, cf: { tahap: '', dokter: '', teknik: '', kasus: '' }, cal: { mode: 'day', ref: today(), jenis: '' },
  rf: { from: '', to: '', dokter: '', teknik: '', kasus: '' },
  invTab: 'stok', userTab: 'users', pending: 0, dirty: new Set(VIEWS)
};
function load(p) {
  S.me = p.me; S.pasien = p.pasien || []; S.cp = {}; (p.cp || []).forEach(c => { S.cp[c.ID] = c; });
  S.inv = p.inv || []; S.logStok = p.logStok || []; S.akt = p.akt || []; S.users = p.users || [];
  S.staf = p.staf || []; S.kasus = p.kasus || []; S.cfg = p.cfg || {};
  S.fraksiLog = p.fraksiLog || []; S.perubahan = p.perubahan || []; S.media = p.media || []; S.agenda = p.agenda || [];
}
const cpOf = id => S.cp[id] || (S.cp[id] = { ID: id, FraksiSelesai: 0 });
const pOf = id => S.pasien.find(p => p.ID === id);
const peran = () => S.me.peran;
const isSA = () => peran() === 'Super Admin';
const isAdm = () => isSA() || peran() === 'Admin';
const can = i => isSA() || ST[i].roles.indexOf(peran()) >= 0;
const canStok = () => isSA() || peran() === 'Radioterapis';
const lihatInv = () => isSA() || peran() === 'Radioterapis' || peran() === 'Fisikawan Medis';
/** Tahap carepath yang ditampilkan per peran: Radioterapis = CT Planning & Radiation, Fisikawan = Planning. */
const tahapPeran = () => peran() === 'Radioterapis' ? [1, 4] : peran() === 'Fisikawan Medis' ? [3] : [0, 1, 2, 3, 4, 5];
const full = (c, i) => i === 4 ? !!(c.RadMulai && c.RadSelesai) : ST[i].done(c);
const cur = c => { for (let i = 0; i < 6; i++) if (!full(c, i)) return i; return 6; };
const sedangRad = p => { const c = cpOf(p.ID); return !!c.RadMulai && !c.RujukTgl; };
const tat = c => ({ a: diff(c.ConsultTgl, c.CTTgl), b: diff(c.CTTgl, c.ContourTgl), c: diff(c.ContourTgl, c.PlanTgl), d: diff(c.PlanTgl, c.RadMulai), total: diff(c.ConsultTgl, c.RadMulai), rad: diff(c.RadMulai, c.RadSelesai) });
const tg = () => ({ a: +S.cfg.TARGET_CONSULT_CT || 3, b: +S.cfg.TARGET_CT_CONTOUR || 2, c: +S.cfg.TARGET_CONTOUR_PLAN || 3, d: +S.cfg.TARGET_PLAN_RAD || 4.5, total: +S.cfg.TARGET_TOTAL || 12 });
const tipePill = p => p && p.TipePasien ? `<span class="pill ${p.TipePasien === 'IPD' ? 'ipd' : 'opd'}" title="${p.TipePasien === 'IPD' ? 'Rawat inap' : 'Rawat jalan'}">${esc(p.TipePasien)}</span>` : '';
// ═════════ DATA TAMBAHAN (r6) ═════════
const jarr = v => { if (Array.isArray(v)) return v; try { const x = JSON.parse(v || '[]'); return Array.isArray(x) ? x : []; } catch (e) { return []; } };
const namaPeran = r => [...new Set(S.staf.filter(s => s.peran === r).map(s => s.nama))];
function targetsOf(c) {
  const T = jarr(c.Targets);
  if (T.length) return T;
  return c.Fraksi ? [{ n: 'Target', f: +c.Fraksi, d: +c.Dosis, t: +c.TotalDosis }] : [];
}
const planIsi = c => !!(c.PlanTgl && c.Teknik && c.Fisikawan);
const planSt = c => c.PlanStatus || (c.RadMulai ? 'Disetujui' : (planIsi(c) ? 'Menunggu' : ''));
const bolehCatat = () => ['Super Admin', 'Dokter', 'Fisikawan Medis', 'Radioterapis'].indexOf(peran()) >= 0;
const mb = n => (Math.round(n / 1048576 * 10) / 10).toFixed(1) + ' MB';
const stokSt = i => i.Stok <= 0 ? 'out' : i.Stok <= i.Min ? 'low' : 'ok';

// ═════════ KOMPONEN KECIL ═════════
function tahapPill(c) {
  const i = cur(c);
  if (i === 6) return '<span class="pill ok"><i class="bi bi-check2-circle"></i>Selesai</span>';
  if (i === 4 && c.RadMulai) return `<span class="pill y">Radiasi (${c.FraksiSelesai || 0}/${c.Fraksi || '?'})</span>`;
  return `<span class="pill y">Tahap ${i + 1}: ${ST[i].n}</span>`;
}
function mini(c) { const i = cur(c); return '<div class="mini" aria-hidden="true">' + ST.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'active' : ''}"></i>`).join('') + '</div>'; }
function fxGrid(c) {
  const n = +c.Fraksi || 0, d = +c.FraksiSelesai || 0; if (!n) return '';
  let h = ''; for (let k = 1; k <= n; k++) h += `<span class="${k <= d ? 'd' : k === d + 1 && !c.RadSelesai ? 'n' : ''}">${k <= d ? '<i class="bi bi-check-lg"></i>' : k}</span>`;
  return `<div class="fx" role="img" aria-label="${d} dari ${n} fraksi selesai">${h}</div>`;
}
const stokPill = i => { const s = stokSt(i); return s === 'out' ? '<span class="pill bad">Habis</span>' : s === 'low' ? '<span class="pill y">Menipis</span>' : '<span class="pill ok">Aman</span>'; };
const empty = (ic, t) => `<div class="empty"><i class="bi ${ic}"></i>${t}</div>`;
function kpi(lb, v, unit, ic, y, foot) {
  return `<div class="card kpi"><div class="top"><div><div class="lb">${lb}</div><div class="v">${v}${unit ? `<small>${unit}</small>` : ''}</div></div><div class="ico ${y ? 'y' : ''}"><i class="bi ${ic}"></i></div></div><div class="ft">${foot}</div></div>`;
}

// ═════════ GRAFIK ═════════
const charts = {};
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function mk(id, cfg) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  const el = document.getElementById(id);
  if (!el || typeof Chart === 'undefined') return;
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.color = css('--muted');
  charts[id] = new Chart(el, cfg);
}
const dark = () => document.documentElement.getAttribute('data-theme') === 'dark';
const stageColors = () => ['#456AA8', '#FFC93C', dark() ? '#7C9BD1' : '#0B2A5B', '#A9C1F7', '#1F5FBF', '#CBD5E6'];
function monthly(n) {
  const out = [], d = new Date(); d.setDate(1);
  for (let k = n - 1; k >= 0; k--) { const x = new Date(d.getFullYear(), d.getMonth() - k, 1); out.push({ k: x.getFullYear() + '-' + pad(x.getMonth() + 1), l: BLN[x.getMonth()], n: 0 }); }
  return out;
}

// ═════════ RENDER: CHROME ═════════
function renderChrome() {
  const m = S.me;
  $('#meName').textContent = m.nama; $('#meRole').textContent = m.peran; $('#meAv').textContent = initials(m.nama);
  $('#navUsers').hidden = !isSA(); demoUi();
  const navInv = $('#nav a[data-v="inventory"]'); if (navInv) navInv.hidden = !lihatInv();
  $('#rsName').textContent = S.cfg.NAMA_RS || 'RS Siloam Agora';
  const low = lihatInv() ? S.inv.filter(i => i.Aktif && i.Stok <= i.Min) : [];
  const chip = $('#stokChip');
  chip.hidden = !low.length; chip.innerHTML = `<i class="bi bi-box-seam"></i>Masker tipis: ${low.length} item`;
  $('#alertBar').innerHTML = low.length && S.view === 'inventory'
    ? `<div class="banner" role="status"><i class="bi bi-exclamation-triangle-fill"></i><span><b>PERHATIAN INVENTARIS:</b> Stok menipis: ${low.map(i => `<b>${esc(i.Jenis)}</b> (${i.Stok} pcs)`).join(', ')}</span></div>` : '';
  setSync();
}
function setSync() {
  const c = $('#syncChip'); if (!c) return;
  if (!navigator.onLine) { c.className = 'pill y'; c.innerHTML = '<i class="bi bi-wifi-off"></i><span>Offline</span>'; }
  else if (S.pending > 0) { c.className = 'pill'; c.innerHTML = '<span class="spin s"></span><span>Menyimpan…</span>'; }
  else { c.className = 'pill ok'; c.innerHTML = '<i class="bi bi-check2-circle"></i><span>Tersinkron</span>'; }
}

// ═════════ RENDER: DASHBOARD ═════════
function vDashboard() {
  const pas = S.pasien, aktif = pas.filter(p => cur(cpOf(p.ID)) < 6), rad = pas.filter(sedangRad);
  const bln = today().slice(0, 7), baru = pas.filter(p => String(p.TglDibuat).slice(0, 7) === bln).length;
  const ser = monthly(6); pas.forEach(p => { const m = ser.find(x => x.k === String(p.TglDibuat).slice(0, 7)); if (m) m.n++; });
  const rata = ser.reduce((s, x) => s + x.n, 0) / ser.length;
  const rt = avg(pas.map(p => tat(cpOf(p.ID)).total)), tt = tg().total;
  const jam = new Date().getHours(), sal = jam < 11 ? 'Pagi' : jam < 15 ? 'Siang' : jam < 18 ? 'Sore' : 'Malam';
  let roleLine = '';
  if (['Dokter', 'Radioterapis', 'Fisikawan Medis'].indexOf(peran()) >= 0) {
    const n = aktif.filter(p => can(cur(cpOf(p.ID)))).length;
    roleLine = n ? ` <b>${n} pasien</b> menunggu giliran ${esc(peran())} untuk diisi.` : ' Tidak ada pasien yang menunggu giliran Anda.';
  }
  const dist = ST.map(() => 0); aktif.forEach(p => { dist[cur(cpOf(p.ID))]++; });
  const col = stageColors();
  const wa = S.cfg.WA_AKTIF === 'YA';
  const low = S.inv.filter(i => i.Aktif);
  const akt5 = S.akt.slice(0, 5);
  $('#v-dashboard').innerHTML = `<div class="stack">
  <div class="hero"><div><span class="st"><i class="dot"></i>Sistem berjalan normal • WA ${wa ? 'aktif' : 'nonaktif'}</span>
    <h1>Selamat ${sal}, ${esc(S.me.nama)}</h1>
    <p>Ada <b>${aktif.length} pasien</b> dalam siklus radioterapi aktif.${roleLine}</p></div>
    ${isAdm() ? '<button class="btn y" data-act="pasienBaru"><i class="bi bi-person-plus"></i>Pasien Baru</button>' : ''}</div>
  <div class="grid g4">
    ${kpi('Pasien aktif', aktif.length, '', 'bi-people', false, '<span class="pill mut">Belum Rujuk Kembali</span>')}
    ${kpi('Pasien baru bulan ini', baru, '', 'bi-person-plus', false, `<span class="pill mut">${BLN[new Date().getMonth()]} ${new Date().getFullYear()}</span><span>Rata-rata ${n1(rata)}/bln</span>`)}
    ${kpi('Sedang radiasi', rad.length, '', 'bi-lightning-charge', true, `<span class="pill y">${aktif.length ? Math.round(rad.length / aktif.length * 100) : 0}% dari aktif</span>`)}
    ${kpi('Rata-rata TAT', n1(rt), 'hari', 'bi-stopwatch', false, `<span>Konsultasi s/d Radiasi mulai</span>${rt == null ? '' : `<span class="pill ${rt <= tt ? 'ok' : 'y'}">${rt - tt > 0 ? '+' : ''}${n1(rt - tt)} hr</span>`}`)}
  </div>
  <div class="grid g21">
    <div class="card"><div class="card-h"><div><h3 class="t">Distribusi pasien per tahapan</h3><div class="sub">Tahap alur layanan saat ini</div></div><span class="sp"></span><span class="pill mono">${aktif.length} pasien</span></div>
      <div class="card-b row distw">
        <div class="chart" style="width:190px;height:190px;flex:none"><canvas id="chDist" aria-label="Grafik donat distribusi tahap"></canvas><div class="ctr"><div><div class="num" style="font-size:28px;font-weight:600">${aktif.length}</div><small class="muted">TOTAL AKTIF</small></div></div></div>
        <div class="legend" style="flex:1">${ST.map((s, i) => `<div><i class="sw" style="background:${col[i]}"></i>${s.n}<span class="num">${dist[i]} (${aktif.length ? Math.round(dist[i] / aktif.length * 100) : 0}%)</span></div>`).join('')}</div>
      </div></div>
    <div class="card"><div class="card-h"><div><h3 class="t">Pasien baru per bulan</h3><div class="sub">Tren pendaftaran 6 bulan terakhir</div></div></div>
      <div class="card-b"><div class="chart"><canvas id="chBulan" aria-label="Grafik batang pasien baru per bulan"></canvas></div></div></div>
  </div>
  <div class="grid ${lihatInv() ? 'g3' : 'g2'}">
    ${lihatInv() ? `<div class="card"><div class="card-h"><i class="bi bi-box-seam link"></i><h3 class="t">Stok masker fiksasi</h3></div><div class="card-b">
      ${low.length ? low.map(i => { const st = stokSt(i), pc = Math.min(100, Math.round(i.Stok / Math.max(i.Min * 2, 1) * 100)); return `<div class="lrow"><div class="hd"><b>${esc(i.Jenis)}</b><span class="row" style="gap:8px"><span class="num muted">${i.Stok} pcs</span>${stokPill(i)}</span></div><div class="bar ${st === 'ok' ? '' : st === 'low' ? 'y' : 'bad'}"><i style="width:${pc}%"></i></div></div>`; }).join('') : empty('bi-box', 'Belum ada jenis masker.')}
      <div style="margin-top:12px"><a class="link" data-act="nav" data-v="inventory" tabindex="0" role="link" style="cursor:pointer;font-weight:600">Kelola stok <i class="bi bi-arrow-right"></i></a></div></div></div>` : ''}
    <div class="card"><div class="card-h"><i class="bi bi-lightning-charge link"></i><h3 class="t">Pasien sedang radiasi</h3><span class="sp"></span><span class="num link">${rad.length} aktif</span></div>
      ${rad.length ? `<div class="tw"><table class="tbl" style="min-width:420px"><thead><tr><th>Pasien &amp; NRM</th><th>Mulai</th><th>Fraksi</th></tr></thead><tbody>${rad.slice(0, 4).map(p => { const c = cpOf(p.ID); return `<tr class="clk" data-act="open" data-id="${p.ID}"><td><b>${esc(p.Nama)}</b><div class="mono muted" style="font-size:12px">${esc(nrmT(p.NRM))}</div></td><td class="num">${fd(c.RadMulai)}</td><td><span class="pill ${c.FraksiSelesai ? 'ok' : 'y'} num">${c.FraksiSelesai || 0}/${c.Fraksi || '?'}</span></td></tr>`; }).join('')}</tbody></table></div>
      <div class="card-b muted" style="font-size:12px;display:flex;justify-content:space-between">Menampilkan ${Math.min(4, rad.length)} dari ${rad.length}<a class="link" data-act="nav" data-v="carepath" tabindex="0" role="link" style="cursor:pointer;font-weight:600">Lihat semua</a></div>` : empty('bi-lightning-charge', 'Belum ada pasien yang sedang radiasi.')}</div>
    <div class="card"><div class="card-h"><i class="bi bi-clock-history link"></i><h3 class="t">Aktivitas terbaru</h3></div><div class="card-b">
      ${akt5.length ? akt5.map(a => `<div class="act"><div class="ai"><i class="bi ${actIc(a.Aksi)}"></i></div><div style="min-width:0"><div class="row" style="gap:6px"><b>${esc(a.Pengguna)}</b><span class="muted" style="font-size:12px">${ago(a.Waktu)}</span></div><p>${esc(a.Aksi)}${a.Detail ? ' · ' + esc(a.Detail) : ''}</p>${a.Tahap ? `<span class="pill" style="height:22px;margin-top:4px">${esc(TAHAP_LAMA[a.Tahap] || a.Tahap)}</span>` : ''}</div></div>`).join('') : empty('bi-clock-history', 'Belum ada aktivitas.')}</div></div>
  </div></div>`;
  mk('chDist', { type: 'doughnut', data: { labels: ST.map(s => tx(s.n)), datasets: [{ data: dist, backgroundColor: col, borderWidth: 0 }] }, options: { cutout: '72%', maintainAspectRatio: false, plugins: { legend: { display: false } } } });
  mk('chBulan', { type: 'bar', data: { labels: ser.map(x => x.l), datasets: [{ data: ser.map(x => x.n), backgroundColor: ser.map((x, i) => i === ser.length - 1 ? '#FFC93C' : '#1F5FBF'), borderRadius: 6, maxBarThickness: 40 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: css('--border') } }, x: { grid: { display: false } } } } });
}
function actIc(a) { return { 'Isi Tahap': 'bi-clipboard2-check', 'Ubah Tahap': 'bi-pencil', 'Tambah Pasien': 'bi-person-plus', 'Ubah Pasien': 'bi-person-lines-fill', 'Verifikasi Fraksi': 'bi-shield-check', 'Adjust Stok': 'bi-box-seam', 'Stok Opname': 'bi-clipboard-check', 'WA Gagal': 'bi-whatsapp' }[a] || 'bi-clock-history'; }

// ═════════ RENDER: DATA PASIEN (detail klinis + filter bertahap) ═════════
const PF = [
  { k: 'kasus', l: 'Kasus', v: (p, c) => c.ConsultKasus },
  { k: 'teknik', l: 'Teknik', v: (p, c) => c.Teknik },
  { k: 'dpjp', l: 'Dokter onkologi', v: p => p.DokterOnkologi },
  { k: 'fisikawan', l: 'Fisikawan medis', v: (p, c) => c.Fisikawan },
  { k: 'tipe', l: 'Tipe pasien', v: p => p.TipePasien },
  { k: 'payer', l: 'Payer', v: p => p.Payer },
  { k: 'status', l: 'Status', v: (p, c) => c.RujukTgl ? 'Selesai (rujuk kembali)' : 'Aktif' }
];
/**
 * Preskripsi sesuai kenyataan: bila dosis/fraksi target 1 berubah di tengah treatment (Perubahan Dosis),
 * target 1 dipecah per fase (fraksi yang sudah dijalankan dengan dosis lamanya + sisa fraksi dengan dosis baru).
 */
function fasePreskripsi(c) {
  const T = targetsOf(c); if (!T.length || !c.ID) return null;
  const L = dosisLog(c.ID), cur = +c.Dosis || 0; if (!L.length || L.every(x => x._d === cur)) return null;
  const F = []; L.forEach((x, i) => { const z = F[F.length - 1]; if (z && z.d === x._d) { z.f++; z.b = i + 1; } else F.push({ a: i + 1, b: i + 1, f: 1, d: x._d }); });
  const sisa = Math.max(0, (+c.Fraksi || 0) - L.length);
  if (sisa) { const z = F[F.length - 1]; if (z.d === cur) { z.f += sisa; z.b += sisa; } else F.push({ a: z.b + 1, b: z.b + sisa, f: sisa, d: cur }); }
  const r2 = v => Math.round(v * 100) / 100, rows = F.map(z => ({ n: T[0].n + ' (fx ' + z.a + (z.b > z.a ? '–' + z.b : '') + ')', f: z.f, d: z.d, t: r2(z.f * z.d) }));
  return { rows, tot: { n: T[0].n + ' — total', f: rows.reduce((a, x) => a + x.f, 0), d: '', t: r2(rows.reduce((a, x) => a + x.t, 0)), tot: true }, lain: T.slice(1) };
}
const totalRx = c => { const f = fasePreskripsi(c); return f ? f.tot.t : c.TotalDosis; };
function targetsReal(c) { const f = fasePreskripsi(c); return f ? f.rows.concat([f.tot], f.lain) : targetsOf(c); }
function rxRingkas(c) {
  const f = fasePreskripsi(c), T = f ? [f.tot].concat(f.lain).map(x => x.tot ? Object.assign({}, x, { n: x.n.replace(/ — total$/, '') }) : x) : targetsOf(c);
  return T.length ? T.map(t => `<div class="num" style="font-size:12px;white-space:nowrap"><b>${esc(t.n)}</b> ${t.t} cGy / ${t.f} fx</div>`).join('') : '<span class="muted">–</span>';
}
function vPasien() {
  $('#v-pasien').innerHTML = `<div class="stack">
  <div class="pagehead"><div><div class="eyebrow">Rekam Pasien Radioterapi</div><h1>Data Pasien</h1><p>Telusuri identitas, diagnosis, preskripsi, dan tim klinis setiap pasien dalam satu tampilan.</p></div><span class="sp"></span>
    ${isAdm() ? '<button class="btn p" data-act="pasienBaru"><i class="bi bi-plus-lg"></i>Tambah Pasien</button>' : ''}</div>
  <div class="card"><div class="card-b stack" style="gap:14px">
    <div class="row"><div class="search" style="flex:1;min-width:220px;max-width:none"><i class="bi bi-search"></i><input id="pq" class="input" type="search" placeholder="Cari nama, NRM, atau diagnosa…" aria-label="Cari pasien" value="${esc(S.q)}" autocomplete="off"></div>
      <button class="btn g" data-act="pfReset"><i class="bi bi-arrow-counterclockwise"></i>Reset semua</button></div>
    <div class="hint"><i class="bi bi-funnel"></i> Filter bertahap: pilihan di setiap langkah menyesuaikan hasil langkah sebelumnya. Angka dalam kurung = jumlah pasien.</div>
    <div id="pfBar" class="pfbar"></div><div id="pfChips" class="row" style="gap:6px"></div></div></div>
  <div class="card"><div class="tw"><table class="tbl" style="min-width:1080px"><thead><tr><th>NRM</th><th>Pasien</th><th>Diagnosa &amp; kasus</th><th>Preskripsi</th><th>Teknik</th><th>Dokter onkologi</th><th>Fisikawan medis</th><th>Status</th><th><span class="sr">Unduh</span></th></tr></thead><tbody id="pasienBody"></tbody></table></div>
  <div class="card-b muted" id="pasienCount" style="font-size:12px"></div></div></div>`;
  pasienRows();
}
function pasienRows() {
  const q = S.q.trim().toLowerCase();
  let rows = S.pasien.filter(p => { const c = cpOf(p.ID); return !q || [p.Nama, p.NRM, c.Diagnosa, c.ConsultKasus].some(x => String(x || '').toLowerCase().indexOf(q) >= 0); });
  const bar = PF.map((f, i) => {
    const cnt = {}, sel = S.pf[f.k] || '';
    rows.forEach(p => { const v = f.v(p, cpOf(p.ID)) || '(belum diisi)'; cnt[v] = (cnt[v] || 0) + 1; });
    const opts = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || a.localeCompare(b));
    if (sel && !cnt[sel]) opts.unshift(sel);
    const html = `<div class="fld"><label>${i + 1}. ${f.l}</label><select class="input ${sel ? 'on' : ''}" data-pf="${f.k}" aria-label="Filter ${f.l}"><option value="">Semua (${rows.length})</option>${opts.map(o => `<option value="${esc(o)}" ${o === sel ? 'selected' : ''}>${esc(o)} (${cnt[o] || 0})</option>`).join('')}</select></div>`;
    if (sel) rows = rows.filter(p => (f.v(p, cpOf(p.ID)) || '(belum diisi)') === sel);
    return html;
  }).join('');
  const b = $('#pasienBody'); if (!b) return;
  $('#pfBar').innerHTML = bar;
  $('#pfChips').innerHTML = PF.filter(f => S.pf[f.k]).map(f => `<button class="pill chipx" data-act="pfClear" data-k="${f.k}" aria-label="Hapus filter ${f.l}">${f.l}: ${esc(S.pf[f.k])} <i class="bi bi-x"></i></button>`).join('');
  b.innerHTML = rows.length ? rows.slice(0, 300).map(p => { const c = cpOf(p.ID); return `<tr class="clk" data-act="open" data-id="${p.ID}" tabindex="0">
    <td class="mono">${esc(nrmT(p.NRM))}</td>
    <td><div class="row" style="gap:6px;flex-wrap:nowrap"><b>${esc(p.Nama)}</b>${tipePill(p)}</div><div class="muted" style="font-size:12px">${umur(p.TglLahir)} th${p.JenisKelamin ? ' · ' + esc(p.JenisKelamin) : ''}${p.Payer ? ' · ' + esc(p.Payer) : ''}</div></td>
    <td style="max-width:240px">${c.Diagnosa ? `<div style="font-weight:500;margin-bottom:4px">${esc(c.Diagnosa)}</div>` : ''}${c.ConsultKasus ? `<span class="pill">${esc(c.ConsultKasus)}</span>` : '<span class="muted">–</span>'}</td>
    <td>${rxRingkas(c)}</td>
    <td>${c.Teknik ? `<span class="pill navy">${esc(c.Teknik)}</span>` : '<span class="muted">–</span>'}</td>
    <td>${esc(p.DokterOnkologi)}<div class="muted" style="font-size:12px">Rujukan: ${esc(p.RSPerujuk || '–')}</div></td>
    <td>${c.Fisikawan ? esc(c.Fisikawan) : '<span class="muted">–</span>'}</td>
    <td>${c.RujukTgl ? '<span class="pill ok">Selesai</span>' : '<span class="pill">Aktif</span>'}</td>
    <td><button class="btn g sm ic" data-act="summary" data-id="${p.ID}" title="Unduh treatment summary (PDF)" aria-label="Unduh treatment summary ${esc(p.Nama)}"><i class="bi bi-file-earmark-pdf"></i></button></td></tr>`; }).join('')
    : `<tr><td colspan="9">${empty('bi-person-x', S.pasien.length ? 'Tidak ada pasien yang cocok dengan pencarian/filter.' : 'Belum ada pasien. ' + (isAdm() ? 'Klik “Tambah Pasien” untuk memulai.' : ''))}</td></tr>`;
  $('#pasienCount').textContent = `Menampilkan ${Math.min(300, rows.length)} dari ${S.pasien.length} pasien`;
}

// ═════════ RENDER: DETAIL PASIEN + CAREPATH ═════════
const kv = (l, v, m) => `<div><small>${l}</small><b class="${m ? 'num' : ''}">${v || '–'}</b></div>`;
function tabelTarget(c) {
  const T = targetsReal(c); if (!T.length) return '';
  return `<div class="tw"><table class="tbl tsm"><thead><tr><th>Target</th><th class="r">Fraksi</th><th class="r">Dosis/fx</th><th class="r">Total</th></tr></thead><tbody>${T.map(t => `<tr${t.tot ? ' class="rxtot"' : ''}><td><b>${esc(t.n)}</b></td><td class="r num">${t.f} fx</td><td class="r num">${t.d === '' ? '–' : t.d + ' cGy'}</td><td class="r num">${t.t} cGy</td></tr>`).join('')}</tbody></table></div>`;
}
function planBlock(c, p) {
  const st = planSt(c), cls = st === 'Disetujui' ? 'ok' : st === 'Revisi' ? 'bad' : 'y';
  const med = S.media.filter(m => m.IDPasien === p.ID);
  const bisaUp = (peran() === 'Fisikawan Medis' || isSA()) && st !== 'Disetujui' && !c.RadMulai;
  const bisaApv = (peran() === 'Dokter' || isSA()) && !c.RadMulai && planIsi(c);
  return `<div class="apv ${cls}"><div class="row" style="gap:8px"><b><i class="bi bi-patch-check"></i> Approval planning oleh dokter</b><span class="pill ${cls}">${st === 'Disetujui' ? 'Disetujui' : st === 'Revisi' ? 'Perlu revisi' : 'Menunggu approval'}</span>
    ${c.PlanApprover ? `<span class="muted" style="font-size:12px">${esc(c.PlanApprover)} · <span class="num">${esc(String(c.PlanApprovalWaktu).slice(0, 16))}</span></span>` : ''}<span class="sp"></span>
    ${bisaApv ? `<button class="btn sm" data-act="apvRev" data-id="${p.ID}"><i class="bi bi-arrow-counterclockwise"></i>Minta revisi</button><button class="btn sm n" data-act="apvOk" data-id="${p.ID}"><i class="bi bi-check2-circle"></i>Setujui planning</button>` : ''}</div>
    ${c.PlanApprovalCatatan ? `<div style="font-size:13px;margin-top:6px"><span class="muted">Catatan dokter:</span> ${esc(c.PlanApprovalCatatan)}</div>` : ''}</div>
  <div><div class="row" style="gap:8px;margin-bottom:8px"><b>Hasil planning (foto &amp; video)</b><span class="muted" style="font-size:12px">${med.length} berkas</span><span class="sp"></span>
    ${bisaUp ? `<button class="btn sm" data-act="mediaPick"><i class="bi bi-cloud-upload"></i>Unggah foto/video</button><input type="file" id="mediaFile" data-id="${p.ID}" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple hidden>` : ''}</div>
    <div class="media-g">${med.length ? med.map(m => `<div class="mitem"><button type="button" class="mthumb" data-act="mediaOpen" data-mid="${m.ID}" title="Lihat ${esc(m.Nama)}"><i class="bi ${String(m.Mime).indexOf('video') === 0 ? 'bi-play-circle-fill' : 'bi-image'}"></i><span>${esc(m.Nama)}</span><small class="num">${mb(+m.Ukuran || 0)} · ${esc(m.Pengguna)}</small></button>${bisaUp ? `<button type="button" class="btn g sm ic" data-act="mediaDel" data-mid="${m.ID}" aria-label="Hapus ${esc(m.Nama)}"><i class="bi bi-trash"></i></button>` : ''}</div>`).join('')
      : `<span class="muted" style="font-size:13px">${bisaUp ? 'Unggah tangkapan layar distribusi dosis, DVH, atau video plan untuk ditinjau dokter (maks 15 MB per berkas).' : 'Belum ada berkas hasil planning.'}</span>`}</div>
    <div id="upProg" class="hint" style="margin-top:6px"></div></div>${alertList(c)}`;
}
/** Log fraksi pasien + dosis harian (dosis saat fraksi itu dijalankan) & kumulatif. */
function dosisLog(id) {
  const c = cpOf(id); let kum = 0;
  return S.fraksiLog.filter(x => x.IDPasien === id).sort((a, b) => a.FraksiKe - b.FraksiKe).map(l => { const d = +l.Dosis || +c.Dosis || 0; kum = Math.round((kum + d) * 100) / 100; return Object.assign({}, l, { _d: d, _k: kum }); });
}
const dosisDiterima = id => { const L = dosisLog(id); return L.length ? L[L.length - 1]._k : 0; };
const gy = v => (Math.round((+v || 0) * 100) / 100) + ' cGy';
function alertList(c, kecil) {
  const A = jarr(c.Alerts); if (!A.length) return '';
  const done = +c.FraksiSelesai || 0;
  return `<div class="alrlist"><b style="font-size:13px"><i class="bi bi-bell"></i> Alert fraksi untuk radioterapis</b>${A.map(a => `<div class="alri ${+a.f === done + 1 && c.RadMulai && !c.RadSelesai ? 'now' : ''}"><span class="pill ${a.kirim ? 'ok' : +a.f <= done ? 'mut' : 'y'} num">Fx ${a.f}</span><span style="min-width:0">${esc(a.n)}</span><small class="muted num">${a.kirim ? 'WA terkirim ' + esc(String(a.kirim).slice(0, 16)) : +a.f <= done ? 'terlewati' : 'menunggu'}</small></div>`).join('')}</div>`;
}
const muLbl = x => esc(x.nama) + (x.energi ? ' · ' + esc(x.energi) : '');
function ringkasMU(F) { return jarr(F).map(x => `${muLbl(x)}: <b class="num">${x.deliver}</b>${x.deliver !== x.plan ? `<span class="muted num">/${x.plan}</span>` : ''}`).join(' · '); }
function detailPerubahan(x) {
  const d = (() => { try { return JSON.parse(x.Detail || '{}'); } catch (e) { return {}; } })(), o = [];
  if (d.teknik) o.push('Teknik ' + d.teknik[0] + ' → ' + d.teknik[1]);
  if (d.fraksi) o.push('Fraksi ' + d.fraksi[0] + ' → ' + d.fraksi[1]);
  if (d.dosis) o.push('Dosis/fx ' + d.dosis[0] + ' → ' + d.dosis[1] + ' cGy');
  if (d.total) o.push('Total ' + d.total[0] + ' → ' + d.total[1] + ' cGy');
  if (d.muReset) o.push('MU referensi diisi ulang di fraksi berikutnya');
  if (d.radiasiDihentikan) o.push('Radiasi dihentikan');
  return o.join(' · ');
}
function radBlock(c, p) {
  const ref = jarr(c.MUPlan), logs = dosisLog(p.ID), last = logs[logs.length - 1];
  const pr = S.perubahan.filter(x => x.IDPasien === p.ID).sort((a, b) => String(a.Waktu).localeCompare(String(b.Waktu)));
  const aktif = c.RadMulai && !c.RadSelesai;
  let h = `<div class="kv"><div style="grid-column:1/-1"><small>MU referensi per lapangan</small>${ref.length ? `<div class="row" style="gap:6px;margin-top:4px">${ref.map(x => `<span class="pill mono">${muLbl(x)} · ${x.mu} MU</span>`).join('')}</div>` : `<b>${aktif ? 'Belum ada — diisi petugas saat verifikasi fraksi berikutnya' : '–'}</b>`}</div></div>${alertList(c)}`;
  if (last && last.MUStatus === 'Parsial/Error') h += `<div class="warnbox"><i class="bi bi-exclamation-triangle-fill"></i><div><b>Catatan penting: fraksi ke-${last.FraksiKe} error/parsial</b> <span class="num muted">(${fd(last.Waktu)})</span><div style="margin-top:4px">${ringkasMU(last.MUData)} MU</div><div style="margin-top:2px">${esc(last.Catatan)}</div></div></div>`;
  if (pr.length || (aktif && bolehCatat())) h += `<div><div class="row" style="gap:8px;margin-bottom:8px"><b>Perubahan selama radiasi</b><span class="muted" style="font-size:12px">${pr.length} catatan</span><span class="sp"></span>${aktif && bolehCatat() ? `<button class="btn sm" data-act="perubahan" data-id="${p.ID}"><i class="bi bi-journal-plus"></i>Catat perubahan</button>` : ''}</div>
    ${pr.map(x => `<div class="prow"><span class="pill ${x.Jenis === 'Perubahan Dosis' ? 'bad' : x.Jenis === 'Perubahan Planning' ? 'y' : ''}">${esc(x.Jenis)}</span><div style="min-width:0"><div class="num muted" style="font-size:12px">${fd(x.Tanggal)} · diminta ${esc(x.DimintaOleh)} · dicatat ${esc(x.Pengguna)}</div><div>${esc(x.Catatan)}</div>${detailPerubahan(x) ? `<div class="muted" style="font-size:12px">${esc(detailPerubahan(x))}</div>` : ''}</div></div>`).join('')}</div>`;
  if (logs.length) h += `<details class="flog"><summary><b>Riwayat verifikasi fraksi</b> <span class="muted">(${logs.length})</span></summary><div class="tw"><table class="tbl tsm" style="min-width:820px"><thead><tr><th>Fx</th><th>Waktu selesai</th><th class="r">Dosis harian</th><th class="r">Dosis kumulatif</th><th>Petugas</th><th>MU terdeliver</th><th>Catatan</th></tr></thead><tbody>${logs.slice().reverse().map(x => `<tr${x.MUStatus === 'Parsial/Error' ? ' class="err"' : ''}><td class="num"><b>${x.FraksiKe}</b></td><td class="num">${esc(String(x.Waktu).slice(0, 16))}</td><td class="r num">${gy(x._d)}</td><td class="r num"><b>${gy(x._k)}</b></td><td>${esc(x.Petugas)}${x.Petugas2 ? ' &amp; ' + esc(x.Petugas2) : ''}</td><td>${x.MUData ? ringkasMU(x.MUData) : '–'}${x.MUStatus ? ` <span class="pill ${x.MUStatus === 'Parsial/Error' ? 'bad' : x.MUStatus === 'Sesuai' ? 'ok' : ''}" style="height:20px;font-size:11px">${esc(x.MUStatus)}</span>` : ''}</td><td>${esc(x.Catatan || '')}</td></tr>`).join('')}</tbody></table></div></details>`;
  return h;
}
function stageBody(i, c, p) {
  switch (ST[i].k) {
    case 'consult': return `<div class="kv">${kv('Tanggal', fd(c.ConsultTgl), 1)}${kv('Kasus', `<span class="pill">${esc(c.ConsultKasus)}</span>`)}${c.Diagnosa ? kv('Diagnosa', esc(c.Diagnosa)) : ''}${c.ConsultCatatan ? kv('Catatan klinis', esc(c.ConsultCatatan)) : ''}</div>`;
    case 'ct': return `<div class="kv">${kv('Tanggal simulasi', fd(c.CTTgl), 1)}${kv('Masker utama', `<span class="pill">${esc(c.CTMasker)}</span>`)}${kv('Masker 2', c.CTMasker2 ? `<span class="pill">${esc(c.CTMasker2)}</span>` : '')}${kv('Petugas', esc(String(c.CTPetugas || '').replace('; ', ' & ')))}</div>`;
    case 'contour': return `<div class="kv">${kv('Tanggal selesai', fd(c.ContourTgl), 1)}${kv('Jumlah fraksi penyinaran', c.Fraksi + ' fx', 1)}</div>${tabelTarget(c)}`;
    case 'plan': return `<div class="kv">${kv('Tanggal selesai', fd(c.PlanTgl), 1)}${kv('Teknik', `<span class="pill navy">${esc(c.Teknik)}</span>`)}${kv('Fisikawan medis', esc(c.Fisikawan))}</div>${planBlock(c, p)}`;
    case 'radiation': {
      const n = +c.Fraksi || 0, d = +c.FraksiSelesai || 0, pc = n ? Math.round(d / n * 100) : 0;
      return `<div class="kv">${kv('Mulai', fd(c.RadMulai), 1)}${kv('Selesai', fd(c.RadSelesai), 1)}${kv('Dosis diterima (target 1)', n ? (Math.round(dosisDiterima(p.ID) * 100) / 100) + ' / ' + totalRx(c) + ' cGy' : '–', 1)}</div>
      ${n ? `<div><div class="row" style="justify-content:space-between;margin-bottom:6px"><b>Progres fraksi: ${d} dari ${n}</b><span class="num link">${pc}%</span></div><div class="bar ${c.RadSelesai ? 'ok' : ''}"><i style="width:${pc}%"></i></div></div>${fxGrid(c)}` : ''}${radBlock(c, p)}`;
    }
    case 'rujuk': return `<div class="kv">${kv('Tanggal rujuk kembali', fd(c.RujukTgl), 1)}${c.RujukCatatan ? kv('Catatan dokter', esc(c.RujukCatatan)) : ''}</div>`;
  }
  return '';
}

function vDetail() {
  const p = pOf(S.detailId); const el = $('#v-detail');
  if (!p) { el.innerHTML = empty('bi-person-x', 'Pasien tidak ditemukan.'); return; }
  const c = cpOf(p.ID), now = cur(c);
  const stp = ST.map((s, i) => {
    const st = i < now ? 'done' : i === now ? 'active' : 'locked';
    const t = i > 0 ? diff(c[ST[i - 1].e] || c[ST[i - 1].s], c[s.s]) : null;
    return `<div class="stp ${st}"><div class="nd">${st === 'done' ? '<i class="bi bi-check-lg"></i>' : i + 1}</div><div><b>${i + 1}. ${s.n}</b><br><small class="num">${c[s.s] ? fd(c[s.s]) : st === 'locked' ? 'Terkunci' : 'Menunggu'}</small>${t != null ? `<br><span class="pill" style="height:20px;font-size:11px">TAT: ${t} hari</span>` : ''}${i === 4 && c.RadMulai && !c.RadSelesai ? `<br><span class="pill y" style="height:20px;font-size:11px">${c.FraksiSelesai || 0}/${c.Fraksi}</span>` : ''}</div></div>`;
  }).join('');
  const cards = ST.map((s, i) => {
    const st = i < now ? 'done' : i === now ? 'active' : 'locked';
    const started = i === 4 ? !!c.RadMulai : i === 3 ? planIsi(c) : s.done(c);
    let act = '';
    if (st !== 'locked' && can(i)) act = `<button class="btn ${st === 'active' && !started ? 'p' : ''} sm" data-act="stage" data-id="${p.ID}" data-k="${s.k}"><i class="bi ${started ? 'bi-pencil' : 'bi-plus-lg'}"></i>${started ? 'Ubah' : 'Isi'}</button>`;
    else if (st === 'active') act = `<span class="pill mut">Menunggu ${esc(s.who)}</span>`;
    const fx = i === 4 && c.RadMulai && !c.RadSelesai && can(4) && c.Fraksi ? `<button class="btn p" data-act="fraksi" data-id="${p.ID}"><i class="bi bi-shield-check"></i>Perbarui Status Fraksi</button>` : '';
    return `<div class="stage ${st}"><div class="si"><i class="bi ${st === 'locked' ? 'bi-lock' : s.ic}"></i></div><div class="sb">
      <div class="sh"><h3>Tahap ${i + 1}: ${s.n}</h3>${st === 'done' ? '<span class="pill ok">Selesai</span>' : st === 'active' ? (i === 3 && started ? `<span class="pill ${planSt(c) === 'Revisi' ? 'bad' : 'y'}">${planSt(c) === 'Revisi' ? 'Perlu revisi' : 'Menunggu approval dokter'}</span>` : `<span class="pill y">${started ? 'Berjalan' : 'Giliran sekarang'}</span>`) : '<span class="pill mut">Terkunci</span>'}<span class="muted" style="font-size:12px">Oleh: ${esc(s.who)}</span><span class="sp"></span>${act}</div>
      ${started ? stageBody(i, c, p) : st === 'locked' ? `<span class="muted">Menunggu tahap ${ST[i - 1].n} selesai.</span>` : ''}${fx}</div></div>`;
  }).join('');
  el.innerHTML = `<div class="stack">
  <div><button class="btn g sm" data-act="back"><i class="bi bi-arrow-left"></i>Kembali ke ${esc(TITLES[S.backTo] || 'Data Pasien')}</button></div>
  <div class="row"><h1 style="font:700 28px/36px Inter;letter-spacing:-.02em">${esc(p.Nama)}</h1><span class="pill mono">${esc(nrmT(p.NRM))}</span>${tipePill(p)}${tahapPill(c)}<span class="sp"></span><button class="btn" data-act="summary" data-id="${p.ID}"><i class="bi bi-file-earmark-pdf"></i>Treatment Summary</button>${isAdm() ? `<button class="btn" data-act="pasienEdit" data-id="${p.ID}"><i class="bi bi-pencil-square"></i>Edit Data Pasien</button>` : ''}</div>
  <div class="card"><div class="card-h"><i class="bi bi-person-vcard link"></i><div><h3 class="t">Ringkasan klinis &amp; demografi</h3><div class="sub">Dibuat ${fd(p.TglDibuat)} oleh ${esc(p.DibuatOleh)}</div></div></div>
    <div class="card-b info"><div class="bx"><h4>Identitas &amp; kontak</h4><div><small>Tanggal lahir</small><b class="num">${fd(p.TglLahir)}</b><div class="muted" style="font-size:12px">${umur(p.TglLahir)} tahun</div></div><div><small>Jenis kelamin</small><b>${esc(p.JenisKelamin) || '–'}</b></div><div><small>Telepon / WA</small><b class="num">${esc(p.NoHP)}</b></div><div><small>Tipe pasien</small><b>${p.TipePasien ? tipePill(p) + ' <span class="muted" style="font-weight:400">' + (p.TipePasien === 'IPD' ? 'Rawat inap' : 'Rawat jalan') + '</span>' : '–'}</b></div><div class="full"><small>Alamat domisili</small><b>${esc(p.Kota || p.Provinsi || p.Kecamatan ? [p.Alamat, p.Kecamatan ? 'Kec. ' + p.Kecamatan : '', p.Kota, p.Provinsi].filter(Boolean).join(', ') : p.Alamat) || '–'}</b></div></div>
    <div class="bx"><h4>Dokter, rujukan &amp; penjamin</h4><div class="full"><small>Dokter onkologi radiasi (DPJP)</small><b>${esc(p.DokterOnkologi)}</b></div><div><small>Kasus</small><b>${c.ConsultKasus ? `<span class="pill">${esc(c.ConsultKasus)}</span>` : '–'}</b></div><div><small>Payer (penjamin)</small><b>${p.Payer ? `<span class="pill">${esc(p.Payer)}</span>` : '–'}</b></div><div><small>Dokter perujuk</small><b>${esc(p.DokterPerujuk)}</b></div><div><small>RS perujuk</small><b>${esc(p.RSPerujuk)}</b></div></div></div></div></div>
  <div class="card"><div class="card-h"><div><div class="eyebrow" style="font:600 12px Inter;letter-spacing:.04em;color:var(--link)">ALUR LAYANAN PASIEN</div><h3 class="t">Alur perjalanan terapi radiasi</h3></div></div><div class="card-b"><div class="stepper">${stp}</div></div></div>
  <div class="stack" style="gap:16px"><h2 class="t">Riwayat &amp; status pelaksanaan tahapan</h2>${cards}</div></div>`;
}

function vCarepath() {
  const dk = [...new Set(S.pasien.map(p => p.DokterOnkologi).filter(Boolean))];
  const ok = tahapPeran();
  const base = S.pasien.filter(p => { const c = cpOf(p.ID); return !c.RujukTgl && ok.indexOf(cur(c)) >= 0 && (!S.cf.dokter || p.DokterOnkologi === S.cf.dokter) && (!S.cf.teknik || c.Teknik === S.cf.teknik) && (!S.cf.kasus || c.ConsultKasus === S.cf.kasus); });
  const cnt = ST.map((s, i) => base.filter(p => cur(cpOf(p.ID)) === i).length);
  const lama = p => { const c = cpOf(p.ID), i = cur(c); const ref = i > 0 ? (c[ST[i - 1].e] || c[ST[i - 1].s]) : p.TglDibuat; return i === 4 && c.RadMulai ? null : diff(String(ref || '').slice(0, 10), today()); };
  const rows = (S.cf.tahap === '' ? base : base.filter(p => cur(cpOf(p.ID)) === +S.cf.tahap)).slice().sort((a, b) => cur(cpOf(b.ID)) - cur(cpOf(a.ID)) || (lama(b) || 0) - (lama(a) || 0));
  $('#v-carepath').innerHTML = `<div class="stack">
  <div class="pagehead"><div><div class="eyebrow">Pasien dalam Perawatan Aktif</div><h1>Alur Layanan</h1><p>${ok.length < 6 ? 'Pasien yang menunggu tindakan Anda pada tahap ' + ok.map(i => ST[i].n).join(' &amp; ') + '.' : 'Pantau posisi setiap pasien dari konsultasi hingga rujuk kembali, beserta tahap yang sedang menunggu tindakan.'}</p></div></div>
  <div class="tabs" role="tablist" aria-label="Filter tahap"><button class="${S.cf.tahap === '' ? 'on' : ''}" data-act="cfTahap" data-v="" role="tab">Semua <span class="pill">${base.length}</span></button>${ST.map((s, i) => ok.indexOf(i) < 0 ? '' : `<button class="${S.cf.tahap === String(i) ? 'on' : ''}" data-act="cfTahap" data-v="${i}" role="tab"><i class="bi ${s.ic}"></i>${s.n} <span class="pill ${cnt[i] ? 'y' : 'mut'}">${cnt[i]}</span></button>`).join('')}</div>
  <div class="card"><div class="card-b row">
    <select class="input" style="width:auto;min-width:190px" data-bind="cf.dokter" aria-label="Filter dokter"><option value="">Semua dokter</option>${dk.map(d => `<option ${S.cf.dokter === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
    <select class="input" style="width:auto;min-width:150px" data-bind="cf.teknik" aria-label="Filter teknik"><option value="">Semua teknik</option>${TEKNIK.map(t => `<option ${S.cf.teknik === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <select class="input" style="width:auto;min-width:170px" data-bind="cf.kasus" aria-label="Filter kasus"><option value="">Semua kasus</option>${S.kasus.map(k => `<option ${S.cf.kasus === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>
    <span class="sp"></span><span class="muted">${rows.length} pasien</span></div></div>
  ${rows.length ? `<div class="grid g-cp">${rows.map(p => { const c = cpOf(p.ID), i = cur(c), n = +c.Fraksi || 0, d = +c.FraksiSelesai || 0, w = lama(p);
    let info;
    if (i === 4 && c.RadMulai) info = `<div><div class="row" style="justify-content:space-between;margin-bottom:6px"><span class="muted">Fraksi</span><b class="num">${d}/${n || '?'}</b></div><div class="bar"><i style="width:${n ? Math.round(d / n * 100) : 0}%"></i></div></div>`;
    else if (i === 3 && planIsi(c)) info = `<div class="row" style="gap:6px"><span class="pill ${planSt(c) === 'Revisi' ? 'bad' : 'y'}"><i class="bi bi-patch-question"></i>${planSt(c) === 'Revisi' ? 'Perencanaan perlu revisi' : 'Menunggu approval dokter'}</span></div>`;
    else info = `<div class="row" style="gap:6px;font-size:13px"><span class="muted">Menunggu</span><b>${esc(ST[Math.min(i, 5)].who)}</b>${w != null ? `<span class="pill ${w > 3 ? 'y' : 'mut'} num" style="margin-left:auto">${w} hari di tahap ini</span>` : ''}</div>`;
    return `<div class="card cpc" data-act="open" data-id="${p.ID}" tabindex="0">
    <div class="cpc-h"><div class="cpc-id"><b title="${esc(p.Nama)}">${esc(p.Nama)}</b><span class="mono muted">${esc(nrmT(p.NRM))}</span></div><div class="cpc-st">${tahapPill(c)}</div></div>
    ${mini(c)}<div class="cpc-i">${info}</div>
    <div class="cpc-f"><div class="cpc-tg">${c.Teknik ? `<span class="pill navy">${esc(c.Teknik)}</span>` : ''}${c.ConsultKasus ? `<span class="pill">${esc(c.ConsultKasus)}</span>` : ''}</div>
      <div class="cpc-dr"><span class="muted" title="${esc(p.DokterOnkologi)}"><i class="bi bi-person-badge"></i>${esc(p.DokterOnkologi)}</span><button class="btn g sm ic" data-act="summary" data-id="${p.ID}" title="Unduh treatment summary (PDF)" aria-label="Unduh treatment summary ${esc(p.Nama)}"><i class="bi bi-file-earmark-pdf"></i></button></div></div></div>`; }).join('')}</div>`
    : `<div class="card">${empty('bi-activity', 'Tidak ada pasien aktif pada tahap/filter ini.')}</div>`}</div>`;
}

// ═════════ RENDER: INVENTORY ═════════
function vInventory() {
  const inv = S.inv.filter(i => i.Aktif), tot = inv.reduce((s, i) => s + i.Stok, 0), re = inv.filter(i => stokSt(i) !== 'ok').length;
  const ed = canStok();
  const cards = inv.map(i => { const st = stokSt(i), dipakai = i.Reusable ? S.pasien.filter(p => { const c = cpOf(p.ID); return c.RadMulai && !c.RadSelesai && (c.CTMasker === i.Jenis || c.CTMasker2 === i.Jenis); }).length : 0; return `<div class="card inv ${st === 'ok' ? '' : st}"><div class="ib">
    <div class="inv-h"><h3 class="t">${esc(i.Jenis)}</h3>${stokPill(i)}</div>
    <div class="inv-tg">${i.Reusable ? '<span class="pill"><i class="bi bi-recycle"></i>Pakai ulang</span>' : '<span class="pill mut"><i class="bi bi-box"></i>Habis pakai</span>'}</div>
    <div class="box inv-box"><div class="ibx"><small>TERSEDIA</small><div class="big">${String(i.Stok).padStart(2, '0')}<small> pcs</small></div></div>
      <div class="ibx ibx-min ${st === 'ok' ? '' : 'warn'}"><div class="ibx-hd"><small>MINIMAL</small>${ed ? `<button type="button" class="ibx-edit" data-act="ambang" data-id="${i.ID}" title="Atur ambang minimal" aria-label="Atur ambang minimal ${esc(i.Jenis)}"><i class="bi bi-pencil-square"></i></button>` : ''}</div><div class="mid">${i.Min}<small> pcs</small></div></div></div>
    <div class="inv-meta muted"><span>Terakhir dipakai: <b class="num">${fd(i.TerakhirDipakai)}</b></span>${i.Reusable ? `<span>Sedang dipakai radiasi: <b class="num">${dipakai}</b> pasien</span>` : ''}</div></div>
    ${ed ? `<div class="ia"><button class="btn g" data-act="stok" data-id="${i.ID}" data-d="-1" aria-label="Kurangi stok ${esc(i.Jenis)}" ${i.Stok <= 0 ? 'disabled' : ''}><i class="bi bi-dash-lg"></i>Kurangi</button><button class="btn p" data-act="stok" data-id="${i.ID}" data-d="1" aria-label="Tambah stok ${esc(i.Jenis)}"><i class="bi bi-plus-lg"></i>Tambah</button></div>` : ''}</div>`; }).join('');
  const log = S.logStok.map(l => { const p = l.IDPasien ? pOf(l.IDPasien) : null; return `<tr><td class="num">${esc(String(l.Waktu).slice(0, 16))}</td><td><b>${esc(l.Jenis)}</b></td><td class="num chg ${l.Perubahan > 0 ? 'pos' : 'neg'}">${l.Perubahan > 0 ? '+' : ''}${l.Perubahan}</td><td class="num">${l.StokSetelah}</td><td>${esc(l.Alasan)}${p ? ` <span class="muted">· ${esc(p.Nama)}</span>` : ''}</td><td>${esc(l.Pengguna)}</td></tr>`; }).join('');
  $('#v-inventory').innerHTML = `<div class="stack">
  <div class="pagehead"><div><div class="eyebrow">Alat Fiksasi Pasien</div><h1>Persediaan Masker Fiksasi</h1><p>Pantau persediaan masker fiksasi dan atur sesuai kondisi stok fisik di Rumah Sakit.</p></div><span class="sp"></span>
    ${ed ? '<button class="btn" data-act="jenis"><i class="bi bi-plus-circle"></i>Tambah Jenis</button><button class="btn p" data-act="opname"><i class="bi bi-clipboard-check"></i>Stok Opname</button>' : '<span class="pill mut"><i class="bi bi-eye"></i>Hanya lihat</span>'}</div>
  <div class="tabs" role="tablist"><button class="${S.invTab === 'stok' ? 'on' : ''}" data-act="tab" data-t="invTab" data-v="stok" role="tab"><i class="bi bi-layers"></i>Stok fisik <span class="pill">${inv.length} jenis</span></button><button class="${S.invTab === 'log' ? 'on' : ''}" data-act="tab" data-t="invTab" data-v="log" role="tab"><i class="bi bi-journal-text"></i>Log pemakaian &amp; mutasi</button></div>
  ${S.invTab === 'stok' ? `<div class="grid g3e">${kpi('Total masker', tot, 'pcs', 'bi-box-seam', false, '<span>Semua jenis aktif</span>')}${kpi('Perlu re-order', re, 'kategori', 'bi-cart-plus', true, '<span>Stok ≤ ambang minimum</span>')}${kpi('Jenis aktif', inv.length, '', 'bi-tags', false, '<span>Kelola via Tambah Jenis</span>')}</div>
  <div class="grid g-inv">${cards || ''}</div>${inv.length ? '' : `<div class="card">${empty('bi-box', 'Belum ada jenis masker.')}</div>`}`
  : `<div class="card"><div class="tw"><table class="tbl"><thead><tr><th>Waktu</th><th>Jenis</th><th>Perubahan</th><th>Stok akhir</th><th>Alasan</th><th>Oleh</th></tr></thead><tbody>${log || `<tr><td colspan="6">${empty('bi-journal', 'Belum ada mutasi stok.')}</td></tr>`}</tbody></table></div></div>`}</div>`;
}

// ═════════ RENDER: REPORT TAT ═════════
const TS = [{ k: 'a', l: 'Konsultasi → CT Simulasi', s: 'Konsul → CT Sim' }, { k: 'b', l: 'CT Simulasi → Delineasi', s: 'CT Sim → Delineasi' }, { k: 'c', l: 'Delineasi → Perencanaan', s: 'Delineasi → Rencana' }, { k: 'd', l: 'Perencanaan → Radiasi #1', s: 'Rencana → Rad #1' }];
function repRows() {
  const f = S.rf;
  return S.pasien.filter(p => { const c = cpOf(p.ID); if (!c.ConsultTgl) return false;
    if (f.from && c.ConsultTgl < f.from) return false; if (f.to && c.ConsultTgl > f.to) return false;
    if (f.dokter && p.DokterOnkologi !== f.dokter) return false; if (f.teknik && c.Teknik !== f.teknik) return false;
    if (f.kasus && c.ConsultKasus !== f.kasus) return false; return true; });
}
function vReport() {
  const rows = repRows(), T = tg(), f = S.rf;
  const dk = [...new Set(S.pasien.map(p => p.DokterOnkologi).filter(Boolean))];
  const tt = rows.map(p => tat(cpOf(p.ID)));
  const av = {}; TS.forEach(s => { av[s.k] = avg(tt.map(x => x[s.k])); });
  let worst = null, wd = 0; TS.forEach(s => { const d = av[s.k] == null ? 0 : av[s.k] - T[s.k]; if (d > wd) { wd = d; worst = s.k; } });
  const kcards = TS.map((s, i) => { const a = av[s.k], d = a == null ? null : a - T[s.k], bn = worst === s.k;
    return `<div class="card kpi" style="${bn ? 'border-color:var(--yellow);box-shadow:0 0 0 2px var(--yellow)' : ''}"><div class="top"><div><div class="lb">Tahap ${['I', 'II', 'III', 'IV'][i]} ${bn ? '<span class="pill y" style="height:20px;font-size:11px">Bottleneck</span>' : ''}</div><div style="font-weight:600;margin-top:4px">${s.l}</div></div><div class="ico ${bn ? 'y' : ''}"><i class="bi ${bn ? 'bi-exclamation-triangle' : 'bi-check2-circle'}"></i></div></div>
    <div class="v num" style="font:600 32px/36px 'JetBrains Mono',monospace">${n1(a)}<small style="font:500 14px Inter;color:var(--muted)"> hari</small></div>
    <div class="ft"><span>Target RS: <b class="num">${T[s.k]} hari</b></span>${d == null ? '' : `<span class="pill ${d > 0 ? 'y' : 'ok'} num">${d > 0 ? '+' : ''}${n1(d)} hr</span>`}</div></div>`; }).join('');
  const insight = worst ? `Tahap <b>${TS.find(s => s.k === worst).l}</b> rata-rata ${n1(av[worst])} hari, melebihi target ${T[worst]} hari. Pertimbangkan meninjau beban kerja pada tahap ini.` : (rows.length ? 'Seluruh tahap berada dalam target operasional.' : 'Belum ada data TAT pada filter ini.');
  const cell = (v, t) => v == null ? '<td class="num">–</td>' : v > t ? `<td class="num warn">${v} d <i class="bi bi-exclamation-triangle-fill"></i></td>` : `<td class="num">${v} d</td>`;
  const body = rows.map(p => { const c = cpOf(p.ID), x = tat(c); return `<tr class="clk" data-act="open" data-id="${p.ID}"><td class="mono">${esc(nrmT(p.NRM))}</td><td><b>${esc(p.Nama)}</b></td><td>${esc(p.DokterOnkologi)}</td><td>${c.Teknik ? `<span class="pill">${esc(c.Teknik)}</span>` : '–'}</td>${cell(x.a, T.a)}${cell(x.b, T.b)}${cell(x.c, T.c)}${cell(x.d, T.d)}${x.total == null ? '<td class="num">–</td>' : `<td class="num" style="font-weight:600;color:${x.total > T.total ? 'var(--danger-text)' : 'var(--ok-text)'}">${x.total} d</td>`}<td class="num">${c.RadSelesai ? c.Fraksi + ' Fx (selesai)' : c.RadMulai ? (c.FraksiSelesai || 0) + '/' + c.Fraksi + ' Fx' : '–'}</td></tr>`; }).join('');
  $('#v-report').innerHTML = `<div class="stack">
  <div class="pagehead"><div><div class="eyebrow">Kinerja Klinis &amp; Operasional</div><h1>Laporan Turn Around Time (TAT)</h1><p>Ukur kecepatan layanan antartahap, dari konsultasi hingga radiasi pertama, terhadap target rumah sakit.</p></div><span class="sp"></span><button class="btn" data-act="csv"><i class="bi bi-download"></i>Export CSV</button></div>
  <div class="card"><div class="card-b row">
    <div class="fld"><label for="rfFrom">Dari (tgl Konsultasi)</label><input id="rfFrom" type="date" class="input" data-bind="rf.from" value="${esc(f.from)}"></div>
    <div class="fld"><label for="rfTo">Sampai</label><input id="rfTo" type="date" class="input" data-bind="rf.to" value="${esc(f.to)}"></div>
    <div class="fld"><label>Dokter</label><select class="input" data-bind="rf.dokter"><option value="">Semua dokter</option>${dk.map(d => `<option ${f.dokter === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div>
    <div class="fld"><label>Teknik</label><select class="input" data-bind="rf.teknik"><option value="">Semua teknik</option>${TEKNIK.map(t => `<option ${f.teknik === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="fld"><label>Kasus</label><select class="input" data-bind="rf.kasus"><option value="">Semua kasus</option>${S.kasus.map(k => `<option ${f.kasus === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></div>
    <button class="btn g" data-act="rfReset" style="align-self:flex-end"><i class="bi bi-arrow-counterclockwise"></i>Reset</button></div></div>
  <div class="grid g4">${kcards}</div>
  <div class="grid g2">
    <div class="card"><div class="card-h"><div><h3 class="t">Rata-rata TAT per tahap (hari)</h3><div class="sub">Realisasi vs target RS</div></div></div><div class="card-b"><div class="chart"><canvas id="chTat" aria-label="Grafik TAT per tahap"></canvas></div><div class="row" style="margin-top:12px;color:var(--muted);font-size:13px"><i class="bi bi-lightbulb" style="color:var(--yellow-text)"></i><span>${insight}</span></div></div></div>
    <div class="card"><div class="card-h"><div><h3 class="t">Tren durasi total s/d radiasi</h3><div class="sub">Rata-rata per bulan mulai radiasi · target ${T.total} hari</div></div></div><div class="card-b"><div class="chart"><canvas id="chTren" aria-label="Grafik tren durasi total"></canvas></div></div></div></div>
  ${htmlReportBaru()}
  <div class="card"><div class="card-h"><div><h3 class="t">Daftar pasien &amp; penguraian latensi</h3><div class="sub">Sel kuning = melampaui target tahap</div></div><span class="sp"></span><span class="muted num">${rows.length} pasien</span></div>
    <div class="tw"><table class="tbl" style="min-width:900px"><thead><tr><th>NRM</th><th>Pasien</th><th>Dokter</th><th>Teknik</th>${TS.map(s => `<th>${s.s}</th>`).join('')}<th>Total</th><th>Radiasi</th></tr></thead><tbody>${body || `<tr><td colspan="10">${empty('bi-bar-chart', 'Belum ada data pada filter ini.')}</td></tr>`}</tbody></table></div></div></div>`;
  mk('chTat', { type: 'bar', data: { labels: TS.map(s => tx(s.s)), datasets: [
    { label: tx('Realisasi'), data: TS.map(s => av[s.k] == null ? null : +n1(av[s.k])), backgroundColor: TS.map(s => s.k === worst ? '#FFC93C' : '#1F5FBF'), borderRadius: 4 },
    { label: tx('Target'), data: TS.map(s => T[s.k]), backgroundColor: css('--soft-h'), borderRadius: 4 }] },
    options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { beginAtZero: true, grid: { color: css('--border') } }, y: { grid: { display: false } } } } });
  const ser = monthly(6); const bucket = {}; rows.forEach(p => { const c = cpOf(p.ID), t = tat(c).total; if (t != null) (bucket[String(c.RadMulai).slice(0, 7)] = bucket[String(c.RadMulai).slice(0, 7)] || []).push(t); });
  mk('chTren', { type: 'line', data: { labels: ser.map(x => x.l), datasets: [
    { label: tx('Rata-rata (hari)'), data: ser.map(x => bucket[x.k] ? +n1(avg(bucket[x.k])) : null), borderColor: '#1F5FBF', backgroundColor: 'rgba(31,95,191,.12)', fill: true, tension: .3, spanGaps: true, pointRadius: 4 },
    { label: tx('Target maks'), data: ser.map(() => T.total), borderColor: '#FFC93C', borderDash: [6, 4], pointRadius: 0 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, grid: { color: css('--border') } }, x: { grid: { display: false } } } } });
  grafikReportBaru();
}
function exportCsv() {
  const T = tg(), rows = repRows();
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const head = ['NRM', 'Pasien', 'Dokter', 'Kasus', 'Teknik', 'Konsultasi->CT Simulasi', 'CT Simulasi->Delineasi', 'Delineasi->Perencanaan', 'Perencanaan->Radiasi', 'Total', 'Durasi radiasi'];
  const lines = [head.map(q).join(',')].concat(rows.map(p => { const c = cpOf(p.ID), x = tat(c); return [p.NRM, p.Nama, p.DokterOnkologi, c.ConsultKasus, c.Teknik, x.a, x.b, x.c, x.d, x.total, x.rad].map(q).join(','); }));
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'TAT_radioterapi_' + today() + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Export dibuat', rows.length + ' baris diekspor.', 'ok');
  } catch (e) { toast('Export gagal', 'Browser memblokir unduhan di dalam bingkai ini.', 'err'); }
}

// ═════════ RENDER: KELOLA USERS ═════════
const HAK = { 'Super Admin': 'Seluruh tahap, akun pengguna & konfigurasi', 'Admin': 'Data Pasien & Kalender', 'Dokter': 'Konsultasi, Delineasi, Persetujuan perencanaan, Rujuk Kembali (pasien sendiri)', 'Radioterapis': 'CT Simulasi, Radiasi, inventaris', 'Fisikawan Medis': 'Perencanaan' };
const RIC = { 'Super Admin': 'bi-shield-lock', 'Admin': 'bi-person-vcard', 'Dokter': 'bi-heart-pulse', 'Radioterapis': 'bi-lightning-charge', 'Fisikawan Medis': 'bi-cpu' };
function vUsers() {
  const U = S.users, cnt = r => U.filter(u => u.peran === r && u.aktif).length;
  const roles = Object.keys(HAK).map(r => `<div class="card rolecard ${r === 'Super Admin' ? 'sa' : ''}"><div class="row" style="justify-content:space-between"><div class="ico"><i class="bi ${RIC[r]}"></i></div><span class="pill ${r === 'Super Admin' ? '' : 'mut'}" style="${r === 'Super Admin' ? 'background:rgba(255,255,255,.16);color:#fff' : ''}">${cnt(r)} user</span></div><b>${r}</b><span class="muted" style="font-size:12px">${HAK[r]}</span></div>`).join('');
  const tab = S.userTab === 'cfg' && isSA() ? 'cfg' : 'users';
  const rowsU = U.map(u => `<tr><td><div class="row" style="flex-wrap:nowrap"><div class="avatar">${initials(u.nama)}</div><div><b>${esc(u.nama)}</b><div class="muted" style="font-size:12px">${esc(u.jabatan || '')}</div></div></div></td><td><span class="mono" style="font-size:13px">${esc(u.username)}</span>${u.adaPw ? '' : '<div><span class="pill bad" style="height:20px;font-size:11px;margin-top:4px">Password belum diatur</span></div>'}</td><td class="mono" style="font-size:13px">${esc(u.nohp || '–')}</td><td><span class="pill ${u.peran === 'Super Admin' ? 'navy' : ''}">${esc(u.peran)}</span></td><td class="muted" style="font-size:13px">${esc(HAK[u.peran] || '')}</td><td class="num muted" style="font-size:12px">${u.login ? esc(String(u.login).slice(0, 16)) : 'Belum pernah'}</td><td><label class="tg"><input type="checkbox" data-chg="utoggle" data-un="${esc(u.username)}" ${u.aktif ? 'checked' : ''} aria-label="Status aktif ${esc(u.nama)}"><i></i></label></td><td class="r"><button class="btn g sm ic" data-act="userEdit" data-un="${esc(u.username)}" aria-label="Ubah ${esc(u.nama)}"><i class="bi bi-pencil"></i></button></td></tr>`).join('');
  const T = S.cfg;
  const cfgHtml = `<div class="grid g2">
    <div class="card"><div class="card-h"><i class="bi bi-stopwatch link"></i><h3 class="t">Target TAT (hari)</h3></div><form id="cfgTat" class="card-b fgrid" novalidate>
      ${[['TARGET_CONSULT_CT', 'Konsultasi → CT Simulasi'], ['TARGET_CT_CONTOUR', 'CT Simulasi → Delineasi'], ['TARGET_CONTOUR_PLAN', 'Delineasi → Perencanaan'], ['TARGET_PLAN_RAD', 'Perencanaan → Radiasi #1'], ['TARGET_TOTAL', 'Total s/d radiasi']].map(([k, l]) => `<div class="fld"><label>${l}</label><input class="input mono" name="${k}" inputmode="decimal" value="${esc(T[k] || '')}"></div>`).join('')}</form></div>
    <div class="card"><div class="card-h"><i class="bi bi-whatsapp link"></i><h3 class="t">Notifikasi WhatsApp dokter (MPWA)</h3></div><form id="cfgWa" class="card-b fgrid" novalidate>
      <div class="hint full" style="margin:0 0 4px">Pesan otomatis dikirim ke <b>WA pribadi dokter onkologi</b> masing-masing pasien (No. HP di daftar pengguna) saat: <b>giliran Delineasi</b> (CT Simulasi selesai) dan <b>planning menunggu approval</b>.</div>
      <div class="fld full"><label>Status</label><select class="input" name="WA_AKTIF"><option value="YA" ${T.WA_AKTIF === 'YA' ? 'selected' : ''}>Aktif</option><option value="TIDAK" ${T.WA_AKTIF !== 'YA' ? 'selected' : ''}>Nonaktif</option></select></div>
      <div class="fld full"><label>URL server MPWA</label><input class="input mono" name="MPWA_URL" value="${esc(T.MPWA_URL || '')}"></div>
      <div class="fld"><label>Path endpoint</label><input class="input mono" name="MPWA_PATH" value="${esc(T.MPWA_PATH || '')}"></div>
      <div class="fld"><label>Sender (nomor pengirim)</label><input class="input mono" name="MPWA_SENDER" value="${esc(T.MPWA_SENDER || '')}"></div>
      <div class="fld full"><label>API key ${T.WA_KEY_ADA ? '<span class="pill ok" style="height:20px;font-size:11px;margin-left:6px"><i class="bi bi-check2"></i>tersimpan</span>' : '<span class="pill bad" style="height:20px;font-size:11px;margin-left:6px">belum diisi</span>'}</label><input class="input mono" type="password" name="MPWA_API_KEY" autocomplete="off" placeholder="${T.WA_KEY_ADA ? '•••••• tersimpan (kosongkan jika tidak diubah)' : 'Belum diisi'}"><div class="hint">Demi keamanan, API key yang tersimpan tidak ditampilkan lagi (kolom tetap kosong). Isi hanya bila ingin mengganti.</div></div></form></div></div>
    <div class="card"><div class="card-h"><i class="bi bi-upc-scan link"></i><h3 class="t">Baca stiker: AI (opsional)</h3></div><form id="cfgAi" class="card-b fgrid" novalidate>
      <div class="fld full"><label>API key Anthropic</label><input class="input mono" type="password" name="ANTHROPIC_API_KEY" autocomplete="off" placeholder="${T.AI_KEY_ADA ? '•••••• tersimpan (kosongkan jika tidak diubah)' : 'Kosong = pakai OCR Google Drive (gratis)'}"><div class="hint">Bawaan: OCR Google Drive, gratis, data tetap di Google. Jika diisi, stiker dikirim ke Anthropic (berbayar, lebih akurat); pastikan sudah disetujui kebijakan privasi RS.</div></div>
      <div class="fld full"><label>Model</label><input class="input mono" name="ANTHROPIC_MODEL" value="${esc(T.ANTHROPIC_MODEL || '')}"></div></form></div>
    <div class="row"><button class="btn p" data-act="saveCfg" id="cfgSave"><i class="bi bi-check2"></i>Simpan pengaturan</button><button class="btn" data-act="testWA"><i class="bi bi-send"></i>Kirim tes WhatsApp</button></div>`;
  $('#v-users').innerHTML = `<div class="stack">
  <div class="pagehead"><div><div class="eyebrow">Keamanan &amp; Hak Akses</div><h1>Manajemen Pengguna</h1><p>Atur akun, peran, dan kewenangan klinis Dokter, Radioterapis, Fisikawan Medis, serta Admin.</p></div><span class="sp"></span><button class="btn p" data-act="userNew"><i class="bi bi-person-plus"></i>Tambah Pengguna</button></div>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr))">${roles}</div>
  ${isSA() ? `<div class="tabs"><button class="${tab === 'users' ? 'on' : ''}" data-act="tab" data-t="userTab" data-v="users"><i class="bi bi-people"></i>Pengguna</button><button class="${tab === 'cfg' ? 'on' : ''}" data-act="tab" data-t="userTab" data-v="cfg"><i class="bi bi-sliders"></i>Pengaturan</button></div>` : ''}
  ${tab === 'users' ? `<div class="card"><div class="card-h"><i class="bi bi-person-gear link"></i><div><h3 class="t">Daftar akun pengguna</h3><div class="sub">Masuk dengan username &amp; password · akun nonaktif tidak dapat masuk</div></div></div><div class="tw"><table class="tbl" style="min-width:980px"><thead><tr><th>Pengguna</th><th>Username</th><th>No. HP</th><th>Peran</th><th>Hak ubah</th><th>Login terakhir</th><th>Aktif</th><th></th></tr></thead><tbody>${rowsU || `<tr><td colspan="8">${empty('bi-people', 'Belum ada pengguna.')}</td></tr>`}</tbody></table></div></div>` : cfgHtml}</div>`;
}

// ═════════ RENDER ENGINE ═════════
const RENDER = { dashboard: vDashboard, pasien: vPasien, detail: vDetail, carepath: vCarepath, calendar: vCalendar, inventory: vInventory, report: vReport, users: vUsers };
function renderView(v) { S.dirty.delete(v); if (demoOn()) demoSiap(); try { RENDER[v](); } catch (e) { console.error(e); $('#v-' + v).innerHTML = empty('bi-exclamation-triangle', 'Gagal menampilkan halaman: ' + esc(e.message)); } }
function dirtyAll() { VIEWS.forEach(v => S.dirty.add(v)); }
function render() { renderChrome(); renderView(S.view); }
function go(v, o) {
  o = o || {};
  if ((v === 'users' && !isSA()) || (v === 'inventory' && !lihatInv())) v = 'dashboard';
  S.view = v;
  $$('.view').forEach(x => x.classList.toggle('on', x.id === 'v-' + v));
  const navKey = v === 'detail' ? S.backTo : v;
  $$('#nav a').forEach(a => { const on = a.dataset.v === navKey; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.body.classList.remove('drawer');
  if (S.dirty.has(v) || o.force) renderView(v);
  renderChrome();
  window.scrollTo(0, 0);
}
function openDetail(id) { if (S.view !== 'detail') S.backTo = S.view; S.detailId = id; S.dirty.add('detail'); go('detail', { force: true }); }

// ═════════ MODAL, FORM, TOAST ═════════
let FORM = null;
function modal(o) {
  $('#modalHost').innerHTML = `<div class="modal" data-act="mbg"><div class="mbox ${o.size || ''}" role="dialog" aria-modal="true" aria-label="${esc(o.title)}">
  <div class="mh"><div class="ico"><i class="bi ${o.icon || 'bi-pencil'}"></i></div><div><h2>${esc(o.title)}</h2>${o.sub ? `<p>${esc(o.sub)}</p>` : ''}</div><button type="button" class="btn g ic sm" style="margin-left:auto" data-act="mclose" aria-label="Tutup"><i class="bi bi-x-lg"></i></button></div>
  <form id="mform" novalidate><div class="mb">${o.body}<div class="formerr" id="ferr" role="alert"></div></div>
  <div class="mf">${o.note ? `<span class="note">${o.note}</span>` : ''}<span class="sp"></span><button type="button" class="btn g" data-act="mclose">Batal</button><button type="submit" class="btn ${o.okCls || 'p'}"><i class="bi ${o.okIc || 'bi-check2'}"></i>${esc(o.ok || 'Simpan')}</button></div></form></div></div>`;
  FORM = o.onSubmit;
  setTimeout(() => { const f = $('#mform input:not([type=hidden]):not([readonly]):not([type=checkbox]),#mform select,#mform textarea'); if (f) f.focus(); }, 30);
}
function closeModal() { $('#modalHost').innerHTML = ''; FORM = null; }
function clearErr() { $$('#mform .ferr').forEach(e => { e.textContent = ''; }); $$('#mform .bad').forEach(e => e.classList.remove('bad')); const b = $('#ferr'); if (b) b.textContent = ''; }
function setErr(msg, field) {
  clearErr(); const e = field && $('#e_' + field), el = field && $('#f_' + field);
  if (e) { e.textContent = msg; if (el) { el.classList.add('bad'); el.focus(); } } else { const b = $('#ferr'); if (b) b.textContent = msg; }
  return false;
}
function fld(o) {
  const id = 'f_' + o.n, v = o.v == null ? '' : o.v; let ctl;
  if (o.t === 'select') ctl = `<select class="input" id="${id}" name="${o.n}">${o.opts.map(x => `<option value="${esc(x.v)}" ${String(x.v) === String(v) ? 'selected' : ''} ${x.dis ? 'disabled' : ''}>${esc(x.t)}</option>`).join('')}</select>`;
  else if (o.t === 'textarea') ctl = `<textarea class="input" id="${id}" name="${o.n}" placeholder="${esc(o.ph || '')}">${esc(v)}</textarea>`;
  else ctl = `<input class="input ${o.mono ? 'mono' : ''}" id="${id}" name="${o.n}" type="${o.t || 'text'}" value="${esc(v)}" ${o.min ? `min="${o.min}"` : ''} ${o.step ? `step="${o.step}"` : ''} ${o.list ? `list="${o.list}"` : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.ro ? 'readonly' : ''} ${o.t === 'number' ? 'inputmode="decimal"' : ''} autocomplete="off">`;
  return `<div class="fld ${o.cls || ''}"><label for="${id}">${o.l}${o.req ? ' <b class="rq">*</b>' : ''}</label>${ctl}${o.hint ? `<div class="hint">${o.hint}</div>` : ''}<div class="ferr" id="e_${o.n}"></div></div>`;
}
const obj = form => { const o = {}; new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; }); return o; };
function toast(title, msg, type) {
  const t = document.createElement('div'); t.className = 'toast ' + (type || '');
  t.innerHTML = `<i class="bi ${type === 'ok' ? 'bi-check-circle-fill' : type === 'err' ? 'bi-x-octagon-fill' : type === 'warn' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'}"></i><div><b>${esc(title)}</b><span>${esc(msg || '')}</span></div>`;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), type === 'err' ? 6500 : 3800);
}

// ═════════ SINKRON BACKGROUND (optimistic UI, antrean berurutan) ═════════
function api(fn) {
  const args = Array.prototype.slice.call(arguments, 1);
  return panggil({ action: 'rpc', token: TOKEN, fn: fn, args: args }).then(r => {
    if (r && r.sesi === false) { sesiHabis(r.message); throw new Error(r.message); }
    if (r && r.success) return r;
    throw new Error(r ? r.message : 'Server tidak merespons.');
  });
}
let chain = Promise.resolve();
function sync(fn, args, onOk) {
  S.pending++; S.versi = (S.versi || 0) + 1; setSync();
  chain = chain.then(() => api.apply(null, [fn].concat(args))).then(r => {
    S.pending--; setSync();
    if (r.data && r.data.wa === 'gagal') toast('WA ke dokter gagal terkirim', 'Data tersimpan. Periksa No. HP dokter di Kelola Users / Log Aktivitas.', 'warn');
    if (S.pending === 0) merge(r.data);
    if (onOk) onOk(r.data);
  }).catch(e => { S.pending--; setSync(); if (!TOKEN) return; toast('Gagal menyimpan', e.message, 'err'); return reload(true); });
  return chain;
}
function merge(d) {
  if (!d) return;
  if (d.pasien) { const i = S.pasien.findIndex(x => x.ID === d.pasien.ID); if (i < 0) S.pasien.unshift(d.pasien); else S.pasien[i] = d.pasien; }
  if (d.cp) S.cp[d.cp.ID] = d.cp;
  ['inv', 'logStok', 'akt', 'kasus', 'users', 'staf', 'fraksiLog', 'perubahan', 'media', 'agenda'].forEach(k => { if (d[k]) S[k] = d[k]; });
  if (d.cfg) S.cfg = d.cfg;
  dirtyAll(); render();
}
function reload(silent) {
  if (!TOKEN) return Promise.resolve();
  const v0 = S.versi || 0;
  return api('getAppData').then(r => { if (S.pending || (S.versi || 0) !== v0) return; load(r.data); dirtyAll(); render(); if (!silent) toast('Data diperbarui', '', 'ok'); })
    .catch(e => { if (!silent) toast('Gagal memuat', e.message, 'err'); });
}

// ═════════ FORM: PASIEN ═════════
const FLD_PASIEN = ['Nama', 'NRM', 'TglLahir', 'JenisKelamin', 'NoHP', 'Alamat', 'Kecamatan', 'Kota', 'Provinsi', 'TipePasien', 'Payer', 'DokterPerujuk', 'RSPerujuk', 'DokterOnkologi'];
const PROVINSI = ['Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau', 'Jambi', 'Sumatera Selatan', 'Kepulauan Bangka Belitung', 'Bengkulu', 'Lampung',
  'DKI Jakarta', 'Jawa Barat', 'Banten', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
  'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara', 'Sulawesi Utara', 'Gorontalo', 'Sulawesi Tengah',
  'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tenggara', 'Maluku', 'Maluku Utara', 'Papua', 'Papua Barat', 'Papua Barat Daya', 'Papua Tengah', 'Papua Pegunungan', 'Papua Selatan'];
const kapital = s => String(s || '').toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase());
/** Nama provinsi baku dari teks bebas ("DKI JAKARTA", "Jabar", "Prov. Jawa Barat"). */
function provinsiBaku(t) {
  const x = String(t || '').toLowerCase().replace(/^(prov\.?|provinsi)\s+/, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim(); if (!x) return '';
  const alias = { 'jakarta': 'DKI Jakarta', 'dki': 'DKI Jakarta', 'jabar': 'Jawa Barat', 'jateng': 'Jawa Tengah', 'jatim': 'Jawa Timur', 'yogyakarta': 'DI Yogyakarta', 'diy': 'DI Yogyakarta', 'ntb': 'Nusa Tenggara Barat', 'ntt': 'Nusa Tenggara Timur', 'sumut': 'Sumatera Utara', 'sumbar': 'Sumatera Barat', 'sumsel': 'Sumatera Selatan', 'kepri': 'Kepulauan Riau', 'babel': 'Kepulauan Bangka Belitung', 'bangka belitung': 'Kepulauan Bangka Belitung', 'sulsel': 'Sulawesi Selatan', 'sulut': 'Sulawesi Utara', 'kaltim': 'Kalimantan Timur', 'kalbar': 'Kalimantan Barat' };
  const y = x.replace(/sumatra/g, 'sumatera').replace(/^d ?i /, 'di ');
  return PROVINSI.find(p => p.toLowerCase() === y || p.toLowerCase() === 'dki ' + y) || alias[y] || alias[y.replace(/^dki /, '')] || (/^dki\b/.test(y) ? 'DKI Jakarta' : '');
}
/** Pecah alamat bebas (stiker/data lama) → {Alamat, Kecamatan, Kota, Provinsi}. Bagian yang tidak yakin dibiarkan kosong. */
function pecahAlamat(alamat) {
  const seg = String(alamat || '').split(',').map(x => x.replace(/\b\d{5}\b/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean), o = { Kecamatan: '', Kota: '', Provinsi: '' }, pakai = {};
  seg.forEach((x, i) => {
    if (/^(kec\.?|kecamatan)\s+/i.test(x)) { o.Kecamatan = kapital(x.replace(/^(kec\.?|kecamatan)\s+/i, '')); pakai[i] = 1; }
    else if (/^(kota adm\.?|kota administrasi|kota|kab\.?|kabupaten|kotamadya)\s+/i.test(x)) { o.Kota = kapital(x.replace(/^(kota adm\.?|kota administrasi|kota|kab\.?|kabupaten|kotamadya)\s+/i, '')); pakai[i] = 1; }
    else if (/^(prov\.?|provinsi)\s+/i.test(x) || (i === seg.length - 1 && provinsiBaku(x))) { o.Provinsi = provinsiBaku(x) || kapital(x.replace(/^(prov\.?|provinsi)\s+/i, '')); pakai[i] = 1; }
  });
  const jalan = s => /^(rt|rw|no\.?|jl\.?|jln\.?|jalan|blok|gg\.?|gang|kel\.?|kelurahan|desa|ds\.?|komp\.?|komplek|perum\.?|perumahan|dusun|kp\.?|kampung)\b/i.test(s) || /\d/.test(s);
  if (!o.Kota) { const i = seg.findIndex((x, j) => !pakai[j] && j > 0 && j === seg.length - 1 - (o.Provinsi ? 1 : 0) && !jalan(x)); if (i >= 0) { o.Kota = kapital(x2(seg[i])); pakai[i] = 1; } }
  function x2(v) { return v.replace(/^dki\s+/i, ''); }
  if (!o.Provinsi && /jakarta/i.test(o.Kota)) o.Provinsi = 'DKI Jakarta';
  o.Alamat = seg.filter((x, j) => !pakai[j]).join(', ');
  return o;
}
const kotaP = p => p.Kota || kotaDari(p.Alamat);
const provP = p => p.Provinsi || pecahAlamat(p.Alamat).Provinsi;
const kecP = p => p.Kecamatan || pecahAlamat(p.Alamat).Kecamatan;
function openPasienForm(id) {
  if (!isAdm()) return toast('Tidak berwenang', 'Hanya Admin yang dapat mengubah Data Pasien.', 'err');
  if (id && demoOn()) return toast('Mode demo aktif', 'Nonaktifkan mode demo untuk mengubah data pasien.', 'warn');
  S.editingId = id || null;
  let p = id ? pOf(id) : {}; const pAsli = p, dok = dpjpList();
  const dpjpOpts = [{ v: '', t: '— pilih dokter —' }].concat((p.DokterOnkologi && dok.indexOf(p.DokterOnkologi) < 0 ? [p.DokterOnkologi] : []).concat(dok).map(n => ({ v: n, t: n })));
  const payer = [...new Set(['BPJS Kesehatan', 'Asuransi Swasta', 'Umum / Pribadi', 'Perusahaan'].concat(S.pasien.map(x => x.Payer).filter(Boolean)))];
  const kotaL = [...new Set(S.pasien.map(kotaP).filter(Boolean))].sort(), kecL = [...new Set(S.pasien.map(x => x.Kecamatan).filter(Boolean))].sort();
  if (id && !p.Kota && !p.Provinsi && p.Alamat) p = Object.assign({}, p, (q => ({ Kecamatan: q.Kecamatan, Kota: q.Kota, Provinsi: q.Provinsi }))(pecahAlamat(p.Alamat)));
  const ai = true;
  modal({ icon: 'bi-person-plus', size: 'lg', title: id ? 'Ubah Data Pasien' : 'Tambah Pasien Baru', sub: 'Registrasi identitas, rujukan, dan penjamin', ok: id ? 'Simpan perubahan' : 'Simpan Data Pasien', note: '<i class="bi bi-lock"></i>Akses terbatas staf terdaftar',
    body: `<datalist id="dlPayer">${payer.map(d => `<option value="${esc(d)}">`).join('')}</datalist><datalist id="dlKota">${kotaL.map(d => `<option value="${esc(d)}">`).join('')}</datalist><datalist id="dlKec">${kecL.map(d => `<option value="${esc(d)}">`).join('')}</datalist>
    <div class="stk" id="stkZone"><div class="stk-i"><i class="bi bi-upc-scan"></i></div>
      <div class="stk-t"><b>Isi otomatis dari stiker pasien</b><span id="stkMsg">${ai ? 'Tempel gambar (Ctrl+V), seret ke sini, atau pilih file/foto.' : ''}</span></div>
      <img id="stkImg" alt="Pratinjau stiker pasien" hidden><button type="button" class="btn sm" data-act="stkPick" ${ai ? '' : 'disabled'}><i class="bi bi-upload"></i>Pilih gambar</button><input type="file" id="stkFile" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden></div>
    <div class="fgrid c6">
    <div class="fsec">Identitas pasien</div>
    ${fld({ n: 'Nama', l: 'Nama lengkap pasien', req: 1, v: p.Nama, cls: 's4' })}
    ${fld({ n: 'JenisKelamin', l: 'Jenis kelamin', req: 1, t: 'select', v: p.JenisKelamin || '', opts: [{ v: '', t: '— pilih —' }, { v: 'Laki-laki', t: 'Laki-laki' }, { v: 'Perempuan', t: 'Perempuan' }], cls: 's2' })}
    ${fld({ n: 'NRM', l: 'No. rekam medis (NRM)', req: 1, v: p.NRM, mono: 1, cls: 's2', hint: 'Angka saja, tanpa nol di depan.' })}
    ${fld({ n: 'TglLahir', l: 'Tanggal lahir', req: 1, t: 'date', v: p.TglLahir, cls: 's2' })}
    ${fld({ n: 'NoHP', l: 'No. HP (WhatsApp)', req: 1, t: 'tel', v: p.NoHP, mono: 1, cls: 's2', ph: '0812-xxxx-xxxx' })}
    <div class="fsec">Alamat domisili</div>
    ${fld({ n: 'Kecamatan', l: 'Kecamatan', req: 1, v: p.Kecamatan, list: 'dlKec', cls: 's2' })}
    ${fld({ n: 'Kota', l: 'Kota / Kabupaten', req: 1, v: p.Kota, list: 'dlKota', cls: 's2', ph: 'mis. Jakarta Utara' })}
    ${fld({ n: 'Provinsi', l: 'Provinsi', req: 1, t: 'select', v: p.Provinsi || '', opts: [{ v: '', t: '— pilih provinsi —' }].concat((p.Provinsi && PROVINSI.indexOf(p.Provinsi) < 0 ? [p.Provinsi] : []).concat(PROVINSI).map(x => ({ v: x, t: x }))), cls: 's2' })}
    ${fld({ n: 'Alamat', l: 'Jalan / RT / RW (opsional)', v: p.Alamat, cls: 's6', ph: 'mis. Jl. Boulevard Barat Blok LC-7 No. 12, RT 04/RW 09' })}
    <div class="fsec">Layanan &amp; penjamin</div>
    ${fld({ n: 'TipePasien', l: 'Tipe pasien', req: 1, t: 'select', v: p.TipePasien || '', opts: [{ v: '', t: '— pilih —' }, { v: 'OPD', t: 'OPD · Rawat jalan' }, { v: 'IPD', t: 'IPD · Rawat inap' }], cls: 's2' })}
    ${fld({ n: 'Payer', l: 'Payer (penjamin)', req: 1, v: p.Payer, list: 'dlPayer', ph: 'mis. BPJS Kesehatan', cls: 's4' })}
    <div class="fsec">Rujukan &amp; dokter</div>
    ${fld({ n: 'DokterPerujuk', l: 'Dokter perujuk', req: 1, v: p.DokterPerujuk, cls: 's3' })}
    ${fld({ n: 'RSPerujuk', l: 'Rumah sakit perujuk', req: 1, v: p.RSPerujuk, cls: 's3' })}
    ${fld({ n: 'DokterOnkologi', l: 'Dokter onkologi radiasi (DPJP)', req: 1, t: 'select', v: p.DokterOnkologi || '', opts: dpjpOpts, cls: 's6', hint: dok.length ? '' : 'Belum ada pengguna berperan Dokter. Tambahkan di Kelola Users.' })}</div>`,
    onSubmit: form => {
      const d = obj(form); clearErr(); FLD_PASIEN.forEach(k => { d[k] = bersihNull(d[k]); }); d.NRM = normNRM(d.NRM);
      const lbl = { Nama: 'Nama', NRM: 'NRM', TglLahir: 'Tanggal lahir', JenisKelamin: 'Jenis kelamin', NoHP: 'No. HP', Kecamatan: 'Kecamatan', Kota: 'Kota/Kabupaten', Provinsi: 'Provinsi', TipePasien: 'Tipe pasien', Payer: 'Payer', DokterPerujuk: 'Dokter perujuk', RSPerujuk: 'RS perujuk', DokterOnkologi: 'Dokter onkologi radiasi' };
      for (const k in lbl) if (!d[k]) return setErr(k === 'NRM' ? 'NRM wajib diisi dan harus mengandung angka.' : lbl[k] + ' wajib diisi.', k);
      const dup = S.pasien.find(x => normNRM(x.NRM) === d.NRM && x.ID !== id);
      if (dup) return setErr('NRM sudah terdaftar atas nama ' + dup.Nama + '!', 'NRM');
      const rec = Object.assign({}, d, { ID: id || 'P' + Math.random().toString(36).slice(2, 12).padEnd(10, '0') });
      FLD_PASIEN.forEach(k => { rec[k] = d[k]; });
      if (id) { Object.assign(pAsli, d); }
      else { S.pasien.unshift(Object.assign({ TglDibuat: today(), DibuatOleh: S.me.nama }, rec)); cpOf(rec.ID); }
      S.akt.unshift({ Waktu: nowStr(), Pengguna: S.me.nama, Aksi: id ? 'Ubah Pasien' : 'Tambah Pasien', IDPasien: rec.ID, Tahap: '', Detail: d.Nama });
      closeModal(); dirtyAll(); render(); toast('Tersimpan', d.Nama + (id ? ' diperbarui.' : ' ditambahkan.'), 'ok');
      if (!id) openDetail(rec.ID);
      sync('simpanPasien', [rec]);
    } });
}

// ═════════ BACA STIKER PASIEN (tempel / seret / pilih gambar) ═════════
function resizeImg(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const k0 = Math.min(1, 2400 / Math.max(img.width, img.height)), w0 = Math.round(img.width * k0), h0 = Math.round(img.height * k0);
      const c0 = document.createElement('canvas'); c0.width = w0; c0.height = h0;
      const x0 = c0.getContext('2d'); x0.fillStyle = '#fff'; x0.fillRect(0, 0, w0, h0); x0.drawImage(img, 0, 0, w0, h0);
      let sx = 0, sy = 0, sw = w0, sh = h0;
      try { // potong otomatis area berisi tulisan (stiker kecil di kanvas putih besar) agar OCR lebih akurat
        const d = x0.getImageData(0, 0, w0, h0).data; let mnx = w0, mny = h0, mxx = -1, mxy = -1;
        for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) { const i = (y * w0 + x) * 4; if ((d[i] + d[i + 1] + d[i + 2]) / 3 < 190) { if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (y < mny) mny = y; if (y > mxy) mxy = y; } }
        if (mxx - mnx > 20 && mxy - mny > 10) { const p = 14; sx = Math.max(0, mnx - p); sy = Math.max(0, mny - p); sw = Math.min(w0, mxx + p) - sx; sh = Math.min(h0, mxy + p) - sy; }
      } catch (e) { /* pakai gambar utuh */ }
      const k = Math.min(3, 1800 / Math.max(sw, sh)), cv = document.createElement('canvas');
      cv.width = Math.round(sw * k); cv.height = Math.round(sh * k);
      const cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(c0, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
      const u = cv.toDataURL('image/jpeg', 0.92); res({ url: u, b64: u.split(',')[1] });
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('File bukan gambar yang valid.')); };
    img.src = url;
  });
}
function stkMsg(t, cls) { const m = $('#stkMsg'); if (m) { m.textContent = t; m.className = cls || ''; } }
function stikerFile(file) {
  if (!$('#stkZone') || !file) return;
  if (String(file.type).indexOf('image' + String.fromCharCode(47)) !== 0) return stkMsg('File harus berupa gambar (JPG/PNG/WebP).', 'err');
  stkMsg('Membaca stiker…', '');
  resizeImg(file).then(im => {
    const pv = $('#stkImg'); if (pv) { pv.src = im.url; pv.hidden = false; }
    return api('bacaStiker', im.b64, 'image/jpeg');
  }).then(r => {
    if (!$('#stkZone')) return;
    let n = 0; const F = r.data.f || {}, W = r.data.warn || [];
    if (F.Alamat) { const q = pecahAlamat(bersihNull(F.Alamat)); F.Alamat = q.Alamat; ['Kecamatan', 'Kota', 'Provinsi'].forEach(k => { if (q[k] && !F[k]) F[k] = q[k]; }); }
    FLD_PASIEN.forEach(k => { const v = bersihNull(F[k]), el = $('#f_' + k); if (v && el) { el.value = v; el.classList.add('auto'); n++; } });
    const nrm = $('#f_NRM'); if (nrm) nrm.dispatchEvent(new Event('input', { bubbles: true }));
    stkMsg(n ? n + ' kolom terisi (kuning) via ' + (r.data.mode === 'ai' ? 'AI' : 'OCR Drive') + '. Periksa kembali sebelum menyimpan.' + (W.length ? ' ⚠ ' + W.join(' ') : '') : 'Tidak ada data yang terbaca. Coba gambar yang lebih jelas.', n ? (W.length ? 'err' : 'ok') : 'err');
  }).catch(e => stkMsg(e.message, 'err'));
}

// ═════════ FORM: TAHAP CAREPATH ═════════
function bacaTarget(d) {
  const T = [];
  for (let i = 0; i < 3; i++) {
    const n = (d['tn' + i] || '').trim(), f = d['tf' + i], ds = d['td' + i], t = d['tt' + i];
    if (i > 0 && !n && !f && !ds && !t) continue;
    T.push({ n, f, d: ds, t, i });
  }
  return T;
}
function parseStage(k, d) {
  const E = (m, f) => ({ err: m, field: f }), isD = s => /^\d{4}-\d{2}-\d{2}$/.test(s || ''), num = v => { const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) && x > 0 ? x : NaN; };
  switch (k) {
    case 'consult': if (!isD(d.tgl)) return E('Tanggal wajib diisi.', 'tgl'); if (!d.kasus) return E('Kasus wajib diisi.', 'kasus'); if (!d.diagnosa) return E('Diagnosa wajib diisi.', 'diagnosa');
      return { p: { ConsultTgl: d.tgl, ConsultKasus: d.kasus, ConsultCatatan: d.catatan || '', Diagnosa: d.diagnosa || '' } };
    case 'ct': if (!isD(d.tgl)) return E('Tanggal wajib diisi.', 'tgl'); if (!d.masker) return E('Pilih masker.', 'masker');
      if (!d.petugas1) return E('Pilih petugas radioterapis 1.', 'petugas1'); if (d.petugas2 && d.petugas2 === d.petugas1) return E('Petugas 1 dan 2 tidak boleh sama.', 'petugas2');
      return { p: { CTTgl: d.tgl, CTMasker: d.masker, CTMasker2: d.masker2 || '', CTPetugas: [d.petugas1, d.petugas2].filter(Boolean).join('; ') } };
    case 'contour': { if (!isD(d.tgl)) return E('Tanggal wajib diisi.', 'tgl');
      const T = [];
      for (const t of bacaTarget(d)) {
        const lb = 'Target ' + (t.i + 1), f = num(t.f), ds = num(t.d), tt = num(t.t);
        if (!t.n) return E(lb + ': nama target wajib diisi.', 'tn' + t.i);
        if (isNaN(f) || f !== Math.floor(f)) return E(lb + ': fraksi harus bilangan bulat > 0.', 'tf' + t.i);
        if (isNaN(ds)) return E(lb + ': dosis/fraksi harus angka > 0.', 'td' + t.i);
        if (isNaN(tt)) return E(lb + ': total dosis harus angka > 0.', 'tt' + t.i);
        T.push({ n: t.n, f, d: ds, t: tt });
      }
      if (!T.length) return E('Target 1 wajib diisi.', 'tn0');
      const maxF = Math.max.apply(null, T.map(x => x.f)), fx = d.fraksiTotal === '' ? maxF : num(d.fraksiTotal);
      if (isNaN(fx) || fx !== Math.floor(fx)) return E('Jumlah fraksi penyinaran harus bilangan bulat.', 'fraksiTotal');
      if (fx < maxF) return E('Jumlah fraksi penyinaran minimal ' + maxF + ' (fraksi target terbanyak).', 'fraksiTotal');
      return { p: { ContourTgl: d.tgl, Fraksi: fx, Dosis: T[0].d, TotalDosis: T[0].t, Targets: JSON.stringify(T) }, send: { tgl: d.tgl, targets: T, fraksiTotal: fx } }; }
    case 'plan': if (!isD(d.tgl)) return E('Tanggal wajib diisi.', 'tgl'); if (TEKNIK.indexOf(d.teknik) < 0) return E('Pilih teknik.', 'teknik'); if (!d.fisikawan) return E('Pilih fisikawan medis.', 'fisikawan');
      return { p: { PlanTgl: d.tgl, Teknik: d.teknik, Fisikawan: d.fisikawan } };
    case 'radiation': if (!isD(d.mulai)) return E('Tanggal mulai wajib diisi.', 'mulai'); if (d.selesai && !isD(d.selesai)) return E('Tanggal selesai tidak valid.', 'selesai'); return { p: { RadMulai: d.mulai, RadSelesai: d.selesai || '' } };
    case 'rujuk': if (!isD(d.tgl)) return E('Tanggal wajib diisi.', 'tgl'); return { p: { RujukTgl: d.tgl, RujukCatatan: d.catatan || '' } };
  }
  return E('Tahap tidak dikenal.');
}
function orderErr(c, i, patch) {
  const m = Object.assign({}, c, patch), st = ST[i];
  if (i > 0 && !full(c, i - 1)) return 'Tahap ' + ST[i - 1].n + ' belum selesai. Tahap tidak boleh dilompati.';
  if (i > 0) { const pe = m[ST[i - 1].e] || m[ST[i - 1].s]; if (pe && m[st.s] < pe) return 'Tanggal ' + st.n + ' tidak boleh lebih awal dari tahap ' + ST[i - 1].n + ' (' + fd(pe) + ').'; }
  if (i === 4) { if (m.RadSelesai && m.RadSelesai < m.RadMulai) return 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.'; if (c.RujukTgl && !m.RadSelesai) return 'Tanggal selesai tidak boleh dikosongkan karena pasien sudah Rujuk Kembali.'; }
  if (i < 5) { const nd = c[ST[i + 1].s], mine = m[st.e] || m[st.s]; if (nd && mine && mine > nd) return 'Tanggal ' + st.n + ' tidak boleh melewati tahap sesudahnya (' + fd(nd) + ').'; }
  return '';
}
const pakaiUlang = j => { const it = S.inv.find(x => x.Jenis === j); return !!(it && it.Reusable); };
function invNet(c, patch) { const net = {}; [c.CTMasker, c.CTMasker2].filter(j => j && !pakaiUlang(j)).forEach(j => { net[j] = (net[j] || 0) + 1; }); [patch.CTMasker, patch.CTMasker2].filter(j => j && !pakaiUlang(j)).forEach(j => { net[j] = (net[j] || 0) - 1; }); return net; }
function invErr(c, patch) { const net = invNet(c, patch); for (const j in net) { const it = S.inv.find(x => x.Jenis === j); if (!it) return 'Jenis masker "' + j + '" tidak ada.'; if (it.Stok + net[j] < 0) return 'Stok ' + j + ' tidak cukup (tersisa ' + it.Stok + ' pcs).'; } return ''; }
function applyInv(c, patch, pid) {
  const net = invNet(c, patch), first = ![c.CTMasker, c.CTMasker2].some(Boolean);
  Object.keys(net).forEach(j => { if (!net[j]) return; const it = S.inv.find(x => x.Jenis === j); it.Stok += net[j]; if (net[j] < 0) it.TerakhirDipakai = today();
    S.logStok.unshift({ Waktu: nowStr(), Jenis: j, Perubahan: net[j], StokSetelah: it.Stok, Alasan: first ? 'Dipakai CT Simulasi' : 'Koreksi pilihan masker CT Simulasi', IDPasien: pid, Pengguna: S.me.nama }); });
}
/** Tanggal selesai Contouring/Planning: hari ini saat form dibuka; tanggal tersimpan dipertahankan bila tahap berikutnya sudah berjalan. */
const tglSelesai = (simpan, berikut, mn) => { if (simpan && berikut) return simpan; const t = today(); return mn && t < mn ? mn : t; };
const hintSelesai = (simpan, berikut) => simpan && berikut ? 'Tahap berikutnya sudah berjalan; tanggal tersimpan dipertahankan.' : 'Terisi otomatis tanggal hari ini' + (simpan && simpan !== today() ? ' (sebelumnya ' + fd(simpan) + ')' : '') + '; ubah bila perlu.';
const opsiNama = (list, cur, kosong) => [{ v: '', t: kosong || '— pilih —' }].concat((cur && list.indexOf(cur) < 0 ? [cur] : []).concat(list).map(n => ({ v: n, t: n })));
function barisTarget(T) {
  let h = '<div class="tgt hd"><span>Nama target</span><span>Fraksi</span><span>Dosis/fx (cGy)</span><span>Total (cGy)</span></div>';
  for (let i = 0; i < 3; i++) {
    const t = T[i] || {}, rq = i === 0;
    h += `<div class="tgt" data-row="${i}"><div class="fld"><input class="input" id="f_tn${i}" name="tn${i}" value="${esc(t.n || '')}" placeholder="${rq ? 'mis. PTV 50' : 'Target ' + (i + 1) + ' (opsional)'}" aria-label="Nama target ${i + 1}" autocomplete="off"><div class="ferr" id="e_tn${i}"></div></div>
      <div class="fld"><input class="input mono" id="f_tf${i}" name="tf${i}" type="number" step="1" min="1" inputmode="numeric" value="${t.f || ''}" aria-label="Fraksi target ${i + 1}"><div class="ferr" id="e_tf${i}"></div></div>
      <div class="fld"><input class="input mono" id="f_td${i}" name="td${i}" type="number" step="any" inputmode="decimal" value="${t.d || ''}" aria-label="Dosis per fraksi target ${i + 1}"><div class="ferr" id="e_td${i}"></div></div>
      <div class="fld"><input class="input mono" id="f_tt${i}" name="tt${i}" type="number" step="any" inputmode="decimal" value="${t.t || ''}" data-man="" aria-label="Total dosis target ${i + 1}"><div class="ferr" id="e_tt${i}"></div></div></div>`;
  }
  return h;
}
function barisAlert(j, a) {
  a = a || {};
  return `<div class="tgt alr" data-alr="${j}"><div class="fld"><input class="input mono" name="af_${j}" type="number" min="1" step="1" inputmode="numeric" value="${esc(a.f || '')}" placeholder="mis. 10" aria-label="Fraksi alert ${j + 1}"></div>
    <div class="fld"><input class="input" name="an_${j}" value="${esc(a.n || '')}" maxlength="300" placeholder="mis. CBCT verifikasi / foto port film / cek berat badan" aria-label="Catatan alert ${j + 1}"></div>
    <div>${a.kirim ? `<span class="pill ok" title="Terkirim ${esc(a.kirim)}" style="height:22px;font-size:11px"><i class="bi bi-check2"></i>WA</span>` : `<button type="button" class="btn g sm ic" data-act="alrDel" aria-label="Hapus alert"><i class="bi bi-x-lg"></i></button>`}</div></div>`;
}
function bacaAlerts(d, N) {
  const out = [];
  for (const r of $$('#alrRows [data-alr]')) { const j = r.dataset.alr, f = String(d['af_' + j] || '').trim(), n = String(d['an_' + j] || '').trim();
    if (!f && !n) continue;
    if (!(+f >= 1) || +f !== Math.floor(+f)) return { err: 'Alert: fraksi harus bilangan bulat ≥ 1.' };
    if (N && +f > N) return { err: 'Alert: fraksi ke-' + f + ' melebihi jumlah fraksi (' + N + ').' };
    if (!n) return { err: 'Alert fraksi ke-' + f + ': catatan wajib diisi.' };
    if (out.some(x => x.f === +f)) return { err: 'Alert untuk fraksi ke-' + f + ' ditulis lebih dari sekali; gabungkan catatannya.' };
    out.push({ f: +f, n }); }
  return { list: out.sort((x, y) => x.f - y.f) };
}
let PLAN_FILES = [];
function planList() {
  const el = $('#planList'); if (!el) return;
  el.innerHTML = PLAN_FILES.map((f, j) => `<div class="pli"><i class="bi ${f.type.indexOf('video') === 0 ? 'bi-film' : 'bi-image'}"></i><span>${esc(f.name)}</span><small class="num muted">${mb(f.size)}</small><span class="st" id="plst_${j}"></span><button type="button" class="btn g sm ic" data-act="planDel" data-j="${j}" aria-label="Batalkan ${esc(f.name)}"><i class="bi bi-x-lg"></i></button></div>`).join('');
}
function openStage(id, k) {
  const i = ST.findIndex(s => s.k === k), c = cpOf(id), p = pOf(id);
  if (!can(i)) return toast('Tidak berwenang', 'Peran Anda tidak dapat mengisi tahap ' + ST[i].n + '.', 'err');
  if (i > cur(c)) return toast('Tahap terkunci', 'Selesaikan tahap sebelumnya terlebih dahulu.', 'warn');
  const prevEnd = i > 0 ? (c[ST[i - 1].e] || c[ST[i - 1].s]) : '', mn = prevEnd || undefined;
  const hint = prevEnd ? 'Tidak boleh sebelum ' + fd(prevEnd) : '';
  const isi = i === 4 ? !!c.RadMulai : i === 3 ? planIsi(c) : ST[i].done(c);
  const autoHint = isi ? 'Ubah bila ada kesalahan tanggal.' : 'Terisi otomatis dengan tanggal hari ini saat Anda klik Selesai; ubah bila perlu.';
  let body = '';
  const maskerOpts = cv => [{ v: '', t: '— pilih —' }].concat(S.inv.filter(x => x.Aktif || x.Jenis === cv).map(x => ({ v: x.Jenis, t: x.Jenis + ' — stok ' + x.Stok + ' pcs' + (x.Reusable ? ' (pakai ulang)' : ''), dis: x.Stok <= 0 && x.Jenis !== cv && !x.Reusable })));
  switch (k) {
    case 'consult': body = `<datalist id="dlKasus">${S.kasus.map(x => `<option value="${esc(x)}">`).join('')}</datalist><div class="fgrid">${fld({ n: 'tgl', l: 'Tanggal konsul', t: 'date', req: 1, v: c.ConsultTgl || today(), min: mn, hint })}${fld({ n: 'kasus', l: 'Kasus', req: 1, v: c.ConsultKasus, list: 'dlKasus', hint: 'Ketik untuk mencari; kasus baru otomatis masuk daftar.' })}${fld({ n: 'diagnosa', l: 'Diagnosa', req: 1, v: c.Diagnosa, cls: 'full icdfld', ph: 'Ketik diagnosa atau kode ICD-10 — mis. payudara, nasofaring, C50', hint: 'Pilih dari daftar ICD-10, lalu lengkapi bila perlu (mis. dextra, T2N1M0).' })}${fld({ n: 'catatan', l: 'Catatan klinis dokter (opsional)', t: 'textarea', v: c.ConsultCatatan, cls: 'full' })}</div>`; break;
    case 'ct': { const rtt = namaPeran('Radioterapis'), pt = String(c.CTPetugas || '').split('; ');
      body = `<div class="fgrid">${fld({ n: 'tgl', l: 'Tanggal simulasi', t: 'date', req: 1, v: c.CTTgl || today(), min: mn, hint })}<div></div>${fld({ n: 'masker', l: 'Masker', t: 'select', req: 1, v: c.CTMasker || '', opts: maskerOpts(c.CTMasker) })}${fld({ n: 'masker2', l: 'Masker 2 (opsional)', t: 'select', v: c.CTMasker2 || '', opts: [{ v: '', t: '— tidak ada —' }].concat(maskerOpts(c.CTMasker2).slice(1)) })}
      ${fld({ n: 'petugas1', l: 'Petugas radioterapis 1', t: 'select', req: 1, v: pt[0] || (rtt.indexOf(S.me.nama) >= 0 ? S.me.nama : ''), opts: opsiNama(rtt, pt[0]) })}${fld({ n: 'petugas2', l: 'Petugas radioterapis 2', t: 'select', v: pt[1] || '', opts: opsiNama(rtt, pt[1], '— tidak ada —') })}</div>
      <div class="hint"><i class="bi bi-arrow-repeat"></i> Masker habis pakai berkurang saat disimpan. Alat pakai ulang (mis. Vacuum lock) baru terpakai saat radiasi dimulai dan kembali saat radiasi selesai.${rtt.length ? '' : ' Belum ada pengguna berperan Radioterapis.'}</div>`; break; }
    case 'contour': body = `<div class="fgrid">${fld({ n: 'tgl', l: 'Tanggal selesai contouring', t: 'date', req: 1, v: tglSelesai(c.ContourTgl, c.PlanTgl, mn), min: mn, hint: hintSelesai(c.ContourTgl, c.PlanTgl) })}${fld({ n: 'fraksiTotal', l: 'Jumlah fraksi penyinaran', t: 'number', v: c.Fraksi || '', mono: 1, step: '1', hint: 'Otomatis = fraksi target terbanyak. Untuk boost sekuensial, isi total fraksi.' })}</div>
      <div><b style="font-size:13px">Target &amp; preskripsi</b> <span class="muted" style="font-size:12px">— target 1 wajib, target 2–3 opsional. Total dosis terisi otomatis (fraksi × dosis/fx) dan dapat diubah.</span></div>
      <div class="tgts">${barisTarget(targetsOf(c))}</div>`; break;
    case 'plan': { const fis = namaPeran('Fisikawan Medis');
      body = `<div class="fgrid">${fld({ n: 'tgl', l: 'Tanggal selesai planning', t: 'date', req: 1, v: tglSelesai(c.PlanTgl, c.RadMulai, mn), min: mn, hint: hintSelesai(c.PlanTgl, c.RadMulai) })}${fld({ n: 'teknik', l: 'Teknik', t: 'select', req: 1, v: c.Teknik || '', opts: [{ v: '', t: '— pilih —' }].concat(TEKNIK.map(t => ({ v: t, t }))) })}${fld({ n: 'fisikawan', l: 'Fisikawan medis', t: 'select', req: 1, v: c.Fisikawan || (fis.indexOf(S.me.nama) >= 0 ? S.me.nama : ''), opts: opsiNama(fis, c.Fisikawan), cls: 'full', hint: fis.length ? '' : 'Belum ada pengguna berperan Fisikawan Medis (Kelola Users).' })}</div>
      ${c.RadMulai ? '' : `<div class="musec"><div class="row" style="gap:8px"><b><i class="bi bi-images"></i> Hasil planning (foto &amp; video)</b><span class="muted" style="font-size:12px">${S.media.filter(m => m.IDPasien === id).length} berkas tersimpan</span><span class="sp"></span><button type="button" class="btn sm" data-act="planPick"><i class="bi bi-cloud-upload"></i>Pilih foto/video</button><input type="file" id="planFiles" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple hidden></div>
        <div class="hint">Diunggah otomatis saat Anda klik simpan, sebelum notifikasi WA dikirim ke dokter. Maks 15 MB per berkas.</div><div id="planList" class="planlist"></div></div>`}
      <div class="musec"><div class="row" style="gap:8px"><b><i class="bi bi-bell"></i> Alert fraksi untuk radioterapis</b><span class="pill mut">opsional</span></div>
        <div class="hint">Saat pasien akan menjalani fraksi yang ditentukan, seluruh radioterapis menerima WA berisi catatan ini (dikirim setelah fraksi sebelumnya diverifikasi; fraksi 1 saat radiasi dimulai).</div>
        <div class="tgt alr hd"><span>Fraksi ke-</span><span>Catatan alert</span><span></span></div><div id="alrRows">${(jarr(c.Alerts).length ? jarr(c.Alerts) : [{}]).map((a, j) => barisAlert(j, a)).join('')}</div>
        <div><button type="button" class="btn sm" data-act="alrAdd"><i class="bi bi-plus-lg"></i>Tambah alert</button></div></div>
      <div class="hint"><i class="bi bi-patch-check"></i> ${c.RadMulai ? 'Radiasi sudah berjalan: perubahan planning sebaiknya juga dicatat lewat “Catat perubahan”.' : 'Menyimpan mengirim WA ke dokter untuk approval. Menyimpan ulang mengembalikan status ke “Menunggu approval”.'}</div>`; break; }
    case 'radiation': body = `<div class="fgrid">${fld({ n: 'mulai', l: 'Tanggal mulai radiasi', t: 'date', req: 1, v: c.RadMulai || today(), min: mn, hint })}${fld({ n: 'selesai', l: 'Tanggal selesai (opsional)', t: 'date', v: c.RadSelesai, hint: 'Terisi otomatis saat fraksi terakhir diverifikasi.' })}</div>`; break;
    case 'rujuk': body = `<div class="fgrid">${fld({ n: 'tgl', l: 'Tanggal rujuk kembali', t: 'date', req: 1, v: c.RujukTgl || today(), min: mn, hint, cls: 'full' })}${fld({ n: 'catatan', l: 'Catatan dokter (opsional)', t: 'textarea', v: c.RujukCatatan, cls: 'full', ph: 'mis. jadwal kontrol, rencana tindak lanjut' })}</div>`; break;
  }
  const okTxt = (k === 'contour' || k === 'plan') && !isi ? 'Selesai & simpan' : 'Simpan';
  PLAN_FILES = [];
  const note = k === 'ct' && !isi ? '<i class="bi bi-whatsapp"></i>WA ke dokter: giliran Delineasi' : k === 'plan' ? '<i class="bi bi-whatsapp"></i>WA ke dokter: persetujuan perencanaan' : '';
  modal({ icon: ST[i].ic, size: k === 'contour' || k === 'plan' ? 'lg' : '', title: 'Tahap ' + (i + 1) + ': ' + ST[i].n, sub: p.Nama + ' · ' + nrmT(p.NRM), body, ok: okTxt, note, onSubmit: form => {
    const d = obj(form); clearErr();
    const r = parseStage(k, d); if (r.err) return setErr(r.err, r.field);
    const oe = orderErr(c, i, r.p); if (oe) return setErr(oe);
    if (k === 'ct') { const ie = invErr(c, r.p); if (ie) return setErr(ie, 'masker'); }
    if (k === 'contour' && (+c.FraksiSelesai || 0) > r.p.Fraksi) return setErr('Jumlah fraksi tidak boleh kurang dari fraksi yang sudah dijalankan (' + c.FraksiSelesai + ').', 'fraksiTotal');
    if (k === 'radiation' && planSt(c) === 'Revisi') return setErr('Perencanaan sedang diminta revisi oleh dokter.');
    if (k === 'plan') { const al = bacaAlerts(d, +c.Fraksi || 0); if (al.err) return setErr(al.err);
      const lama = jarr(c.Alerts); r.p.Alerts = JSON.stringify(al.list.map(x => { const o = lama.find(y => +y.f === x.f && y.n === x.n); return Object.assign({}, x, { kirim: o && o.kirim ? o.kirim : '' }); }));
      d.alerts = al.list; Object.keys(d).forEach(x => { if (/^a[fn]_/.test(x)) delete d[x]; });
      if (PLAN_FILES.length) return unggahPlan(id, form, () => lanjut(d, r)); }
    lanjut(d, r);
  } });
  function lanjut(d, r) {
    if (k === 'ct') applyInv(c, r.p, id);
    if (k === 'consult' && !S.kasus.some(x => x.toLowerCase() === r.p.ConsultKasus.toLowerCase())) S.kasus.push(r.p.ConsultKasus);
    if (k === 'plan' && !c.RadMulai) Object.assign(r.p, { PlanStatus: 'Menunggu', PlanApprover: '', PlanApprovalWaktu: '' });
    Object.assign(c, r.p);
    if (k === 'contour') jadwalLokal(id);
    S.akt.unshift({ Waktu: nowStr(), Pengguna: S.me.nama, Aksi: isi ? 'Ubah Tahap' : 'Isi Tahap', IDPasien: id, Tahap: ST[i].n, Detail: p.Nama });
    closeModal(); dirtyAll(); render(); toast('Tersimpan', ST[i].n + ' ' + p.Nama + (k === 'plan' && !c.RadMulai ? ' — menunggu approval dokter.' : ' diperbarui.'), 'ok');
    sync('simpanTahap', [id, k, r.send || d]);
  }
  if (k === 'contour') {
    const hitung = () => {
      let maxF = 0;
      for (let j = 0; j < 3; j++) { const f = +($('#f_tf' + j).value || 0), ds = +($('#f_td' + j).value || 0), t = $('#f_tt' + j);
        if (!t.dataset.man && f && ds) t.value = Math.round(f * ds * 100) / 100; if (f > maxF) maxF = f; }
      const fx = $('#f_fraksiTotal'); if (!fx.dataset.man && maxF) fx.value = maxF;
    };
    $('#mform').addEventListener('input', e => { const t = e.target; if (/^f_tt\d$/.test(t.id) || t.id === 'f_fraksiTotal') t.dataset.man = t.value ? '1' : ''; else if (/^f_t[fd]\d$/.test(t.id)) hitung(); });
    if (c.Fraksi) $('#f_fraksiTotal').dataset.man = targetsOf(c).some(t => t.f === +c.Fraksi) ? '' : '1';
  }
}
// ═════════ DAFTAR ICD-10 (neoplasma & indikasi radioterapi) ═════════
const ICD = `C00|Malignant neoplasm of lip|bibir
C00.0|Malignant neoplasm: External upper lip|bibir atas
C00.1|Malignant neoplasm: External lower lip|bibir bawah
C00.9|Malignant neoplasm: Lip, unspecified|bibir
C01|Malignant neoplasm of base of tongue|pangkal lidah
C02|Malignant neoplasm of other and unspecified parts of tongue|lidah
C02.0|Malignant neoplasm: Dorsal surface of tongue|lidah
C02.1|Malignant neoplasm: Border of tongue|lidah tepi
C02.9|Malignant neoplasm: Tongue, unspecified|lidah
C03|Malignant neoplasm of gum|gusi gingiva
C04|Malignant neoplasm of floor of mouth|dasar mulut
C05|Malignant neoplasm of palate|palatum langit-langit
C05.0|Malignant neoplasm: Hard palate|palatum durum
C05.1|Malignant neoplasm: Soft palate|palatum mole
C06|Malignant neoplasm of other and unspecified parts of mouth|mulut rongga mulut bukal
C06.0|Malignant neoplasm: Cheek mucosa|mukosa bukal pipi
C06.9|Malignant neoplasm: Mouth, unspecified|mulut rongga mulut
C07|Malignant neoplasm of parotid gland|parotis kelenjar liur
C08|Malignant neoplasm of other and unspecified major salivary glands|kelenjar liur submandibula
C09|Malignant neoplasm of tonsil|tonsil amandel
C09.9|Malignant neoplasm: Tonsil, unspecified|tonsil amandel
C10|Malignant neoplasm of oropharynx|orofaring
C10.9|Malignant neoplasm: Oropharynx, unspecified|orofaring
C11|Malignant neoplasm of nasopharynx|nasofaring knf
C11.0|Malignant neoplasm: Superior wall of nasopharynx|nasofaring knf
C11.1|Malignant neoplasm: Posterior wall of nasopharynx|nasofaring knf
C11.2|Malignant neoplasm: Lateral wall of nasopharynx|nasofaring knf fossa rosenmuller
C11.3|Malignant neoplasm: Anterior wall of nasopharynx|nasofaring knf
C11.8|Malignant neoplasm: Overlapping lesion of nasopharynx|nasofaring knf
C11.9|Malignant neoplasm: Nasopharynx, unspecified|nasofaring knf
C12|Malignant neoplasm of pyriform sinus|sinus piriformis hipofaring
C13|Malignant neoplasm of hypopharynx|hipofaring
C13.9|Malignant neoplasm: Hypopharynx, unspecified|hipofaring
C14|Malignant neoplasm of other and ill-defined sites in the lip, oral cavity and pharynx|faring
C15|Malignant neoplasm of oesophagus|esofagus kerongkongan
C15.3|Malignant neoplasm: Upper third of oesophagus|esofagus kerongkongan
C15.4|Malignant neoplasm: Middle third of oesophagus|esofagus kerongkongan
C15.5|Malignant neoplasm: Lower third of oesophagus|esofagus kerongkongan
C15.9|Malignant neoplasm: Oesophagus, unspecified|esofagus kerongkongan
C16|Malignant neoplasm of stomach|lambung gaster
C16.0|Malignant neoplasm: Cardia|lambung kardia gaster
C16.9|Malignant neoplasm: Stomach, unspecified|lambung gaster
C17|Malignant neoplasm of small intestine|usus halus duodenum
C18|Malignant neoplasm of colon|kolon usus besar
C18.0|Malignant neoplasm: Caecum|sekum kolon
C18.2|Malignant neoplasm: Ascending colon|kolon asendens
C18.4|Malignant neoplasm: Transverse colon|kolon transversum
C18.6|Malignant neoplasm: Descending colon|kolon desendens
C18.7|Malignant neoplasm: Sigmoid colon|kolon sigmoid
C18.9|Malignant neoplasm: Colon, unspecified|kolon usus besar
C19|Malignant neoplasm of rectosigmoid junction|rektosigmoid
C20|Malignant neoplasm of rectum|rektum rektal
C21|Malignant neoplasm of anus and anal canal|anus anal
C21.0|Malignant neoplasm: Anus, unspecified|anus anal
C22|Malignant neoplasm of liver and intrahepatic bile ducts|hati hepar hepatoseluler
C22.0|Malignant neoplasm: Liver cell carcinoma|hati hepar hcc hepatoseluler
C22.1|Malignant neoplasm: Intrahepatic bile duct carcinoma|kolangiokarsinoma saluran empedu
C23|Malignant neoplasm of gallbladder|kandung empedu
C24|Malignant neoplasm of other and unspecified parts of biliary tract|saluran empedu bilier
C25|Malignant neoplasm of pancreas|pankreas
C25.0|Malignant neoplasm: Head of pancreas|pankreas kaput
C25.9|Malignant neoplasm: Pancreas, unspecified|pankreas
C26|Malignant neoplasm of other and ill-defined digestive organs|saluran cerna
C30|Malignant neoplasm of nasal cavity and middle ear|rongga hidung telinga tengah
C30.0|Malignant neoplasm: Nasal cavity|rongga hidung kavum nasi
C31|Malignant neoplasm of accessory sinuses|sinus paranasal maksila
C31.0|Malignant neoplasm: Maxillary sinus|sinus maksila
C32|Malignant neoplasm of larynx|laring pita suara
C32.0|Malignant neoplasm: Glottis|glotis laring pita suara
C32.1|Malignant neoplasm: Supraglottis|supraglotis laring
C32.2|Malignant neoplasm: Subglottis|subglotis laring
C32.9|Malignant neoplasm: Larynx, unspecified|laring
C33|Malignant neoplasm of trachea|trakea
C34|Malignant neoplasm of bronchus and lung|paru bronkus lung
C34.0|Malignant neoplasm: Main bronchus|bronkus utama paru
C34.1|Malignant neoplasm: Upper lobe, bronchus or lung|paru lobus atas
C34.2|Malignant neoplasm: Middle lobe, bronchus or lung|paru lobus tengah
C34.3|Malignant neoplasm: Lower lobe, bronchus or lung|paru lobus bawah
C34.8|Malignant neoplasm: Overlapping lesion of bronchus and lung|paru
C34.9|Malignant neoplasm: Bronchus or lung, unspecified|paru bronkus lung
C37|Malignant neoplasm of thymus|timus timoma
C38|Malignant neoplasm of heart, mediastinum and pleura|mediastinum jantung pleura
C38.1|Malignant neoplasm: Anterior mediastinum|mediastinum anterior
C38.4|Malignant neoplasm: Pleura|pleura
C39|Malignant neoplasm of other and ill-defined sites in the respiratory system and intrathoracic organs|saluran napas
C40|Malignant neoplasm of bone and articular cartilage of limbs|tulang ekstremitas osteosarkoma
C40.0|Malignant neoplasm: Scapula and long bones of upper limb|tulang lengan humerus
C40.2|Malignant neoplasm: Long bones of lower limb|tulang tungkai femur tibia
C41|Malignant neoplasm of bone and articular cartilage of other and unspecified sites|tulang
C41.0|Malignant neoplasm: Bones of skull and face|tulang tengkorak wajah
C41.2|Malignant neoplasm: Vertebral column|tulang belakang vertebra
C41.4|Malignant neoplasm: Pelvic bones, sacrum and coccyx|tulang panggul sakrum
C43|Malignant melanoma of skin|melanoma kulit
C43.9|Malignant melanoma of skin, unspecified|melanoma kulit
C44|Other malignant neoplasms of skin|kulit kanker kulit karsinoma sel basal skuamosa
C44.3|Other malignant neoplasms: Skin of other and unspecified parts of face|kulit wajah
C44.4|Other malignant neoplasms: Skin of scalp and neck|kulit kepala leher
C44.9|Other malignant neoplasms: Malignant neoplasm of skin, unspecified|kulit
C45|Mesothelioma|mesotelioma
C45.0|Mesothelioma of pleura|mesotelioma pleura
C46|Kaposi sarcoma|kaposi sarkoma
C47|Malignant neoplasm of peripheral nerves and autonomic nervous system|saraf tepi
C48|Malignant neoplasm of retroperitoneum and peritoneum|retroperitoneum peritoneum
C49|Malignant neoplasm of other connective and soft tissue|jaringan lunak sarkoma
C49.0|Malignant neoplasm: Connective and soft tissue of head, face and neck|sarkoma jaringan lunak kepala leher
C49.1|Malignant neoplasm: Connective and soft tissue of upper limb, including shoulder|sarkoma jaringan lunak lengan bahu
C49.2|Malignant neoplasm: Connective and soft tissue of lower limb, including hip|sarkoma jaringan lunak tungkai paha
C49.9|Malignant neoplasm: Connective and soft tissue, unspecified|sarkoma jaringan lunak
C50|Malignant neoplasm of breast|payudara mammae breast
C50.0|Malignant neoplasm: Nipple and areola|payudara mammae puting areola
C50.1|Malignant neoplasm: Central portion of breast|payudara mammae sentral
C50.2|Malignant neoplasm: Upper-inner quadrant of breast|payudara mammae kuadran atas dalam
C50.3|Malignant neoplasm: Lower-inner quadrant of breast|payudara mammae kuadran bawah dalam
C50.4|Malignant neoplasm: Upper-outer quadrant of breast|payudara mammae kuadran atas luar
C50.5|Malignant neoplasm: Lower-outer quadrant of breast|payudara mammae kuadran bawah luar
C50.6|Malignant neoplasm: Axillary tail of breast|payudara mammae aksila
C50.8|Malignant neoplasm: Overlapping lesion of breast|payudara mammae
C50.9|Malignant neoplasm: Breast, unspecified|payudara mammae breast
C51|Malignant neoplasm of vulva|vulva
C52|Malignant neoplasm of vagina|vagina
C53|Malignant neoplasm of cervix uteri|serviks leher rahim cervix
C53.0|Malignant neoplasm: Endocervix|serviks endoserviks leher rahim
C53.1|Malignant neoplasm: Exocervix|serviks eksoserviks leher rahim
C53.8|Malignant neoplasm: Overlapping lesion of cervix uteri|serviks leher rahim
C53.9|Malignant neoplasm: Cervix uteri, unspecified|serviks leher rahim cervix
C54|Malignant neoplasm of corpus uteri|korpus uteri rahim
C54.1|Malignant neoplasm: Endometrium|endometrium rahim
C55|Malignant neoplasm of uterus, part unspecified|uterus rahim
C56|Malignant neoplasm of ovary|ovarium indung telur
C57|Malignant neoplasm of other and unspecified female genital organs|genital wanita tuba
C58|Malignant neoplasm of placenta|plasenta koriokarsinoma
C60|Malignant neoplasm of penis|penis
C61|Malignant neoplasm of prostate|prostat prostate
C62|Malignant neoplasm of testis|testis buah zakar seminoma
C63|Malignant neoplasm of other and unspecified male genital organs|genital pria
C64|Malignant neoplasm of kidney, except renal pelvis|ginjal renal
C65|Malignant neoplasm of renal pelvis|pelvis renal ginjal
C66|Malignant neoplasm of ureter|ureter
C67|Malignant neoplasm of bladder|kandung kemih buli bladder
C67.9|Malignant neoplasm: Bladder, unspecified|kandung kemih buli bladder
C68|Malignant neoplasm of other and unspecified urinary organs|uretra saluran kemih
C69|Malignant neoplasm of eye and adnexa|mata retinoblastoma orbita
C69.2|Malignant neoplasm: Retina|retina retinoblastoma mata
C69.6|Malignant neoplasm: Orbit|orbita mata
C70|Malignant neoplasm of meninges|meningen selaput otak
C71|Malignant neoplasm of brain|otak brain glioma glioblastoma
C71.0|Malignant neoplasm: Cerebrum, except lobes and ventricles|otak serebrum
C71.1|Malignant neoplasm: Frontal lobe|otak lobus frontal
C71.2|Malignant neoplasm: Temporal lobe|otak lobus temporal
C71.3|Malignant neoplasm: Parietal lobe|otak lobus parietal
C71.4|Malignant neoplasm: Occipital lobe|otak lobus oksipital
C71.5|Malignant neoplasm: Cerebral ventricle|otak ventrikel
C71.6|Malignant neoplasm: Cerebellum|otak serebelum medulloblastoma
C71.7|Malignant neoplasm: Brain stem|batang otak
C71.8|Malignant neoplasm: Overlapping lesion of brain|otak
C71.9|Malignant neoplasm: Brain, unspecified|otak brain glioma
C72|Malignant neoplasm of spinal cord, cranial nerves and other parts of central nervous system|medula spinalis sumsum tulang belakang saraf kranial
C73|Malignant neoplasm of thyroid gland|tiroid gondok
C74|Malignant neoplasm of adrenal gland|adrenal
C75|Malignant neoplasm of other endocrine glands and related structures|hipofisis kelenjar endokrin
C76|Malignant neoplasm of other and ill-defined sites|kepala leher pelvis
C76.0|Malignant neoplasm: Head, face and neck|kepala leher
C77|Secondary and unspecified malignant neoplasm of lymph nodes|kgb kelenjar getah bening metastasis limfonodi
C77.0|Secondary malignant neoplasm: Lymph nodes of head, face and neck|kgb leher metastasis
C77.1|Secondary malignant neoplasm: Intrathoracic lymph nodes|kgb mediastinum metastasis
C77.2|Secondary malignant neoplasm: Intra-abdominal lymph nodes|kgb abdomen metastasis
C77.3|Secondary malignant neoplasm: Axillary and upper limb lymph nodes|kgb aksila metastasis
C77.5|Secondary malignant neoplasm: Intrapelvic lymph nodes|kgb pelvis metastasis
C78|Secondary malignant neoplasm of respiratory and digestive organs|metastasis paru hati
C78.0|Secondary malignant neoplasm of lung|metastasis paru
C78.2|Secondary malignant neoplasm of pleura|metastasis pleura efusi
C78.7|Secondary malignant neoplasm of liver and intrahepatic bile duct|metastasis hati hepar
C79|Secondary malignant neoplasm of other and unspecified sites|metastasis
C79.3|Secondary malignant neoplasm of brain and cerebral meninges|metastasis otak brain wbrt
C79.4|Secondary malignant neoplasm of other and unspecified parts of nervous system|metastasis saraf
C79.5|Secondary malignant neoplasm of bone and bone marrow|metastasis tulang bone paliatif
C79.8|Secondary malignant neoplasm of other specified sites|metastasis
C80|Malignant neoplasm, without specification of site|keganasan tanpa lokasi primer tidak diketahui
C81|Hodgkin lymphoma|limfoma hodgkin
C82|Follicular lymphoma|limfoma folikular
C83|Non-follicular lymphoma|limfoma non hodgkin dlbcl
C83.3|Diffuse large B-cell lymphoma|limfoma dlbcl non hodgkin
C84|Mature T/NK-cell lymphomas|limfoma sel t nk
C85|Other and unspecified types of non-Hodgkin lymphoma|limfoma non hodgkin nhl
C85.9|Non-Hodgkin lymphoma, unspecified|limfoma non hodgkin nhl
C88|Malignant immunoproliferative diseases|imunoproliferatif
C90|Multiple myeloma and malignant plasma cell neoplasms|mieloma multipel plasmasitoma
C90.0|Multiple myeloma|mieloma multipel
C90.3|Solitary plasmacytoma|plasmasitoma soliter
C91|Lymphoid leukaemia|leukemia limfoid
C92|Myeloid leukaemia|leukemia mieloid
C95|Leukaemia of unspecified cell type|leukemia
C96|Other and unspecified malignant neoplasms of lymphoid, haematopoietic and related tissue|limfoid hematopoietik
C97|Malignant neoplasms of independent (primary) multiple sites|keganasan multipel primer ganda
D00|Carcinoma in situ of oral cavity, oesophagus and stomach|karsinoma in situ mulut esofagus lambung
D01|Carcinoma in situ of other and unspecified digestive organs|karsinoma in situ saluran cerna
D02|Carcinoma in situ of middle ear and respiratory system|karsinoma in situ laring paru
D03|Melanoma in situ|melanoma in situ
D04|Carcinoma in situ of skin|karsinoma in situ kulit
D05|Carcinoma in situ of breast|dcis lcis payudara in situ mammae
D05.0|Lobular carcinoma in situ|lcis payudara in situ
D05.1|Intraductal carcinoma in situ|dcis payudara in situ duktal
D05.9|Carcinoma in situ of breast, unspecified|payudara in situ
D06|Carcinoma in situ of cervix uteri|serviks in situ cin
D06.9|Carcinoma in situ: Cervix, unspecified|serviks in situ cin
D07|Carcinoma in situ of other and unspecified genital organs|in situ genital
D09|Carcinoma in situ of other and unspecified sites|karsinoma in situ
D16|Benign neoplasm of bone and articular cartilage|tumor jinak tulang
D18|Haemangioma and lymphangioma, any site|hemangioma limfangioma
D18.0|Haemangioma, any site|hemangioma vertebra
D32|Benign neoplasm of meninges|meningioma
D32.0|Benign neoplasm: Cerebral meninges|meningioma otak
D32.1|Benign neoplasm: Spinal meninges|meningioma spinal
D32.9|Benign neoplasm: Meninges, unspecified|meningioma
D33|Benign neoplasm of brain and other parts of central nervous system|tumor jinak otak schwannoma neurinoma akustik
D33.3|Benign neoplasm: Cranial nerves|schwannoma vestibular neurinoma akustik
D35|Benign neoplasm of other and unspecified endocrine glands|adenoma hipofisis
D35.2|Benign neoplasm: Pituitary gland|adenoma hipofisis pituitari
D35.3|Benign neoplasm: Craniopharyngeal duct|kraniofaringioma
D36|Benign neoplasm of other and unspecified sites|tumor jinak
D37|Neoplasm of uncertain or unknown behaviour of oral cavity and digestive organs|tumor perilaku tidak pasti saluran cerna
D38|Neoplasm of uncertain or unknown behaviour of middle ear and respiratory and intrathoracic organs|tumor perilaku tidak pasti paru
D43|Neoplasm of uncertain or unknown behaviour of brain and central nervous system|tumor otak perilaku tidak pasti
D44|Neoplasm of uncertain or unknown behaviour of endocrine glands|tumor endokrin perilaku tidak pasti
D44.3|Neoplasm of uncertain behaviour: Pituitary gland|hipofisis pituitari
D44.5|Neoplasm of uncertain behaviour: Pineal gland|pineal
D47|Other neoplasms of uncertain or unknown behaviour of lymphoid, haematopoietic and related tissue|mieloproliferatif
D48|Neoplasm of uncertain or unknown behaviour of other and unspecified sites|tumor perilaku tidak pasti
L91.0|Hypertrophic scar (keloid)|keloid parut
Z51.0|Radiotherapy session|sesi radioterapi
Z92.3|Personal history of irradiation|riwayat radiasi`.split('\n').map(l => { const a = l.split('|'); return { c: a[0], t: a[1], k: (a[2] || '').toLowerCase(), s: (a[0] + ' ' + a[1] + ' ' + (a[2] || '')).toLowerCase() }; });
let ICD_HAS = [], ICD_ON = -1;
function icdTutup() { const b = $('#icdBox'); if (b) b.remove(); ICD_HAS = []; ICD_ON = -1; }
function icdCari() {
  const inp = $('#f_diagnosa'); if (!inp) return;
  const v = inp.value.trim().toLowerCase();
  if (v.length < 2 || /^[a-z]\d\d(\.\d)?\s+\S/i.test(v)) return icdTutup(); // sudah memilih kode → dokter sedang melengkapi teks
  let tk = v.split(/[\s,/]+/).filter(x => x.length >= 2);
  if (tk.length > 1) tk = tk.filter(x => ['ca', 'ka', 'tumor', 'kanker'].indexOf(x) < 0); // singkatan umum "Ca" = karsinoma → tidak ikut menyaring
  ICD_HAS = ICD.map(x => { let sk = 0; tk.forEach(t => { if (x.s.indexOf(t) >= 0) sk += t.length >= 3 ? 2 : 1; if (x.k.indexOf(t) === 0) sk += 1; }); if (x.c.toLowerCase().indexOf(v) === 0) sk += 10; if (sk && x.c.indexOf('.') < 0) sk += 0.5; return { x, sk }; })
    .filter(o => o.sk >= 2 || (tk.length === 1 && o.sk > 0)).sort((a, b) => b.sk - a.sk || a.x.c.localeCompare(b.x.c)).slice(0, 12).map(o => o.x);
  let b = $('#icdBox');
  if (!ICD_HAS.length) return icdTutup();
  if (!b) { b = document.createElement('div'); b.id = 'icdBox'; b.className = 'icdbox'; b.setAttribute('role', 'listbox'); inp.parentNode.insertBefore(b, inp.nextSibling); }
  ICD_ON = -1;
  b.innerHTML = ICD_HAS.map((x, i) => `<div class="icdit" role="option" data-i="${i}"><b class="mono">${esc(x.c)}</b><span>${esc(x.t)}</span></div>`).join('') + '<div class="icdft">ICD-10 · ↑↓ Enter</div>';
}
function icdPilih(i) {
  const x = ICD_HAS[i], inp = $('#f_diagnosa'); if (!x || !inp) return;
  inp.value = x.c + ' ' + x.t; icdTutup(); inp.focus(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) { /* abaikan */ }
}
function icdTandai(n) { const L = $$('#icdBox .icdit'); if (!L.length) return; ICD_ON = (ICD_ON + n + L.length) % L.length; L.forEach((e, i) => e.classList.toggle('on', i === ICD_ON)); L[ICD_ON].scrollIntoView({ block: 'nearest' }); }
document.addEventListener('mousedown', e => { const it = e.target.closest && e.target.closest('.icdit'); if (it) { e.preventDefault(); icdPilih(+it.dataset.i); } else if (!(e.target.closest && e.target.closest('#icdBox')) && e.target.id !== 'f_diagnosa') icdTutup(); });
document.addEventListener('keydown', e => {
  if (e.target.id !== 'f_diagnosa' || !$('#icdBox')) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); icdTandai(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); icdTandai(-1); }
  else if (e.key === 'Enter' && ICD_ON >= 0) { e.preventDefault(); icdPilih(ICD_ON); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); icdTutup(); }
}, true);
document.addEventListener('input', e => { if (e.target.id === 'f_diagnosa') icdCari(); });
// ═════════ VERIFIKASI FRAKSI: 2 PETUGAS + MU PER LAPANGAN ═════════
const ENERGI = ['6 MV', '10 MV'];
function barisMU(i, v) {
  v = v || {};
  return `<tr data-mu="${i}"><td><input class="input" name="ln_${i}" value="${esc(v.nama || '')}" placeholder="mis. Arc 1 / G0" aria-label="Nama lapangan ${i + 1}" autocomplete="off"></td><td><select class="input" name="le_${i}" aria-label="Energi lapangan ${i + 1}"><option value="">— pilih —</option>${ENERGI.map(x => `<option ${v.energi === x ? 'selected' : ''}>${x}</option>`).join('')}</select></td><td><input class="input mono" name="lp_${i}" type="number" step="any" min="0" inputmode="decimal" value="${v.plan || ''}" aria-label="MU planning lapangan ${i + 1}"></td><td class="dlv"><input class="input mono" name="ld_${i}" type="number" step="any" min="0" inputmode="decimal" aria-label="MU terdeliver lapangan ${i + 1}"></td><td><button type="button" class="btn g sm ic" data-act="muDel" aria-label="Hapus lapangan"><i class="bi bi-x-lg"></i></button></td></tr>`;
}
function openFraksi(id) {
  const c = cpOf(id), p = pOf(id), ke = (+c.FraksiSelesai || 0) + 1, dt = new Date(), loc = iso(dt) + 'T' + pad(dt.getHours()) + ':' + pad(dt.getMinutes());
  if (ke > c.Fraksi) return toast('Selesai', 'Seluruh fraksi sudah diverifikasi.', 'warn');
  const ref = jarr(c.MUPlan), rtt = namaPeran('Radioterapis');
  const logs = S.fraksiLog.filter(x => x.IDPasien === id).sort((a, b) => a.FraksiKe - b.FraksiKe), last = logs[logs.length - 1];
  const chk = (n, t, s, extra) => `<label class="chk"><input type="checkbox" name="${n}" ${extra || ''}><div><b>${t}</b><span>${s}</span></div></label>`;
  const alr = jarr(c.Alerts).find(a => +a.f === ke), acum = dosisDiterima(id);
  const peringatan = (alr ? `<div class="warnbox alr"><i class="bi bi-bell-fill"></i><div><b>Alert fraksi ke-${ke}</b><div style="margin-top:4px">${esc(alr.n)}</div></div></div>` : '') + (last && last.MUStatus === 'Parsial/Error' ? `<div class="warnbox"><i class="bi bi-exclamation-triangle-fill"></i><div><b>Perhatian: fraksi ke-${last.FraksiKe} sebelumnya error/parsial</b><div style="margin-top:4px">${ringkasMU(last.MUData)} MU (terdeliver/seharusnya)</div><div>${esc(last.Catatan)}</div></div></div>` : '');
  let mu;
  if (!ref.length) mu = `<div class="musec"><div class="row" style="gap:8px"><b>MU per lapangan radiasi</b><span class="pill y">${(+c.FraksiSelesai || 0) ? 'Isi ulang setelah perubahan planning/dosis' : 'Fraksi pertama'}</span></div>
    <div class="hint">Tulis jumlah MU setiap lapangan yang disinar. Nilai ini menjadi acuan checklist pada fraksi berikutnya.</div>
    <div class="tw"><table class="tbl tsm mu" id="muTbl" style="min-width:520px"><thead><tr><th>Lapangan</th><th style="width:120px">Energi</th><th>MU planning</th><th class="dlv">MU terdeliver</th><th></th></tr></thead><tbody id="muRows">${barisMU(0)}${barisMU(1)}</tbody></table></div>
    <div class="row"><button type="button" class="btn sm" data-act="muAdd"><i class="bi bi-plus-lg"></i>Tambah lapangan</button><span class="sp"></span>${chk('parsial', 'Error / parsial treatment', 'Isi MU yang terdeliver bila penyinaran tidak lengkap.', 'id="muPar"')}</div></div>`;
  else mu = `<div class="musec"><b>MU per lapangan (acuan planning)</b>
    <div class="row" style="gap:6px">${ref.map(x => `<span class="pill mono">${muLbl(x)} · ${x.mu} MU</span>`).join('')}</div>
    ${chk('muSesuai', 'MU terdeliver sesuai planning', 'Seluruh lapangan tersinar lengkap sesuai MU acuan di atas.', 'id="muOk"')}
    ${chk('parsial', 'Error / parsial treatment', 'Tulis MU yang sudah terdeliver dan MU yang seharusnya dideliver.', 'id="muPar"')}
    <div id="parBox" hidden><div class="tw"><table class="tbl tsm" style="min-width:420px"><thead><tr><th>Lapangan</th><th>MU seharusnya</th><th>MU terdeliver</th></tr></thead><tbody>${ref.map((x, i) => `<tr><td><b>${muLbl(x)}</b></td><td><input class="input mono" name="pp_${i}" type="number" step="any" min="0" value="${x.mu}" aria-label="MU seharusnya ${esc(x.nama)}"></td><td><input class="input mono" name="pd_${i}" type="number" step="any" min="0" aria-label="MU terdeliver ${esc(x.nama)}"></td></tr>`).join('')}</tbody></table></div></div></div>`;
  modal({ icon: 'bi-shield-check', size: 'lg', title: 'Verifikasi fraksi radiasi', sub: 'Fraksi ke-' + ke + ' dari ' + c.Fraksi + ' · ' + p.Nama, ok: 'Simpan & Konfirmasi Fraksi ke-' + ke, okIc: 'bi-shield-check',
    body: `${peringatan}<div class="kv" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div><small>Pasien</small><b>${esc(p.Nama)}</b></div><div><small>Dosis hari ini (target 1)</small><b class="num">${c.Dosis} cGy</b></div><div><small>Akumulasi setelah ini</small><b class="num">${Math.round((acum + (+c.Dosis || 0)) * 100) / 100} / ${totalRx(c)} cGy</b></div></div>
    <h3 class="t" style="font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:var(--link)">Checklist keselamatan &amp; time-out</h3>
    ${chk('cek1', 'Identitas pasien & gelang NRM terverifikasi', 'Nama lengkap dan tanggal lahir dikonfirmasi ulang via 2 parameter.')}
    ${chk('cek2', 'Fiksasi & posisi pasien sesuai preskripsi', 'Masker/aksesori fiksasi terpasang presisi dengan tanda tattoo.')}
    ${chk('cek3', 'Matching citra (IGRT) dalam toleransi', 'Pergeseran couch sesuai batas yang ditetapkan, diverifikasi tim.')}
    ${mu}
    <div class="fgrid">${fld({ n: 'petugas1', l: 'Petugas radioterapis 1', t: 'select', req: 1, v: rtt.indexOf(S.me.nama) >= 0 ? S.me.nama : '', opts: opsiNama(rtt) })}${fld({ n: 'petugas2', l: 'Petugas radioterapis 2', t: 'select', req: 1, v: '', opts: opsiNama(rtt) })}
    ${fld({ n: 'waktu', l: 'Tanggal & waktu selesai radiasi', t: 'datetime-local', req: 1, v: loc, cls: 'full', hint: 'Waktu penyinaran selesai; dipakai untuk report Radiation Time (cek-in → selesai).' })}${fld({ n: 'catatan', l: 'Catatan (wajib bila error/parsial)', t: 'textarea', cls: 'full', ph: 'Reaksi pasien, penyebab interupsi, rencana kompensasi MU…' })}</div>
    ${rtt.length < 2 ? '<div class="hint" style="color:var(--danger-text)">Perlu minimal 2 pengguna aktif berperan Radioterapis di Kelola Users.</div>' : ''}`,
    onSubmit: form => {
      const d = obj(form); clearErr();
      if (!(d.cek1 && d.cek2 && d.cek3)) return setErr('Seluruh checklist keselamatan harus dicentang.');
      const parsial = !!d.parsial; let lap = [];
      if (!ref.length) {
        $$('#muRows tr').forEach(tr => { const i = tr.dataset.mu; lap.push({ nama: (d['ln_' + i] || '').trim(), energi: d['le_' + i] || '', plan: d['lp_' + i], deliver: d['ld_' + i] }); });
        lap = lap.filter(x => x.nama || x.plan !== '');
        if (!lap.length) return setErr('Isi MU minimal 1 lapangan radiasi.');
        for (const x of lap) { if (!x.nama) return setErr('Nama setiap lapangan wajib diisi.'); if (ENERGI.indexOf(x.energi) < 0) return setErr('Pilih energi (6 MV / 10 MV) untuk lapangan ' + x.nama + '.'); if (!(+x.plan > 0)) return setErr('MU planning lapangan ' + x.nama + ' harus angka > 0.'); if (parsial && !(x.deliver !== '' && +x.deliver >= 0)) return setErr('Isi MU terdeliver lapangan ' + x.nama + '.'); }
        lap = lap.map(x => ({ nama: x.nama, energi: x.energi, plan: +x.plan, deliver: parsial ? +x.deliver : +x.plan }));
      } else if (parsial) {
        lap = ref.map((x, i) => ({ nama: x.nama, energi: x.energi || '', plan: d['pp_' + i], deliver: d['pd_' + i] }));
        for (const x of lap) { if (x.plan === '' || x.deliver === '') return setErr('Isi MU seharusnya dan terdeliver untuk lapangan ' + x.nama + '.'); }
        lap = lap.map(x => ({ nama: x.nama, energi: x.energi, plan: +x.plan, deliver: +x.deliver }));
      } else if (!d.muSesuai) return setErr('Centang “MU terdeliver sesuai planning”, atau pilih Error/parsial bila ada perbedaan.');
      else lap = ref.map(x => ({ nama: x.nama, energi: x.energi || '', plan: x.mu, deliver: x.mu }));
      if (parsial && !d.catatan) return setErr('Tuliskan catatan penyebab error/parsial treatment.', 'catatan');
      if (!d.petugas1 || !d.petugas2) return setErr('Pilih 2 petugas radioterapis.', d.petugas1 ? 'petugas2' : 'petugas1');
      if (d.petugas1 === d.petugas2) return setErr('Petugas 1 dan 2 harus orang yang berbeda.', 'petugas2');
      if (!d.waktu) return setErr('Tanggal & waktu wajib diisi.', 'waktu');
      if (d.waktu.slice(0, 10) < c.RadMulai) return setErr('Tanggal fraksi tidak boleh lebih awal dari tanggal mulai radiasi (' + fd(c.RadMulai) + ').', 'waktu');
      if (!ref.length) c.MUPlan = JSON.stringify(lap.map(x => ({ nama: x.nama, energi: x.energi, mu: x.plan })));
      c.FraksiSelesai = ke; const tuntas = ke >= c.Fraksi; if (tuntas && !c.RadSelesai) c.RadSelesai = d.waktu.slice(0, 10);
      const st = parsial ? 'Parsial/Error' : (ref.length ? 'Sesuai' : 'Input MU');
      S.fraksiLog.push({ Waktu: d.waktu.replace('T', ' ') + ':00', IDPasien: id, FraksiKe: ke, Dosis: c.Dosis, Petugas: d.petugas1, Petugas2: d.petugas2, Catatan: d.catatan || '', MUStatus: st, MUData: JSON.stringify(lap) });
      tandaiAgLokal(id, d.waktu.slice(0, 10));
      S.akt.unshift({ Waktu: nowStr(), Pengguna: S.me.nama, Aksi: 'Verifikasi Fraksi', IDPasien: id, Tahap: 'Radiasi', Detail: 'Fraksi ' + ke + '/' + c.Fraksi + (parsial ? ' · PARSIAL' : '') });
      closeModal(); dirtyAll(); render();
      toast(tuntas ? 'Seluruh fraksi selesai' : 'Fraksi ke-' + ke + ' terverifikasi', parsial ? 'Dicatat sebagai error/parsial — tampil sebagai catatan penting di fraksi berikutnya.' : tuntas ? 'Tanggal selesai radiasi terisi otomatis. Tahap Rujuk Kembali kini terbuka.' : p.Nama, parsial ? 'warn' : 'ok');
      sync('konfirmasiFraksi', [id, { cek1: true, cek2: true, cek3: true, waktu: d.waktu, petugas1: d.petugas1, petugas2: d.petugas2, catatan: d.catatan || '', parsial, muSesuai: !!d.muSesuai, lapangan: lap }]);
    } });
  muToggle();
}
/** Cermin tandaiAgendaRadiasi_: agenda radiasi tanggal yang sama, atau jadwal terdekat yang belum terlaksana dipindah ke tanggal pelaksanaan. */
function tandaiAgLokal(id, t) {
  const L = S.agenda.filter(a => a.IDPasien === id && isRadAg(a) && a.Status === 'Terjadwal').sort(cmpAg);
  let a = L.find(x => x.Tanggal === t);
  if (!a && L.length) { a = L[0]; a.Catatan = 'Dilaksanakan ' + fd(t) + ' (jadwal awal ' + fd(a.Tanggal) + ')' + (a.Catatan ? ' | ' + a.Catatan : ''); a.Tanggal = t; a.Auto = false; }
  if (a) a.Status = 'Selesai';
}
function muToggle() {
  const par = $('#muPar'); if (!par) return;
  const tbl = $('#muTbl'); if (tbl) tbl.classList.toggle('show-dlv', par.checked);
  const box = $('#parBox'); if (box) box.hidden = !par.checked;
  const ok = $('#muOk'); if (ok) { ok.disabled = par.checked; if (par.checked) ok.checked = false; }
}

// ═════════ CATAT PERUBAHAN (CT evaluasi / planning / dosis) ═════════
function openPerubahan(id) {
  const c = cpOf(id), p = pOf(id), dok = dpjpList(), bolehDosis = peran() === 'Dokter' || isSA();
  const jenis = ['CT Evaluasi', 'Perubahan Planning'].concat(bolehDosis ? ['Perubahan Dosis'] : []).concat(['Lainnya']);
  modal({ icon: 'bi-journal-plus', title: 'Catat perubahan selama radiasi', sub: p.Nama + ' · fraksi ' + (c.FraksiSelesai || 0) + '/' + c.Fraksi, ok: 'Simpan catatan',
    body: `<div class="fgrid">${fld({ n: 'jenis', l: 'Jenis', t: 'select', req: 1, v: 'CT Evaluasi', opts: jenis.map(j => ({ v: j, t: j })) })}${fld({ n: 'tanggal', l: 'Tanggal', t: 'date', req: 1, v: today(), min: c.RadMulai })}
    ${fld({ n: 'diminta', l: 'Diminta oleh (dokter)', t: 'select', req: 1, v: dok.indexOf(p.DokterOnkologi) >= 0 ? p.DokterOnkologi : '', opts: opsiNama(dok), cls: 'full' })}
    <div class="full" id="prPlan" hidden>${fld({ n: 'teknik', l: 'Teknik baru (bila berubah)', t: 'select', v: '', opts: [{ v: '', t: '— tetap ' + (c.Teknik || '') + ' —' }].concat(TEKNIK.map(t => ({ v: t, t }))) })}<div class="hint">MU acuan direset: petugas mengisi ulang MU per lapangan di fraksi berikutnya.</div></div>
    <div class="full fgrid" id="prDosis" hidden style="grid-template-columns:repeat(3,minmax(0,1fr))">${fld({ n: 'fraksi', l: 'Jumlah fraksi baru', t: 'number', v: c.Fraksi, mono: 1, step: '1', min: c.FraksiSelesai || 1 })}${fld({ n: 'dosis', l: 'Dosis/fx baru (cGy)', t: 'number', v: c.Dosis, mono: 1, step: 'any' })}${fld({ n: 'total', l: 'Total dosis baru (cGy)', t: 'number', v: c.TotalDosis, mono: 1, step: 'any' })}<div class="hint" style="grid-column:1/-1">Berlaku untuk target 1. Jadwal radiasi di Kalender menyesuaikan jumlah fraksi. Sudah dijalankan: ${c.FraksiSelesai || 0} fraksi.</div></div>
    ${fld({ n: 'catatan', l: 'Catatan / alasan', t: 'textarea', req: 1, cls: 'full', ph: 'mis. penurunan berat badan, re-simulasi, respon tumor…' })}</div>`,
    onSubmit: form => {
      const d = obj(form); clearErr();
      if (!d.tanggal) return setErr('Tanggal wajib diisi.', 'tanggal');
      if (d.tanggal < c.RadMulai) return setErr('Tanggal tidak boleh sebelum mulai radiasi.', 'tanggal');
      if (!d.diminta) return setErr('Pilih dokter yang meminta.', 'diminta');
      if (!d.catatan) return setErr('Catatan / alasan wajib diisi.', 'catatan');
      const det = {};
      if (d.jenis === 'Perubahan Planning') { if (d.teknik && d.teknik !== c.Teknik) { det.teknik = [c.Teknik, d.teknik]; c.Teknik = d.teknik; } det.muReset = true; c.MUPlan = ''; }
      if (d.jenis === 'Perubahan Dosis') {
        const fx = +d.fraksi, ds = +d.dosis, tt = +d.total, done = +c.FraksiSelesai || 0;
        if (!(fx > 0) || fx !== Math.floor(fx)) return setErr('Jumlah fraksi baru harus bilangan bulat > 0.', 'fraksi');
        if (fx < done) return setErr('Tidak boleh kurang dari fraksi yang sudah dijalankan (' + done + ').', 'fraksi');
        if (!(ds > 0)) return setErr('Dosis/fx harus angka > 0.', 'dosis'); if (!(tt > 0)) return setErr('Total dosis harus angka > 0.', 'total');
        Object.assign(det, { fraksi: [c.Fraksi, fx], dosis: [c.Dosis, ds], total: [c.TotalDosis, tt], muReset: true });
        const T = jarr(c.Targets); if (T.length) { T[0].f = fx; T[0].d = ds; T[0].t = tt; c.Targets = JSON.stringify(T); }
        Object.assign(c, { Fraksi: fx, Dosis: ds, TotalDosis: tt, MUPlan: '' });
        if (fx === done) { c.RadSelesai = d.tanggal; det.radiasiDihentikan = true; }
        jadwalLokal(id);
      }
      S.perubahan.push({ ID: 'Ctmp' + Date.now(), Waktu: nowStr(), IDPasien: id, Tanggal: d.tanggal, Jenis: d.jenis, DimintaOleh: d.diminta, Catatan: d.catatan, Detail: JSON.stringify(det), Pengguna: S.me.nama });
      closeModal(); dirtyAll(); render(); toast('Catatan tersimpan', d.jenis + ' · ' + p.Nama, 'ok');
      sync('catatPerubahan', [id, d]);
    } });
  prToggle();
  $('#f_total') && ['f_fraksi', 'f_dosis'].forEach(x => $('#' + x).addEventListener('input', () => { const f = +$('#f_fraksi').value, ds = +$('#f_dosis').value, done = +c.FraksiSelesai || 0; if (f && ds) $('#f_total').value = Math.round((dosisDiterima(id) + Math.max(0, f - done) * ds) * 100) / 100; }));
}
function prToggle() { const j = $('#f_jenis'); if (!j || !$('#prPlan')) return; $('#prPlan').hidden = j.value !== 'Perubahan Planning'; $('#prDosis').hidden = j.value !== 'Perubahan Dosis'; }

// ═════════ APPROVAL PLANNING ═════════
function openApproval(id, status) {
  const c = cpOf(id), p = pOf(id), rev = status === 'Revisi', n = S.media.filter(m => m.IDPasien === id).length;
  modal({ icon: rev ? 'bi-arrow-counterclockwise' : 'bi-check2-circle', size: 'sm', title: rev ? 'Minta revisi planning' : 'Setujui planning', sub: p.Nama + ' · ' + c.Teknik + ' · ' + c.Fisikawan, ok: rev ? 'Kirim permintaan revisi' : 'Setujui planning', okCls: rev ? 'p' : 'n',
    body: `${!rev && !n ? '<div class="warnbox"><i class="bi bi-info-circle-fill"></i><div>Belum ada foto/video hasil planning yang diunggah. Anda tetap dapat menyetujui bila sudah meninjau di TPS.</div></div>' : ''}
      ${tabelTarget(c)}${fld({ n: 'catatan', l: rev ? 'Catatan revisi untuk fisikawan' : 'Catatan (opsional)', t: 'textarea', req: rev ? 1 : 0, cls: 'full' })}`,
    onSubmit: form => {
      const d = obj(form); clearErr();
      if (rev && !d.catatan) return setErr('Tuliskan catatan revisi.', 'catatan');
      Object.assign(c, { PlanStatus: status, PlanApprover: S.me.nama, PlanApprovalWaktu: nowStr(), PlanApprovalCatatan: d.catatan || '' });
      S.akt.unshift({ Waktu: nowStr(), Pengguna: S.me.nama, Aksi: rev ? 'Revisi Planning' : 'Approve Planning', IDPasien: id, Tahap: 'Perencanaan', Detail: d.catatan || p.Nama });
      closeModal(); dirtyAll(); render(); toast(rev ? 'Revisi diminta' : 'Perencanaan disetujui', rev ? 'Fisikawan medis mendapat notifikasi.' : 'Tahap Radiasi kini terbuka.', 'ok');
      sync('approvalPlanning', [id, status, d.catatan || '']);
    } });
}

// ═════════ MEDIA HASIL PLANNING ═════════
const MEDIA_OK = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'], MEDIA_MAX = 15 * 1048576, mediaCache = {};
function bacaB64(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('Gagal membaca berkas.')); r.readAsDataURL(file); }); }
function kecilkanGambar(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); const k = Math.min(1, 2200 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      const cx = cv.getContext('2d'); cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', 0.9).split(',')[1]); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Gambar tidak valid.')); }; img.src = url;
  });
}
async function siapkanBerkas(f) {
  if (MEDIA_OK.indexOf(f.type) < 0) throw new Error('format tidak didukung (gunakan JPG, PNG, WebP, MP4, WebM, atau MOV).');
  const isImg = f.type.indexOf('image') === 0, b64 = isImg ? await kecilkanGambar(f) : await bacaB64(f);
  if (b64.length * 0.75 > MEDIA_MAX) throw new Error('melebihi 15 MB. Kompres atau potong video terlebih dahulu.');
  return { b64, mime: isImg ? 'image/jpeg' : f.type, nama: isImg ? f.name.replace(/\.[^.]+$/, '') + '.jpg' : f.name };
}
/** Form Planning: unggah semua berkas terpilih dulu (berurutan), baru simpan planning → WA ke dokter terkirim setelah media tersedia. */
async function unggahPlan(id, form, selesai) {
  const btn = form.querySelector('[type=submit]'), lbl = btn.innerHTML, tot = PLAN_FILES.length;
  btn.disabled = true; S.pending++; setSync();
  try {
    while (PLAN_FILES.length) {
      const f = PLAN_FILES[0], no = tot - PLAN_FILES.length + 1, st = $('#plst_0');
      btn.innerHTML = '<span class="spin s"></span>Mengunggah ' + no + '/' + tot + '…'; if (st) st.innerHTML = '<span class="spin s"></span>';
      let b; try { b = await siapkanBerkas(f); } catch (e) { throw new Error(f.name + ': ' + e.message); }
      const r = await api('unggahMedia', id, b.nama, b.mime, b.b64, true).catch(e => { throw new Error(f.name + ': ' + e.message); });
      if (r.data && r.data.media) S.media = r.data.media;
      PLAN_FILES.shift(); planList();
    }
  } catch (e) {
    S.pending--; setSync(); btn.disabled = false; btn.innerHTML = lbl; planList();
    return setErr('Unggah gagal — ' + e.message + ' Perencanaan belum disimpan; perbaiki lalu klik simpan lagi (berkas yang sudah terunggah tidak diulang).');
  }
  S.pending--; setSync(); selesai();
}
async function unggahBerkas(id, files) {
  const prog = () => $('#upProg'), list = Array.from(files || []);
  for (let i = 0; i < list.length; i++) {
    const f = list[i], lbl = '(' + (i + 1) + '/' + list.length + ') ' + f.name;
    if (MEDIA_OK.indexOf(f.type) < 0) { toast('Format tidak didukung', f.name + ' — gunakan JPG, PNG, WebP, MP4, WebM, atau MOV.', 'err'); continue; }
    try {
      if (prog()) prog().innerHTML = '<span class="spin s"></span> Menyiapkan ' + esc(lbl) + '…';
      const isImg = f.type.indexOf('image') === 0, b64 = isImg ? await kecilkanGambar(f) : await bacaB64(f), mime = isImg ? 'image/jpeg' : f.type;
      if (b64.length * 0.75 > MEDIA_MAX) { toast('Berkas terlalu besar', f.name + ' melebihi 15 MB. Kompres atau potong video terlebih dahulu.', 'err'); continue; }
      if (prog()) prog().innerHTML = '<span class="spin s"></span> Mengunggah ' + esc(lbl) + '…';
      S.pending++; setSync();
      const r = await api('unggahMedia', id, isImg ? f.name.replace(/\.[^.]+$/, '') + '.jpg' : f.name, mime, b64);
      S.pending--; setSync(); merge(r.data);
    } catch (e) { if (S.pending > 0) { S.pending--; setSync(); } toast('Unggah gagal', f.name + ': ' + e.message, 'err'); }
  }
  if (prog()) prog().textContent = '';
}
function b64Blob(b64, mime) { const bin = atob(b64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type: mime }); }
function unduhSummary(id) {
  const p = pOf(id); if (!p) return;
  toast('Menyiapkan treatment summary…', p.Nama, '');
  api('treatmentSummary', id, LANG, demoOn()).then(r => {
    const url = URL.createObjectURL(b64Blob(r.data.b64, 'application/pdf'));
    try { const a = document.createElement('a'); a.href = url; a.download = r.data.nama; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 500); } catch (e) { /* tampilkan di viewer */ }
    viewer(r.data.nama, `<div class="row" style="margin-bottom:10px"><span class="muted" style="font-size:13px">Bila unduhan tidak otomatis berjalan, gunakan tombol berikut.</span><span class="sp"></span><a class="btn p sm" href="${url}" download="${esc(r.data.nama)}"><i class="bi bi-download"></i>Unduh PDF</a></div><iframe src="${url}" title="Treatment summary" style="width:100%;height:70vh;border:1px solid var(--border);border-radius:10px;background:#fff"></iframe>`);
  }).catch(e => toast('Gagal membuat treatment summary', e.message, 'err'));
}
function viewer(title, html) {
  $('#modalHost').innerHTML = `<div class="modal" data-act="mbg"><div class="mbox lg" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><div class="ico"><i class="bi bi-eye"></i></div><div><h2>${esc(title)}</h2></div><button type="button" class="btn g ic sm" style="margin-left:auto" data-act="mclose" aria-label="Tutup"><i class="bi bi-x-lg"></i></button></div><div class="mb" id="vwBody">${html}</div></div></div>`;
}
function bukaMedia(mid) {
  const m = S.media.find(x => x.ID === mid); if (!m) return;
  const tampil = url => { const b = $('#vwBody'); if (!b) return; b.innerHTML = String(m.Mime).indexOf('video') === 0 ? `<video src="${url}" controls playsinline style="width:100%;max-height:70vh;border-radius:10px;background:#000"></video>` : `<img src="${url}" alt="${esc(m.Nama)}" style="width:100%;max-height:72vh;object-fit:contain;border-radius:10px;background:#000">`; };
  viewer(m.Nama, '<div class="empty"><span class="spin"></span><div style="margin-top:10px">Memuat berkas…</div></div>');
  if (mediaCache[mid]) return tampil(mediaCache[mid]);
  api('ambilMedia', mid).then(r => {
    const bin = atob(r.data.b64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    mediaCache[mid] = URL.createObjectURL(new Blob([arr], { type: r.data.mime })); tampil(mediaCache[mid]);
  }).catch(e => { const b = $('#vwBody'); if (b) b.innerHTML = empty('bi-exclamation-triangle', esc(e.message)); });
}
function konfirmasi(o) {
  modal({ icon: o.icon || 'bi-question-circle', size: 'sm', title: o.title, sub: o.sub || '', ok: o.ok || 'Ya, lanjutkan', okCls: o.danger ? 'd' : 'p', okIc: o.okIc || 'bi-check2',
    body: `<p>${o.msg}</p>${o.field ? fld(o.field) : ''}`, onSubmit: form => { const d = obj(form); clearErr(); if (o.field && o.field.req && !d[o.field.n]) return setErr(o.field.l + ' wajib diisi.', o.field.n); closeModal(); o.onOk(d); } });
}
function hapusMedia(mid) {
  const m = S.media.find(x => x.ID === mid); if (!m) return;
  konfirmasi({ title: 'Hapus berkas?', msg: 'Berkas <b>' + esc(m.Nama) + '</b> akan dihapus dari hasil planning.', ok: 'Hapus', danger: true, okIc: 'bi-trash', onOk: () => {
    S.media = S.media.filter(x => x.ID !== mid); dirtyAll(); render(); sync('hapusMedia', [mid]); } });
}
// ═════════ KALENDER / AGENDA ═════════
const JAG = ['Konsultasi', 'Cek Lab', 'CT Planning', 'Radiasi Pertama', 'Radiasi', 'Lainnya'];
const AGI = { 'Konsultasi': 'bi-chat-square-text', 'Cek Lab': 'bi-droplet', 'CT Planning': 'bi-bounding-box', 'Radiasi Pertama': 'bi-lightning-charge-fill', 'Radiasi': 'bi-lightning-charge', 'Lainnya': 'bi-three-dots' };
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], HARI_P = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const agLbl = j => j === 'CT Planning' ? 'CT Simulasi' : j; // nilai data tetap 'CT Planning', tampilan mengikuti nama tahap
const isRadAg = a => a.Jenis === 'Radiasi' || a.Jenis === 'Radiasi Pertama';
const tAdd = (s, n) => { const a = s.split('-').map(Number); return new Date(Date.UTC(a[0], a[1] - 1, a[2] + n)).toISOString().slice(0, 10); };
const dow = s => new Date(s + 'T00:00:00Z').getUTCDay();
const nextKerja = s => { let t = tAdd(s, 1); while (dow(t) === 0 || dow(t) === 6) t = tAdd(t, 1); return t; };
const cmpAg = (x, y) => (x.Tanggal + (x.Jam || '')).localeCompare(y.Tanggal + (y.Jam || ''));
const tglPanjang = s => HARI_P[dow(s)] + ', ' + (+s.slice(8, 10)) + ' ' + BLN[+s.slice(5, 7) - 1] + ' ' + s.slice(0, 4);
function seriRad(id) { return S.agenda.filter(a => a.IDPasien === id && isRadAg(a) && a.Status !== 'Batal').sort(cmpAg); }
function fraksiNo(a) { return isRadAg(a) && a.Status !== 'Batal' ? seriRad(a.IDPasien).indexOf(a) + 1 : 0; }
/** Cermin sesuaikanJadwal_ di server: jumlah jadwal radiasi aktif = jumlah fraksi. */
function jadwalLokal(id) {
  const c = cpOf(id), seri = S.agenda.filter(a => a.IDPasien === id && isRadAg(a)), anchor = seri.find(a => a.Jenis === 'Radiasi Pertama');
  if (!anchor) return;
  const aktif = seri.filter(a => a.Status !== 'Batal').sort(cmpAg);
  if (!aktif.some(a => a.Jenis === 'Radiasi Pertama') && aktif.length) aktif[0].Jenis = 'Radiasi Pertama';
  const N = +c.Fraksi || 0; if (!N) return;
  if (aktif.length < N) { let t = aktif.length ? aktif[aktif.length - 1].Tanggal : anchor.Tanggal;
    for (let i = aktif.length; i < N; i++) { t = nextKerja(t); S.agenda.push({ ID: 'Atmp' + Math.random().toString(36).slice(2, 10), Tanggal: t, Jam: anchor.Jam, Jenis: 'Radiasi', IDPasien: id, Status: 'Terjadwal', Catatan: '', Auto: true, DibuatOleh: 'Otomatis' }); } }
  else if (aktif.length > N) { const buang = aktif.slice().reverse().filter(a => a.Auto && a.Status === 'Terjadwal' && a.Jenis === 'Radiasi').slice(0, aktif.length - N); S.agenda = S.agenda.filter(a => buang.indexOf(a) < 0); }
}
function rentangCal() {
  const r = S.cal.ref, m = S.cal.mode;
  if (m === 'day') return [r, r];
  if (m === 'week') { const a = tAdd(r, -((dow(r) + 6) % 7)); return [a, tAdd(a, 6)]; }
  const a = r.slice(0, 8) + '01';
  const akhir = +a.slice(5, 7) === 12 ? (+a.slice(0, 4) + 1) + '-01-01' : a.slice(0, 5) + pad(+a.slice(5, 7) + 1) + '-01';
  return [a, tAdd(akhir, -1)];
}
function agItem(a) {
  const p = pOf(a.IDPasien), c = cpOf(a.IDPasien), no = fraksiNo(a), N = +c.Fraksi || 0, tmp = String(a.ID).indexOf('Atmp') === 0;
  const stc = a.Status === 'Selesai' ? 'ok' : a.Status === 'Batal' ? 'bad' : 'mut';
  let act = '';
  if (tmp) act = '<span class="spin s" title="Menyinkron…"></span>';
  else {
    if (a.Status === 'Terjadwal' && (isAdm() || peran() === 'Radioterapis')) act += `<button class="btn sm" data-act="agBatal" data-aid="${a.ID}"><i class="bi bi-x-circle"></i>Batal</button>`;
    if (isAdm()) act += `<button class="btn g sm ic" data-act="agEdit" data-aid="${a.ID}" aria-label="Ubah agenda"><i class="bi bi-pencil"></i></button><button class="btn g sm ic" data-act="agDel" data-aid="${a.ID}" aria-label="Hapus agenda"><i class="bi bi-trash"></i></button>`;
  }
  return `<div class="agi ${a.Status === 'Batal' ? 'batal' : ''} ${isRadAg(a) ? 'rad' : ''}"><div class="agt num">${esc(a.Jam || '--:--')}</div>
    <div class="agb"><div class="row" style="gap:6px"><b class="lnk" data-act="agPanel" data-aid="${a.ID}" role="button" tabindex="0" title="Cek-in & detail agenda">${esc(p ? p.Nama : '(pasien tidak ditemukan)')}</b><span class="mono muted" style="font-size:12px">${esc(p ? nrmT(p.NRM) : '')}</span>${tipePill(p)}</div>
    <div class="row" style="gap:6px;margin-top:4px"><span class="pill ${isRadAg(a) ? 'y' : ''}"><i class="bi ${AGI[a.Jenis] || 'bi-dot'}"></i>${esc(agLbl(a.Jenis))}</span>${no ? `<span class="pill num">Fraksi ${no}/${N || '?'}</span>` : ''}<span class="pill ${stc}" data-en="${a.Status === 'Batal' ? 'Cancelled' : a.Status === 'Selesai' ? 'Completed' : 'Scheduled'}">${esc(a.Status)}</span>${a.CekIn ? `<span class="pill ok num" title="Cek-in oleh ${esc(a.CekInOleh || '')}"><i class="bi bi-person-check"></i>Cek-in ${esc(String(a.CekIn).slice(11, 16))}</span>` : ''}${a.Auto ? '<span class="muted" style="font-size:12px">otomatis</span>' : ''}${dow(a.Tanggal) % 6 === 0 && isRadAg(a) ? '<span class="pill y" style="height:22px">Akhir pekan</span>' : ''}</div>
    ${a.Catatan ? `<div class="muted" style="font-size:12px;margin-top:4px">${esc(a.Catatan)}</div>` : ''}</div><div class="aga">${act}</div></div>`;
}
/** Jenis agenda → warna & kode singkat (dipakai di tampilan Minggu/Bulan + legenda). */
const AGT = { 'Radiasi Pertama': ['rad', 'RAD'], 'Radiasi': ['rad', 'RAD'], 'CT Planning': ['ct', 'CT'], 'Cek Lab': ['lab', 'LAB'], 'Konsultasi': ['kons', 'KONS'], 'Lainnya': ['lain', 'LAIN'] };
const agT = a => AGT[a.Jenis] || ['lain', 'LAIN'];
function legendaAg() {
  return `<div class="aglegend" aria-label="Keterangan warna agenda">${[['rad', 'RAD', 'Radiasi'], ['ct', 'CT', 'CT Simulasi'], ['lab', 'LAB', 'Cek Lab'], ['kons', 'KONS', 'Konsultasi'], ['lain', 'LAIN', 'Lainnya']]
    .map(x => `<span class="lg-it t-${x[0]}"><b class="agk">${x[1]}</b>${x[2]}</span>`).join('')}<span class="lg-it st"><i class="bi bi-check2-circle"></i>Selesai</span><span class="lg-it st"><s>Batal</s></span></div>`;
}
function chipAg(a) {
  const p = pOf(a.IDPasien), no = fraksiNo(a), t = agT(a);
  return `<button type="button" class="chipag t-${t[0]} ${a.Status === 'Batal' ? 'batal' : a.Status === 'Selesai' ? 'done' : ''}" data-act="agPanel" data-aid="${a.ID}" data-id="${a.IDPasien}" title="${esc(agLbl(a.Jenis) + ' · ' + (p ? p.Nama : '') + (a.Status !== 'Terjadwal' ? ' · ' + a.Status : '') + (a.CekIn ? ' · cek-in ' + String(a.CekIn).slice(11, 16) : ''))}"><b class="agk">${t[1]}${no ? '·' + no : ''}</b>${a.Status === 'Selesai' ? '<i class="bi bi-check2-circle agok"></i>' : ''}${a.CekIn ? '<i class="bi bi-person-check"></i>' : ''}<span class="num">${esc(a.Jam || '')}</span> ${esc(p ? p.Nama.split(' ').slice(0, 2).join(' ') : '?')}</button>`;
}
function vCalendar() {
  const cal = S.cal, R = rentangCal(), fil = a => !cal.jenis || (cal.jenis === 'radiasi' ? isRadAg(a) : a.Jenis === cal.jenis);
  const ag = S.agenda.filter(fil), pada = t => ag.filter(a => a.Tanggal === t).sort(cmpAg), hi = today();
  const label = cal.mode === 'day' ? tglPanjang(R[0]) : cal.mode === 'week' ? fd(R[0]) + ' – ' + fd(R[1]) : BLN[+R[0].slice(5, 7) - 1] + ' ' + R[0].slice(0, 4);
  const hariIni = S.agenda.filter(a => a.Tanggal >= R[0] && a.Tanggal <= R[1]), sat = cal.mode === 'day' ? 'pasien' : 'jadwal';
  const nRad = hariIni.filter(a => isRadAg(a) && a.Status !== 'Batal').length, nJ = j => hariIni.filter(a => a.Jenis === j && a.Status !== 'Batal').length, tglKpi = `<span>${cal.mode === 'day' ? tglPanjang(R[0]) : label}</span>`;
  let body;
  if (cal.mode === 'day') {
    const L = pada(R[0]), rad = L.filter(isRadAg), per = j => L.filter(a => a.Jenis === j), lain = per('Lainnya');
    const grup = (t, ic, list) => `<div class="card"><div class="card-h"><i class="bi ${ic} link"></i><h3 class="t">${t}</h3><span class="pill">${list.filter(a => a.Status !== 'Batal').length}</span></div><div class="card-b">${list.length ? list.map(agItem).join('') : `<div class="muted">Tidak ada agenda.</div>`}</div></div>`;
    body = `<div class="grid g2">${grup('Radiasi', 'bi-lightning-charge', rad)}${grup('CT Simulasi', AGI['CT Planning'], per('CT Planning'))}${grup('Cek Lab', AGI['Cek Lab'], per('Cek Lab'))}${grup('Konsultasi', AGI['Konsultasi'], per('Konsultasi'))}${lain.length ? grup('Lainnya', AGI['Lainnya'], lain) : ''}</div>${dow(R[0]) % 6 === 0 ? '<div class="hint"><i class="bi bi-info-circle"></i> Akhir pekan: radiasi reguler tidak dijadwalkan otomatis; tambahkan manual bila diperlukan.</div>' : ''}`;
  } else if (cal.mode === 'week') {
    let cols = ''; for (let i = 0; i < 7; i++) { const t = tAdd(R[0], i), L = pada(t);
      cols += `<div class="calcol ${i >= 5 ? 'we' : ''} ${t === hi ? 'today' : ''}"><button type="button" class="calhd" data-act="calDay" data-d="${t}"><b>${HARI[dow(t)]}</b> <span class="num">${+t.slice(8, 10)}/${+t.slice(5, 7)}</span>${L.length ? `<span class="pill" style="height:20px;font-size:11px">${L.filter(a => a.Status !== 'Batal').length}</span>` : ''}</button><div class="calbd">${L.map(chipAg).join('') || '<span class="muted" style="font-size:12px">–</span>'}</div></div>`; }
    body = `<div class="card calw">${cols}</div>`;
  } else {
    const start = tAdd(R[0], -((dow(R[0]) + 6) % 7)); let cells = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(h => `<div class="calmh">${h}</div>`).join('');
    for (let i = 0; i < 42; i++) { const t = tAdd(start, i), L = pada(t), luar = t.slice(0, 7) !== R[0].slice(0, 7), aktif = L.filter(a => a.Status !== 'Batal');
      if (i === 35 && luar) break;
      cells += `<div class="calm-c ${luar ? 'out' : ''} ${i % 7 >= 5 ? 'we' : ''} ${t === hi ? 'today' : ''}" data-act="calDay" data-d="${t}" tabindex="0" role="button" aria-label="${tglPanjang(t)}: ${aktif.length} agenda"><div class="row" style="justify-content:space-between"><span class="num dnum">${+t.slice(8, 10)}</span>${aktif.length ? `<span class="cnt num">${aktif.length}</span>` : ''}</div><div class="calm-l">${L.slice(0, 3).map(chipAg).join('')}${L.length > 3 ? `<small class="muted">+${L.length - 3} lagi</small>` : ''}</div></div>`; }
    body = `<div class="card calm">${cells}</div>`;
  }
  $('#v-calendar').innerHTML = `<div class="stack">
  <div class="pagehead"><div><div class="eyebrow">Penjadwalan Layanan</div><h1>Kalender</h1><p>Kelola agenda harian, mingguan, dan bulanan pasien dalam satu tampilan.</p></div><span class="sp"></span>${isAdm() ? '<button class="btn p" data-act="agNew"><i class="bi bi-calendar-plus"></i>Tambah Agenda</button>' : ''}</div>
  <div class="grid g4">${kpi('Radiasi', nRad, sat, 'bi-lightning-charge', true, tglKpi)}${kpi('CT Simulasi', nJ('CT Planning'), sat, AGI['CT Planning'], false, tglKpi)}${kpi('Cek Lab', nJ('Cek Lab'), sat, AGI['Cek Lab'], false, tglKpi)}${kpi('Konsultasi', nJ('Konsultasi'), sat, AGI['Konsultasi'], false, tglKpi)}</div>
  <div class="card"><div class="card-b row">
    <div class="tabs" role="tablist" style="padding:4px">${[['day', 'Hari'], ['week', 'Minggu'], ['month', 'Bulan']].map(x => `<button class="${cal.mode === x[0] ? 'on' : ''}" data-act="calMode" data-v="${x[0]}" role="tab">${x[1]}</button>`).join('')}</div>
    <div class="row" style="gap:6px"><button class="btn g sm ic" data-act="calNav" data-v="-1" aria-label="Sebelumnya"><i class="bi bi-chevron-left"></i></button><button class="btn sm" data-act="calNav" data-v="0">Hari ini</button><button class="btn g sm ic" data-act="calNav" data-v="1" aria-label="Berikutnya"><i class="bi bi-chevron-right"></i></button></div>
    <b style="font-size:16px">${label}</b><span class="sp"></span>
    <select class="input" style="width:auto;min-width:170px" data-bind="cal.jenis" aria-label="Filter jenis agenda"><option value="">Semua agenda</option><option value="radiasi" ${cal.jenis === 'radiasi' ? 'selected' : ''}>Radiasi saja</option>${JAG.filter(j => !isRadAg({ Jenis: j })).map(j => `<option value="${j}" ${cal.jenis === j ? 'selected' : ''}>${agLbl(j)}</option>`).join('')}</select></div></div>
  ${cal.mode === 'day' ? '' : legendaAg()}${body}</div>`;
}
function geserCal(n) {
  const c = S.cal;
  if (!n) c.ref = today();
  else if (c.mode === 'day') c.ref = tAdd(c.ref, n);
  else if (c.mode === 'week') c.ref = tAdd(c.ref, 7 * n);
  else { const y = +c.ref.slice(0, 4), m = +c.ref.slice(5, 7) - 1 + n, d = new Date(y, m, 1); c.ref = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-01'; }
  renderView('calendar');
}
function agHint() {
  const h = $('#agHint'); if (!h) return;
  const j = $('#f_Jenis').value, id = $('#f_IDPasien').value, t = $('#f_Tanggal').value, c = id ? cpOf(id) : {}, N = +c.Fraksi || 0, ada = id && S.agenda.some(a => a.IDPasien === id && a.Jenis === 'Radiasi Pertama' && a.Status !== 'Batal' && a.ID !== h.dataset.aid);
  let m = '';
  if (j === 'Radiasi Pertama') m = N ? `Jadwal radiasi berikutnya dibuat otomatis Senin–Jumat hingga total <b>${N} fraksi</b>, mulai hari kerja setelah tanggal ini.` : 'Jumlah fraksi belum diketahui (Delineasi belum diisi). Jadwal lanjutan dibuat otomatis setelah Delineasi disimpan.';
  if (j === 'Radiasi') m = ada ? `Total jadwal radiasi dijaga = ${N || '?'} fraksi: menambah jadwal ini akan mengurangi 1 jadwal otomatis paling akhir.` + (t && dow(t) % 6 === 0 ? ' (Radiasi akhir pekan.)' : '') : 'Pasien belum punya agenda Radiasi Pertama; sebaiknya buat Radiasi Pertama agar jadwal lanjutan dibuat otomatis.';
  h.innerHTML = m ? '<i class="bi bi-info-circle"></i> ' + m : '';
}
function openAgenda(aid, preset) {
  const a = aid ? S.agenda.find(x => x.ID === aid) : Object.assign({ Tanggal: S.cal.ref || today(), Jam: '08:00', Jenis: 'Radiasi Pertama', Status: 'Terjadwal' }, preset || {});
  if (!a) return;
  const ps = S.pasien.filter(p => !cpOf(p.ID).RujukTgl || p.ID === a.IDPasien).slice().sort((x, y) => String(x.Nama).localeCompare(String(y.Nama)));
  modal({ icon: 'bi-calendar-event', title: aid ? 'Ubah agenda' : 'Tambah agenda', sub: aid && a.Auto ? 'Agenda dibuat otomatis — mengubah tanggal menjadikannya agenda manual' : 'CT Simulasi, Cek Lab, Konsultasi, Radiasi', ok: aid ? 'Simpan perubahan' : 'Tambah agenda',
    body: `<div class="fgrid">${fld({ n: 'IDPasien', l: 'Pasien', t: 'select', req: 1, v: a.IDPasien || '', cls: 'full', opts: [{ v: '', t: '— pilih pasien —' }].concat(ps.map(p => ({ v: p.ID, t: p.Nama + ' · ' + nrmT(p.NRM) }))) })}
    ${fld({ n: 'Jenis', l: 'Jenis agenda', t: 'select', req: 1, v: a.Jenis, opts: JAG.map(j => ({ v: j, t: agLbl(j) })) })}${aid ? fld({ n: 'Status', l: 'Status', t: 'select', v: a.Status, opts: ['Terjadwal', 'Selesai', 'Batal'].map(s => ({ v: s, t: s })) }) : '<div></div>'}
    ${fld({ n: 'Tanggal', l: 'Tanggal', t: 'date', req: 1, v: a.Tanggal })}${fld({ n: 'Jam', l: 'Jam', t: 'time', v: a.Jam || '' })}
    ${fld({ n: 'Catatan', l: 'Catatan (opsional)', v: a.Catatan || '', cls: 'full' })}</div><div class="hint" id="agHint" data-aid="${aid || ''}"></div>`,
    onSubmit: form => {
      const d = obj(form); clearErr();
      if (!d.IDPasien) return setErr('Pilih pasien.', 'IDPasien');
      if (!d.Tanggal) return setErr('Tanggal wajib diisi.', 'Tanggal');
      if (d.Jenis === 'Radiasi Pertama' && S.agenda.some(x => x.IDPasien === d.IDPasien && x.Jenis === 'Radiasi Pertama' && x.Status !== 'Batal' && x.ID !== aid)) return setErr('Pasien ini sudah memiliki Radiasi Pertama. Ubah agenda tersebut bila tanggal berganti.', 'Jenis');
      const rec = { ID: aid || 'Atmp' + Date.now(), Tanggal: d.Tanggal, Jam: d.Jam || '', Jenis: d.Jenis, IDPasien: d.IDPasien, Status: d.Status || 'Terjadwal', Catatan: d.Catatan || '', Auto: aid ? a.Auto && a.Tanggal === d.Tanggal : false, DibuatOleh: aid ? a.DibuatOleh : S.me.nama };
      const geser = rec.Jenis === 'Radiasi Pertama' && (!aid || a.Tanggal !== rec.Tanggal || a.Jam !== rec.Jam || a.Jenis !== 'Radiasi Pertama');
      const lamaRad = aid && isRadAg(a);
      if (aid) Object.assign(a, rec); else S.agenda.push(rec);
      if (geser) S.agenda = S.agenda.filter(x => !(x.IDPasien === rec.IDPasien && x.Jenis === 'Radiasi' && x.Auto && x.Status === 'Terjadwal'));
      if (isRadAg(rec) || lamaRad) jadwalLokal(rec.IDPasien);
      S.cal.ref = rec.Tanggal;
      closeModal(); dirtyAll(); render(); toast(aid ? 'Agenda diperbarui' : 'Agenda ditambahkan', rec.Jenis + ' · ' + (pOf(rec.IDPasien) || {}).Nama, 'ok');
      sync('simpanAgenda', [Object.assign({}, rec, { ID: aid || '' })]);
    } });
  agHint();
}
const bolehCekin = () => isAdm() || peran() === 'Radioterapis';
function openCekin(aid) {
  const a = S.agenda.find(x => x.ID === aid); if (!a) return;
  const p = pOf(a.IDPasien) || {}, no = fraksiNo(a), boleh = bolehCekin() && a.Status !== 'Batal' && String(a.ID).indexOf('Atmp') !== 0;
  const dt = new Date(), now = iso(dt) + 'T' + pad(dt.getHours()) + ':' + pad(dt.getMinutes()), v = a.CekIn ? String(a.CekIn).slice(0, 16).replace(' ', 'T') : '';
  modal({ icon: 'bi-person-check', size: 'sm', title: p.Nama || 'Agenda', sub: agLbl(a.Jenis) + (no ? ' · fraksi ' + no : '') + ' · ' + tglPanjang(a.Tanggal) + (a.Jam ? ' ' + a.Jam : ''), ok: boleh ? 'Simpan cek-in' : 'Tutup', okIc: boleh ? 'bi-check2' : 'bi-x-lg',
    body: `<div class="kv"><div><small>NRM</small><b class="num">${esc(p.NRM ? nrmT(p.NRM) : '–')}</b></div><div><small>Status agenda</small><b>${esc(a.Status)}</b></div></div>
      <label class="chk ci"><input type="checkbox" id="ciChk" ${a.CekIn ? 'checked' : ''} ${boleh ? '' : 'disabled'}><div><b>Pasien sudah cek-in</b><span>Centang saat pasien hadir; tanggal &amp; jam terisi otomatis sekarang.</span></div></label>
      ${fld({ n: 'cekin', l: 'Tanggal & jam cek-in', t: 'datetime-local', v: v, ro: !boleh })}
      ${a.CekInOleh ? `<div class="hint">Dicatat oleh ${esc(a.CekInOleh)}</div>` : ''}${boleh ? '' : `<div class="hint">${a.Status === 'Batal' ? 'Agenda dibatalkan.' : 'Cek-in dicatat oleh Admin atau Radioterapis.'}</div>`}
      <div class="row" style="gap:8px"><button type="button" class="btn g sm" data-act="open" data-id="${a.IDPasien}"><i class="bi bi-person-lines-fill"></i>Detail pasien</button>${isAdm() && String(a.ID).indexOf('Atmp') !== 0 ? `<button type="button" class="btn g sm" data-act="agEdit" data-aid="${a.ID}"><i class="bi bi-pencil"></i>Ubah agenda</button>` : ''}</div>`,
    onSubmit: form => {
      if (!boleh) return closeModal();
      const on = $('#ciChk').checked, w = on ? ($('#f_cekin').value || now) : '';
      if (on && w.slice(0, 10) > today()) return setErr('Waktu cek-in tidak boleh di masa depan.', 'cekin');
      a.CekIn = w ? w.replace('T', ' ') + ':00' : ''; a.CekInOleh = w ? S.me.nama : '';
      closeModal(); dirtyAll(); render(); toast(w ? 'Cek-in tercatat' : 'Cek-in dibatalkan', (p.Nama || '') + (w ? ' · ' + w.slice(11, 16) : ''), 'ok');
      sync('cekinAgenda', [aid, w]);
    } });
  const cb = $('#ciChk'), inp = $('#f_cekin');
  if (inp && !cb.checked) inp.disabled = true;
  if (cb) cb.addEventListener('change', () => { if (!inp) return; inp.disabled = !cb.checked; if (cb.checked) { const d2 = new Date(); inp.value = iso(d2) + 'T' + pad(d2.getHours()) + ':' + pad(d2.getMinutes()); } else inp.value = ''; });
}
function batalAg(aid) {
  const a = S.agenda.find(x => x.ID === aid); if (!a) return; const p = pOf(a.IDPasien) || {};
  konfirmasi({ icon: 'bi-x-circle', title: 'Batalkan ' + agLbl(a.Jenis), sub: (p.Nama || '') + ' · ' + tglPanjang(a.Tanggal), ok: 'Batalkan agenda', danger: true, okIc: 'bi-x-circle',
    msg: isRadAg(a) ? 'Pasien berhalangan hadir. Satu jadwal radiasi pengganti otomatis ditambahkan pada hari kerja setelah jadwal terakhir.' : 'Agenda ditandai batal dan tetap tercatat.',
    field: { n: 'alasan', l: 'Alasan pembatalan', req: 1, t: 'textarea', cls: 'full', ph: 'mis. pasien demam, mesin maintenance, keluarga berhalangan…' },
    onOk: d => {
      a.Status = 'Batal'; a.Catatan = 'Batal: ' + d.alasan + (a.Catatan ? ' | ' + a.Catatan : '');
      if (isRadAg(a)) jadwalLokal(a.IDPasien);
      dirtyAll(); render(); toast('Agenda dibatalkan', isRadAg(a) ? 'Jadwal pengganti ditambahkan di akhir.' : '', 'ok');
      sync('batalAgenda', [aid, d.alasan]);
    } });
}
function hapusAg(aid) {
  const a = S.agenda.find(x => x.ID === aid); if (!a) return; const p = pOf(a.IDPasien) || {};
  const msg = a.Jenis === 'Radiasi Pertama' ? 'Agenda Radiasi Pertama beserta seluruh jadwal radiasi otomatis yang belum terlaksana akan dihapus.'
    : a.Jenis === 'Radiasi' ? 'Jumlah jadwal radiasi dijaga sama dengan jumlah fraksi, sehingga 1 jadwal pengganti ditambahkan di akhir. Untuk mengurangi jumlah fraksi, catat Perubahan Dosis di detail pasien.' : 'Agenda akan dihapus permanen.';
  konfirmasi({ icon: 'bi-trash', title: 'Hapus agenda?', sub: agLbl(a.Jenis) + ' · ' + (p.Nama || '') + ' · ' + fd(a.Tanggal), msg, ok: 'Hapus', danger: true, okIc: 'bi-trash', onOk: () => {
    S.agenda = S.agenda.filter(x => x !== a && !(a.Jenis === 'Radiasi Pertama' && x.IDPasien === a.IDPasien && x.Jenis === 'Radiasi' && x.Auto && x.Status === 'Terjadwal'));
    if (a.Jenis === 'Radiasi') jadwalLokal(a.IDPasien);
    dirtyAll(); render(); sync('hapusAgenda', [aid]); } });
}
// ═════════ REPORT: KEPATUHAN TAT BULANAN & PROFIL PASIEN ═════════
const KPT = [
  { id: 'chKpCT', l: 'Konsultasi → CT Simulasi', lim: 3, a: 'ConsultTgl', b: 'CTTgl', grp: 'bulan Konsultasi' },
  { id: 'chKpRad', l: 'CT Simulasi → Radiasi', lim: 7, a: 'CTTgl', b: 'RadMulai', grp: 'bulan CT Simulasi' }
];
const TARGET_PCT = 90, CLR_OK = '#16A34A', CLR_WARN = '#E0A100';
function bulanSeri(n, akhir) {
  const y = +akhir.slice(0, 4), m = +akhir.slice(5, 7) - 1, out = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(y, m - i, 1); out.push({ k: d.getFullYear() + '-' + pad(d.getMonth() + 1), l: BLN[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2) }); }
  return out;
}
function distRows() {
  const f = S.rf;
  return S.pasien.filter(p => { const c = cpOf(p.ID), t = String(c.ConsultTgl || p.TglDibuat || '').slice(0, 10);
    if (f.from && t < f.from) return false; if (f.to && t > f.to) return false;
    if (f.dokter && p.DokterOnkologi !== f.dokter) return false; if (f.teknik && c.Teknik !== f.teknik) return false;
    if (f.kasus && c.ConsultKasus !== f.kasus) return false; return true; });
}
const PROV = /^(dki|daerah khusus|daerah istimewa|di yogyakarta|jawa|banten|sumatera|sumatra|kalimantan|sulawesi|bali|nusa tenggara|ntt|ntb|papua|maluku|aceh|riau|kepulauan riau|jambi|bengkulu|lampung|gorontalo|bangka)/i;
function kotaDari(alamat) {
  const seg = String(alamat || '').split(',').map(s => s.replace(/\b\d{5}\b/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  for (let i = seg.length - 1; i >= 1; i--) {
    let s = seg[i];
    if (PROV.test(s) && i > 1) continue;
    if (/^(rt|rw|no\.?|jl\.?|jln\.?|jalan|blok|gg\.?|gang|kel\.?|kelurahan|kec\.?|kecamatan|desa)\b/i.test(s)) continue;
    s = s.replace(/^(kota adm\.?|kota administrasi|kota|kab\.?|kabupaten)\s+/i, '').replace(/^dki\s+/i, '').trim();
    if (s) return s.toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase());
  }
  return '';
}
const valLbl = { id: 'valLbl', afterDatasetsDraw(ch) {
  const po = ch.config.options.plugins, o = po && po.valLbl; if (!o || !o.on) return;  // opsi mentah: fungsi fmt tidak boleh di-resolve Chart.js
  const cx = ch.ctx; cx.save(); cx.font = '600 11px Inter, system-ui, sans-serif'; cx.fillStyle = css('--text');
  ch.data.datasets.forEach((ds, di) => { if (o.ds != null && o.ds !== di) return; const meta = ch.getDatasetMeta(di); if (meta.hidden) return;
    meta.data.forEach((el, i) => { const v = ds.data[i]; if (v == null) return; const t = o.fmt ? o.fmt(v, i) : String(v);
      if (ch.options.indexAxis === 'y') { cx.textAlign = 'left'; cx.textBaseline = 'middle'; cx.fillText(t, el.x + 6, el.y); }
      else { cx.textAlign = 'center'; cx.textBaseline = 'bottom'; cx.fillText(t, el.x, el.y - 4); } }); });
  cx.restore(); } };
/** Radiation Time per sesi = cek-in (Kalender) → waktu selesai radiasi (verifikasi fraksi), pada tanggal yang sama. */
const RT_LIM = 30;
function sesiRadTime(rows) {
  const ids = {}; rows.forEach(p => { ids[p.ID] = 1; });
  const ci = {}; S.agenda.forEach(a => { if (a.CekIn && ids[a.IDPasien]) (ci[a.IDPasien + '|' + String(a.CekIn).slice(0, 10)] = ci[a.IDPasien + '|' + String(a.CekIn).slice(0, 10)] || []).push(String(a.CekIn)); });
  const out = []; let tanpa = 0;
  S.fraksiLog.forEach(l => { if (!ids[l.IDPasien]) return; const w = String(l.Waktu), L = ci[l.IDPasien + '|' + w.slice(0, 10)];
    const c = L && L.filter(x => x <= w).sort().pop(); if (!c) { tanpa++; return; }
    const m = Math.round((new Date(w.replace(' ', 'T')) - new Date(c.replace(' ', 'T'))) / 6e4); if (!(m >= 0 && m <= 720)) { tanpa++; return; }
    out.push({ k: w.slice(0, 7), m, id: l.IDPasien }); });
  return { s: out, tanpa };
}
function hitungRadTime(rows, ser) {
  const r = sesiRadTime(rows), by = {}; let n = 0, ok = 0; const keys = {}; ser.forEach(x => { keys[x.k] = 1; });
  r.s.forEach(x => { if (!keys[x.k]) return; (by[x.k] = by[x.k] || { n: 0, ok: 0, d: [] }); by[x.k].n++; by[x.k].d.push(x.m); if (x.m < RT_LIM) by[x.k].ok++; n++; if (x.m < RT_LIM) ok++; });
  const all = r.s.filter(x => keys[x.k]).map(x => x.m).sort((a, b) => a - b);
  return { by, n, ok, pct: n ? Math.round(ok / n * 100) : null, med: all.length ? all[Math.floor((all.length - 1) / 2)] : null, tanpa: r.tanpa, bulanOk: ser.filter(s => by[s.k] && by[s.k].ok / by[s.k].n * 100 >= TARGET_PCT).length, bulanAda: ser.filter(s => by[s.k]).length };
}
function hitungKpt(k, rows, ser) {
  const by = {}; let n = 0, ok = 0;
  rows.forEach(p => { const c = cpOf(p.ID), d = diff(c[k.a], c[k.b]); if (d == null) return; const m = String(c[k.a]).slice(0, 7);
    (by[m] = by[m] || { n: 0, ok: 0, d: [] }); by[m].n++; by[m].d.push(d); if (d <= k.lim) { by[m].ok++; } });
  ser.forEach(s => { if (by[s.k]) { n += by[s.k].n; ok += by[s.k].ok; } });
  return { by, n, ok, pct: n ? Math.round(ok / n * 100) : null, bulanOk: ser.filter(s => by[s.k] && by[s.k].ok / by[s.k].n * 100 >= TARGET_PCT).length, bulanAda: ser.filter(s => by[s.k]).length };
}
function distEntri(rows, fn) {
  const cnt = {}; let kosong = 0;
  rows.forEach(p => { const v = fn(p, cpOf(p.ID)); if (!v) { kosong++; return; } cnt[v] = (cnt[v] || 0) + 1; });
  let e = Object.keys(cnt).map(k => ({ k, n: cnt[k] })).sort((a, b) => b.n - a.n || a.k.localeCompare(b.k));
  if (e.length > 10) { const lain = e.slice(9).reduce((s, x) => s + x.n, 0); e = e.slice(0, 9).concat([{ k: 'Lainnya (' + (e.length - 9) + ')', n: lain }]); }
  return { e, total: e.reduce((s, x) => s + x.n, 0), kosong };
}
const DIST = [
  { id: 'dKasus', t: 'Kasus', ic: 'bi-clipboard2-pulse', fn: (p, c) => c.ConsultKasus, kosong: 'belum Konsultasi' },
  { id: 'dTeknik', t: 'Teknik radiasi', ic: 'bi-cpu', fn: (p, c) => c.Teknik, kosong: 'belum Perencanaan' },
  { id: 'dDpjp', t: 'Dokter onkologi radiasi', ic: 'bi-heart-pulse', fn: p => p.DokterOnkologi },
  { id: 'dPerujuk', t: 'Dokter perujuk', ic: 'bi-person-badge', fn: p => p.DokterPerujuk },
  { id: 'dRs', t: 'RS perujuk', ic: 'bi-hospital', fn: p => p.RSPerujuk },
  { id: 'dProv', t: 'Provinsi pasien', ic: 'bi-map', fn: p => provP(p), kosong: 'provinsi belum diisi' },
  { id: 'dKota', t: 'Kota / kabupaten pasien', ic: 'bi-geo-alt', fn: p => kotaP(p), kosong: 'kota belum diisi' },
  { id: 'dKec', t: 'Kecamatan pasien', ic: 'bi-pin-map', fn: p => kecP(p), kosong: 'kecamatan belum diisi' },
  { id: 'dTipe', t: 'Tipe pasien', ic: 'bi-hospital', fn: p => p.TipePasien ? (p.TipePasien === 'IPD' ? 'IPD · Rawat inap' : 'OPD · Rawat jalan') : '' },
  { id: 'dPayer', t: 'Payer (penjamin)', ic: 'bi-wallet2', fn: p => p.Payer }
];
function htmlReportBaru() {
  const rows = distRows(), akhir = S.rf.to || today(), ser = bulanSeri(12, akhir);
  const kp = KPT.map(k => Object.assign({ k }, hitungKpt(k, rows, ser)));
  const kartuKp = x => { const met = x.pct != null && x.pct >= TARGET_PCT;
    return `<div class="card"><div class="card-h"><div style="min-width:0"><h3 class="t">TAT ${x.k.l} ≤ ${x.k.lim} hari</h3><div class="sub">% pasien memenuhi batas per ${x.k.grp} · target ${TARGET_PCT}% pasien</div></div><span class="sp"></span>
      <div style="text-align:right"><div class="num" style="font-size:24px;font-weight:600;line-height:28px">${x.pct == null ? '–' : x.pct + '%'}</div>${x.pct == null ? '' : `<span class="pill ${met ? 'ok' : 'y'}" style="height:22px"><i class="bi ${met ? 'bi-check2-circle' : 'bi-exclamation-triangle'}"></i>${met ? 'Target tercapai' : 'Di bawah target'}</span>`}</div></div>
      <div class="card-b"><div class="chart" style="height:260px"><canvas id="${x.k.id}" aria-label="Grafik kepatuhan TAT ${x.k.l}"></canvas></div>
      <div class="hint" style="margin-top:8px">${x.n} pasien dalam 12 bulan · ${x.ok} memenuhi ≤ ${x.k.lim} hari · ${x.bulanOk} dari ${x.bulanAda} bulan mencapai target. Arahkan kursor ke batang untuk rinciannya.</div></div></div>`; };
  const kartuDist = d => { const r = distEntri(rows, d.fn), top = r.e[0];
    return `<div class="card"><div class="card-h"><i class="bi ${d.ic} link"></i><div style="min-width:0"><h3 class="t">${d.t}</h3><div class="sub">${r.total} pasien${top ? ` · terbanyak <b>${esc(top.k)}</b> (${Math.round(top.n / r.total * 100)}%)` : ''}${r.kosong ? ` · ${r.kosong} ${d.kosong || 'belum diisi'}` : ''}</div></div></div>
      <div class="card-b">${r.e.length ? `<div class="pdist" role="list" aria-label="Distribusi ${d.t}">${r.e.map((x, i) => { const pc = Math.round(x.n / r.total * 100);
        return `<div class="it${x.n === top.n ? ' top' : ''}" role="listitem" title="${esc(x.k)}: ${x.n} pasien (${pc}%)"><div class="hd"><span class="rk">${i + 1}</span><span class="nm">${esc(x.k)}</span><span class="vl"><b>${x.n}</b> pasien · ${pc}%</span></div><div class="bar"><i style="width:${Math.max(pc, 2)}%"></i></div></div>`; }).join('')}</div>` : empty('bi-bar-chart', 'Belum ada data.')}</div></div>`; };
  return `<div class="secttl"><i class="bi bi-speedometer2"></i>Kepatuhan TAT bulanan <span class="muted">· 12 bulan s/d ${BLN[+akhir.slice(5, 7) - 1]} ${akhir.slice(0, 4)} · mengikuti filter di atas</span></div>
  <div class="grid g2">${kp.map(kartuKp).join('')}</div>
  <div class="grid g2">${(() => { const x = hitungRadTime(rows, ser), met = x.pct != null && x.pct >= TARGET_PCT;
    return `<div class="card"><div class="card-h"><i class="bi bi-stopwatch link"></i><div style="min-width:0"><h3 class="t">TAT Radiation Time &lt; ${RT_LIM} menit</h3><div class="sub">% sesi radiasi dari cek-in (Kalender) sampai selesai radiasi (verifikasi fraksi) · target ${TARGET_PCT}% sesi</div></div><span class="sp"></span>
      <div style="text-align:right"><div class="num" style="font-size:24px;font-weight:600;line-height:28px">${x.pct == null ? '–' : x.pct + '%'}</div>${x.pct == null ? '' : `<span class="pill ${met ? 'ok' : 'y'}" style="height:22px"><i class="bi ${met ? 'bi-check2-circle' : 'bi-exclamation-triangle'}"></i>${met ? 'Target tercapai' : 'Di bawah target'}</span>`}</div></div>
      <div class="card-b"><div class="chart" style="height:260px"><canvas id="chRadTime" aria-label="Grafik radiation time per bulan"></canvas></div>
      <div class="hint" style="margin-top:8px">${x.n} sesi dalam 12 bulan · ${x.ok} sesi &lt; ${RT_LIM} menit${x.med != null ? ' · median ' + x.med + ' menit' : ''} · ${x.bulanOk} dari ${x.bulanAda} bulan mencapai target.${x.tanpa ? ' ' + x.tanpa + ' fraksi tanpa data cek-in pada hari yang sama tidak dihitung.' : ''}</div></div></div>`; })()}
  <div class="card"><div class="card-h"><i class="bi bi-people link"></i><div><h3 class="t">Jumlah pasien per bulan</h3><div class="sub">Berdasarkan bulan Konsultasi (atau tanggal registrasi bila belum Konsultasi)</div></div></div><div class="card-b"><div class="chart" style="height:260px"><canvas id="chJml" aria-label="Grafik jumlah pasien per bulan"></canvas></div></div></div></div>
  <div class="secttl"><i class="bi bi-pie-chart"></i>Profil pasien <span class="muted">· ${rows.length} pasien sesuai filter</span></div>
  <div class="grid g2">${DIST.map(kartuDist).join('')}</div>`;
}
function grafikReportBaru() {
  const rows = distRows(), akhir = S.rf.to || today(), ser = bulanSeri(12, akhir), grid = css('--border');
  KPT.forEach(k => {
    const h = hitungKpt(k, rows, ser), pct = ser.map(s => h.by[s.k] ? Math.round(h.by[s.k].ok / h.by[s.k].n * 100) : null);
    mk(k.id, { type: 'bar', plugins: [valLbl], data: { labels: ser.map(s => [s.l, 'n=' + (h.by[s.k] ? h.by[s.k].n : 0)]), datasets: [
      { type: 'bar', label: tx('% pasien ≤ ' + k.lim + ' hari'), data: pct, backgroundColor: pct.map(v => v == null ? 'transparent' : v >= TARGET_PCT ? CLR_OK : CLR_WARN), borderRadius: 4, maxBarThickness: 34 },
      { type: 'line', label: 'Target ' + TARGET_PCT + '%', data: ser.map(() => TARGET_PCT), borderColor: dark() ? '#BCD1F7' : '#0B2A5B', borderWidth: 2, borderDash: [6, 4], pointRadius: 0 }] },
      options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } }, valLbl: { on: true, ds: 0, fmt: v => v + '%' },
          tooltip: { callbacks: { afterBody: it => { const s = ser[it[0].dataIndex], b = h.by[s.k]; if (!b) return tx('Tidak ada pasien'); const med = b.d.slice().sort((x, y) => x - y)[Math.floor((b.d.length - 1) / 2)];
            return [tx(b.ok + ' dari ' + b.n + ' pasien ≤ ' + k.lim + ' hari'), tx('Median ' + med + ' hari · terlama ' + Math.max.apply(null, b.d) + ' hari'), tx((b.ok / b.n * 100 >= TARGET_PCT ? '✓ Memenuhi' : '⚠ Di bawah') + ' target ' + TARGET_PCT + '%')]; } } } },
        scales: { y: { min: 0, max: 110, ticks: { stepSize: 20, callback: v => v <= 100 ? v + '%' : '' }, grid: { color: grid } }, x: { grid: { display: false } } } } });
  });
  { const h = hitungRadTime(rows, ser), pct = ser.map(s => h.by[s.k] ? Math.round(h.by[s.k].ok / h.by[s.k].n * 100) : null);
    mk('chRadTime', { type: 'bar', plugins: [valLbl], data: { labels: ser.map(s => [s.l, 'n=' + (h.by[s.k] ? h.by[s.k].n : 0)]), datasets: [
      { type: 'bar', label: tx('% sesi') + ' < ' + RT_LIM + ' ' + tx('menit'), data: pct, backgroundColor: pct.map(v => v == null ? 'transparent' : v >= TARGET_PCT ? CLR_OK : CLR_WARN), borderRadius: 4, maxBarThickness: 34 },
      { type: 'line', label: 'Target ' + TARGET_PCT + '%', data: ser.map(() => TARGET_PCT), borderColor: dark() ? '#BCD1F7' : '#0B2A5B', borderWidth: 2, borderDash: [6, 4], pointRadius: 0 }] },
      options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } }, valLbl: { on: true, ds: 0, fmt: v => v + '%' },
          tooltip: { callbacks: { afterBody: it => { const s = ser[it[0].dataIndex], b = h.by[s.k]; if (!b) return tx('Tidak ada sesi'); const med = b.d.slice().sort((x, y) => x - y)[Math.floor((b.d.length - 1) / 2)];
            return [b.ok + ' / ' + b.n + ' ' + tx('sesi') + ' < ' + RT_LIM + ' ' + tx('menit'), 'Median ' + med + ' ' + tx('menit') + ' · max ' + Math.max.apply(null, b.d) + ' ' + tx('menit')]; } } } },
        scales: { y: { min: 0, max: 110, ticks: { stepSize: 20, callback: v => v <= 100 ? v + '%' : '' }, grid: { color: grid } }, x: { grid: { display: false } } } } }); }
  const cnt = {}; rows.forEach(p => { const m = String(cpOf(p.ID).ConsultTgl || p.TglDibuat || '').slice(0, 7); cnt[m] = (cnt[m] || 0) + 1; });
  const jml = ser.map(s => cnt[s.k] || 0), rata = Math.round(jml.reduce((a, b) => a + b, 0) / ser.length * 10) / 10;
  mk('chJml', { type: 'bar', plugins: [valLbl], data: { labels: ser.map(s => s.l), datasets: [
    { type: 'bar', label: tx('Pasien baru'), data: jml, backgroundColor: ser.map((s, i) => i === ser.length - 1 ? '#FFC93C' : '#1F5FBF'), borderRadius: 4, maxBarThickness: 40 },
    { type: 'line', label: tx('Rata-rata ' + rata + '/bulan'), data: ser.map(() => rata), borderColor: css('--muted'), borderWidth: 2, borderDash: [4, 4], pointRadius: 0 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } }, valLbl: { on: true, ds: 0, fmt: v => v || '' } },
      scales: { y: { beginAtZero: true, grace: '12%', ticks: { precision: 0 }, grid: { color: grid } }, x: { grid: { display: false } } } } });
}

// ═════════ INVENTORY ACTIONS ═════════
function adjStok(id, delta) {
  const it = S.inv.find(x => x.ID === id); if (!it || !canStok()) return;
  if (it.Stok + delta < 0) return toast('Stok tidak boleh negatif', it.Jenis, 'warn');
  it.Stok += delta;
  S.logStok.unshift({ Waktu: nowStr(), Jenis: it.Jenis, Perubahan: delta, StokSetelah: it.Stok, Alasan: 'Penyesuaian manual', IDPasien: '', Pengguna: S.me.nama });
  dirtyAll(); render(); sync('sesuaikanStok', [id, delta, 'Penyesuaian manual']);
}
function openAmbang(id) {
  const it = S.inv.find(x => x.ID === id); if (!it || !canStok()) return;
  modal({ icon: 'bi-sliders', size: 'sm', title: 'Ambang minimal stok', sub: it.Jenis + ' · stok saat ini ' + it.Stok + ' pcs', ok: 'Simpan ambang',
    body: `${fld({ n: 'min', l: 'Ambang minimal (pcs)', t: 'number', req: 1, v: it.Min, mono: 1, step: '1', min: '0', hint: 'Status menjadi “Menipis” bila stok sama dengan atau di bawah angka ini, dan “Habis” bila stok 0.' })}`,
    onSubmit: form => {
      const d = obj(form); clearErr(); const v = Number(d.min);
      if (d.min === '' || !(v >= 0) || v !== Math.floor(v)) return setErr('Ambang minimal harus bilangan bulat ≥ 0.', 'min');
      const lama = it.Min; it.Min = v;
      S.akt.unshift({ Waktu: nowStr(), Pengguna: S.me.nama, Aksi: 'Ubah Ambang Stok', IDPasien: '', Tahap: '', Detail: it.Jenis + ' ' + lama + ' → ' + v });
      closeModal(); dirtyAll(); render(); toast('Ambang disimpan', it.Jenis + ' · min ' + v + ' pcs', 'ok'); sync('ubahAmbang', [id, v]);
    } });
}
function openOpname() {
  const inv = S.inv.filter(i => i.Aktif);
  modal({ icon: 'bi-clipboard-check', title: 'Stok opname', sub: 'Masukkan jumlah fisik hasil hitung; selisih dicatat di log.', ok: 'Simpan hasil opname', size: 'lg',
    body: `<div class="tw"><table class="tbl" style="min-width:420px"><thead><tr><th>Jenis</th><th class="r">Sistem</th><th style="width:140px">Fisik</th></tr></thead><tbody>${inv.map(i => `<tr><td><b>${esc(i.Jenis)}</b></td><td class="r num">${i.Stok}</td><td><input class="input mono" type="number" min="0" step="1" name="o_${i.ID}" value="${i.Stok}" aria-label="Jumlah fisik ${esc(i.Jenis)}"></td></tr>`).join('')}</tbody></table></div>${fld({ n: 'catatan', l: 'Catatan (opsional)', v: '' })}`,
    onSubmit: form => {
      const d = obj(form), items = []; let bad = '';
      inv.forEach(i => { const v = parseInt(d['o_' + i.ID], 10); if (!isFinite(v) || v < 0) bad = 'Jumlah fisik ' + i.Jenis + ' tidak valid.'; else if (v !== i.Stok) items.push({ id: i.ID, fisik: v }); });
      if (bad) return setErr(bad);
      if (!items.length) { closeModal(); return toast('Tidak ada selisih', 'Stok sistem sesuai hitungan fisik.', 'ok'); }
      items.forEach(x => { const it = S.inv.find(i => i.ID === x.id), sel = x.fisik - it.Stok; it.Stok = x.fisik; S.logStok.unshift({ Waktu: nowStr(), Jenis: it.Jenis, Perubahan: sel, StokSetelah: x.fisik, Alasan: 'Stok opname (selisih ' + (sel > 0 ? '+' : '') + sel + ')', IDPasien: '', Pengguna: S.me.nama }); });
      closeModal(); dirtyAll(); render(); toast('Opname tersimpan', items.length + ' jenis disesuaikan.', 'ok'); sync('stokOpname', [items, d.catatan || '']);
    } });
}
function openJenis() {
  modal({ icon: 'bi-plus-circle', title: 'Tambah jenis masker', sub: 'Daftarkan alat fiksasi baru ke inventaris', size: 'sm',
    body: `<div class="fgrid">${fld({ n: 'Jenis', l: 'Nama jenis', req: 1, cls: 'full' })}${fld({ n: 'Stok', l: 'Stok awal', t: 'number', v: 0, mono: 1, step: '1', min: '0' })}${fld({ n: 'Min', l: 'Ambang minimum', t: 'number', v: 5, mono: 1, step: '1', min: '0' })}${fld({ n: 'Lokasi', l: 'Lokasi rak', cls: 'full' })}<label class="chk full"><input type="checkbox" name="Reusable"><div><b>Alat pakai ulang</b><span>Stok hanya berkurang selama pasien menjalani radiasi dan kembali saat radiasi selesai (mis. Vacuum lock).</span></div></label></div>`,
    onSubmit: form => {
      const d = obj(form); clearErr();
      if (!d.Jenis) return setErr('Nama jenis wajib diisi.', 'Jenis');
      if (S.inv.some(i => i.Jenis.toLowerCase() === d.Jenis.toLowerCase())) return setErr('Jenis "' + d.Jenis + '" sudah ada.', 'Jenis');
      const st = Math.max(0, parseInt(d.Stok, 10) || 0), mn = parseInt(d.Min, 10);
      S.inv.push({ ID: 'Mtmp' + Date.now(), Jenis: d.Jenis, Stok: st, Min: isFinite(mn) ? mn : 5, Lokasi: d.Lokasi || '', TerakhirDipakai: '', Aktif: true, Reusable: !!d.Reusable }); d.Reusable = !!d.Reusable;
      closeModal(); dirtyAll(); render(); toast('Jenis ditambahkan', d.Jenis, 'ok'); sync('tambahJenisMasker', [d]);
    } });
}

// ═════════ USERS ACTIONS ═════════
const UN_RE = /^[a-z0-9._-]{3,30}$/;
const normHP = v => String(v || '').replace(/[^\d+]/g, '').replace(/^\+?62/, '0');
function stafDariUsers() { S.staf = S.users.filter(x => x.aktif).map(x => ({ nama: x.nama, peran: x.peran, jabatan: x.jabatan })); }
function openUser(un) {
  const u = un ? S.users.find(x => x.username === un) : {};
  if (un && !u) return;
  modal({ icon: un ? 'bi-person-gear' : 'bi-person-plus', title: un ? 'Ubah pengguna' : 'Tambah pengguna', sub: un ? 'Kosongkan password bila tidak diganti' : 'Username & password dipakai untuk masuk aplikasi',
    body: `<div class="fgrid">${fld({ n: 'nama', l: 'Nama (beserta gelar)', req: 1, v: u.nama, cls: 'full', ph: 'mis. dr. Mima Primasari, Sp.Onk.Rad' })}${fld({ n: 'jabatan', l: 'Jabatan', v: u.jabatan, cls: 'full' })}
      ${fld({ n: 'peran', l: 'Peran', t: 'select', req: 1, v: u.peran || 'Dokter', opts: Object.keys(HAK).map(r => ({ v: r, t: r })) })}${fld({ n: 'nohp', l: 'No. HP', t: 'tel', req: 1, v: u.nohp, mono: 1, ph: '0812xxxxxxxx' })}
      <div class="fsec">Akun login</div>
      ${fld({ n: 'username', l: 'Username', req: 1, v: u.username, mono: 1, cls: 'full', hint: 'Huruf kecil, angka, titik, garis bawah, atau strip (3–30 karakter, tanpa spasi).' + (un ? ' Bila diganti, pengguna ini masuk dengan username baru.' : '') })}
      ${fld({ n: 'password', l: un ? 'Password baru (opsional)' : 'Password', t: 'password', req: !un, ph: un ? 'Kosongkan bila tidak diganti' : 'Minimal 6 karakter' })}${fld({ n: 'password2', l: 'Ulangi password', t: 'password', req: !un })}</div>`,
    onSubmit: form => {
      const d = obj(form); clearErr();
      const usern = String(d.username || '').trim().toLowerCase(), hp = normHP(d.nohp);
      if (!d.nama) return setErr('Nama wajib diisi.', 'nama');
      if (!/^08\d{7,12}$/.test(hp)) return setErr('Nomor HP tidak valid (contoh: 081234567890).', 'nohp');
      if (!UN_RE.test(usern)) return setErr('Username 3–30 karakter: huruf kecil, angka, titik, garis bawah, atau strip.', 'username');
      if (S.users.some(x => x.username === usern && x !== u)) return setErr('Username "' + usern + '" sudah dipakai.', 'username');
      if (!un && !d.password) return setErr('Password wajib diisi.', 'password');
      if (d.password && d.password.length < 6) return setErr('Password minimal 6 karakter.', 'password');
      if (d.password !== d.password2) return setErr('Ulangi password tidak sama.', 'password2');
      if (un === S.me.username && d.peran !== 'Super Admin') return setErr('Anda tidak dapat mencabut peran Super Admin dari akun sendiri.', 'peran');
      const rec = { baru: !un, unLama: un || '', username: usern, nama: d.nama, jabatan: d.jabatan || '', nohp: hp, peran: d.peran, aktif: un ? u.aktif : true, password: d.password || '' };
      const lokal = { username: usern, nama: rec.nama, jabatan: rec.jabatan, nohp: hp, peran: rec.peran, aktif: rec.aktif, adaPw: u.adaPw || !!rec.password, login: u.login || '' };
      if (un) Object.assign(u, lokal); else S.users.push(lokal);
      const diri = un && un === S.me.username, gantiUn = un && un !== usern;
      if (diri) Object.assign(S.me, { username: usern, nama: rec.nama, nohp: hp });
      stafDariUsers();
      closeModal(); dirtyAll(); render(); toast('Tersimpan', rec.nama + (gantiUn ? ' · username kini ' + usern : '') + (rec.password && un ? ' · password diganti' : ''), 'ok');
      sync('simpanUser', [rec], r => { if (r && r.token) { simpanToken(r.token); if (gantiUn) try { localStorage.setItem(USR_KEY, usern); } catch (e) { /* abaikan */ } } });
    } });
}
function toggleUser(un, on) {
  const u = S.users.find(x => x.username === un); if (!u) return;
  if (un === S.me.username && !on) { toast('Tidak diizinkan', 'Anda tidak dapat menonaktifkan akun sendiri.', 'warn'); return renderView('users'); }
  u.aktif = on; stafDariUsers();
  dirtyAll(); render(); sync('simpanUser', [{ username: u.username, nama: u.nama, jabatan: u.jabatan, nohp: u.nohp, peran: u.peran, aktif: on }]);
}
function saveCfg() {
  const d = Object.assign(obj($('#cfgTat')), obj($('#cfgWa')), obj($('#cfgAi')));
  for (const k in d) if (/^TARGET_/.test(k) && !(parseFloat(d[k]) > 0)) return toast('Target tidak valid', 'Target TAT harus angka lebih dari 0.', 'err');
  const b = $('#cfgSave'); if (b) { b.disabled = true; b.innerHTML = '<span class="spin s"></span>Menyimpan…'; }
  S.versi = (S.versi || 0) + 1;
  api('simpanPengaturan', d).then(r => {
    S.cfg = r.data.cfg; dirtyAll(); render();
    toast('Pengaturan tersimpan', 'WhatsApp ' + (S.cfg.WA_AKTIF === 'YA' ? 'AKTIF' : 'nonaktif') + ' · API key ' + (S.cfg.WA_KEY_ADA ? 'tersimpan' : 'belum diisi'), 'ok');
  }).catch(e => {
    if (b) { b.disabled = false; b.innerHTML = '<i class="bi bi-check2"></i>Simpan pengaturan'; }
    if (TOKEN) toast('Pengaturan GAGAL disimpan', e.message, 'err');
  });
}
function testWA() {
  toast('Mengirim tes…', 'Menghubungi server WhatsApp', '');
  api('tesWA').then(() => toast('Tes berhasil', 'Pesan terkirim ke No. HP akun Anda.', 'ok')).catch(e => toast('Tes gagal', e.message, 'err'));
}

// ═════════ TEMA ═════════
const BLN_ID = BLN.slice(), BLN_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function langArr() {
  const en = LANG === 'en';
  BLN.splice(0, 12, ...(en ? BLN_EN : BLN_ID));
  HARI.splice(0, 7, ...(en ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']));
  HARI_P.splice(0, 7, ...(en ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] : ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']));
}
// ═════════ MODE DEMO (Super Admin): samarkan data pasien di layar untuk rekaman/presentasi ═════════
// Hanya tampilan yang disamarkan (teks di layar); data asli di Sheets tidak berubah. Disimpan per perangkat.
let DEMO = false; try { DEMO = localStorage.getItem('rt_demo') === '1'; } catch (e) { DEMO = false; }
const demoOn = () => DEMO && S.me && isSA();
const inisial = n => String(n || '').replace(/^\[[^\]]*\]\s*/, '').split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase() + '.').join(' ') || '•••';
/** Inisial dokter / RS: gelar depan (dr., drg., Prof.) dan awalan RS (RS, RSU, RSUD, RSUP, RSIA, Klinik) dipertahankan; gelar setelah koma dibuang. */
const inisialPrefiks = n => { const w = String(n || '').split(',')[0].trim().split(/\s+/).filter(Boolean); const pre = []; while (w.length > 1 && /^(dr|drg|prof|rs|rsu|rsud|rsup|rsia|rsab|rsj|klinik)\.?$/i.test(w[0])) pre.push(w.shift()); return (pre.concat(w.map(x => x[0].toUpperCase() + '.'))).join(' ') || '•••'; };
const nrmT = v => demoOn() ? samarNRM(v) : v; // NRM di layar (mode demo → •••43)
const samarNRM = v => { v = String(v || ''); return v.length <= 2 ? '•••' : '•••' + v.slice(-2); };
const samarHP = v => { const d = String(v || '').replace(/\D/g, ''); return d.length < 6 ? '••••' : d.slice(0, 4) + '••••' + d.slice(-2); };
let DEMO_RX = null, DEMO_MAP = null, DEMO_EXACT = null;
function demoSiap() {
  const M = new Map(), X = new Map();
  S.pasien.forEach(p => {
    if (String(p.Nama || '').trim().length >= 3) M.set(String(p.Nama).trim(), inisial(p.Nama));
    const hp = String(p.NoHP || '').trim(); if (hp.replace(/\D/g, '').length >= 6) M.set(hp, samarHP(hp));
    [p.DokterPerujuk, p.RSPerujuk].forEach(v => { v = String(v || '').trim(); if (v.length >= 3) M.set(v, inisialPrefiks(v)); });
  });
  S.users.forEach(u => { const hp = String(u.nohp || '').trim(); if (hp.length >= 6) M.set(hp, samarHP(hp)); });
  if (S.me && S.me.nohp && String(S.me.nohp).length >= 6) M.set(String(S.me.nohp), samarHP(S.me.nohp));
  const keys = [...M.keys()].sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  DEMO_MAP = M; DEMO_EXACT = X; DEMO_RX = keys.length ? new RegExp('(?<![\\p{L}\\p{N}])(?:' + keys.join('|') + ')(?![\\p{L}\\p{N}])', 'gu') : null;
}
function samarTeks(t) {
  if (!t || !DEMO_MAP) return t;
  t = t.replace(/\bNRM (\d{2,})\b/g, (m, d) => 'NRM ' + samarNRM(d)); // NRM di teks log aktivitas
  return DEMO_RX ? t.replace(DEMO_RX, m => DEMO_MAP.get(m) || m) : t;
}
function samarNode(root) {
  if (!demoOn() || !root) return;
  if (root.nodeType === 3) { const v = samarTeks(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
  if (root.nodeType !== 1 && root.nodeType !== 9) return;
  const el = root.nodeType === 1 ? root : null;
  if (el && (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) return;
  if (el) ['title', 'aria-label'].forEach(a => { const o = el.getAttribute(a); if (o) { const v = samarTeks(o); if (v !== o) el.setAttribute(a, v); } });
  for (let c = root.firstChild; c; c = c.nextSibling) samarNode(c);
}
let DOBS = null;
function pasangDemo() {
  if (DOBS || typeof MutationObserver === 'undefined') return;
  DOBS = new MutationObserver(list => { if (!demoOn()) return; list.forEach(m => { if (m.type === 'characterData') samarNode(m.target); else m.addedNodes.forEach(samarNode); }); });
  DOBS.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label'] });
}
function demoUi() {
  const b = $('#demoBtn'); if (!b) return;
  b.hidden = !(S.me && isSA()); b.classList.toggle('on', demoOn());
  const sp = b.querySelector('span'); if (sp) sp.textContent = demoOn() ? 'Mode demo: aktif' : 'Mode demo';
  const ic = b.querySelector('i'); if (ic) ic.className = 'bi ' + (demoOn() ? 'bi-eye-slash-fill' : 'bi-eye-slash');
}
function gantiDemo() {
  if (!isSA()) return;
  DEMO = !DEMO; try { localStorage.setItem('rt_demo', DEMO ? '1' : '0'); } catch (e) { /* storage dibatasi */ }
  closeModal(); demoSiap(); demoUi(); dirtyAll(); render();
  toast(DEMO ? 'Mode demo aktif' : 'Mode demo nonaktif', DEMO ? 'Nama pasien, No. RM, No. HP, dokter perujuk, dan RS perujuk disamarkan di layar.' : 'Data pasien kembali ditampilkan lengkap.', 'ok');
}
function langUi() {
  const b = $('#langBtn span'); if (b) b.textContent = LANG === 'en' ? 'EN' : 'ID';
  $$('.lg-lang span').forEach(x => { x.textContent = LANG === 'en' ? 'Bahasa Indonesia' : 'English'; });
}
function gantiBahasa() {
  LANG = LANG === 'en' ? 'id' : 'en';
  try { localStorage.setItem('rt_lang', LANG); } catch (e) { /* storage dibatasi */ }
  document.documentElement.lang = LANG; langArr();
  if (LANG === 'en') trNode(document.body); else pulihkan(document.body);
  langUi();
  if (!$('#app').hidden && S.me) { dirtyAll(); render(); }
}
function toggleTheme() {
  const n = dark() ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', n);
  try { localStorage.setItem('rt_theme', n); } catch (e) { /* storage dibatasi */ }
  themeUi(); dirtyAll(); render();
}
function themeUi() { $('#themeIc').className = 'bi ' + (dark() ? 'bi-sun' : 'bi-moon-stars'); const s = $('#themeIc').nextElementSibling; if (s) s.textContent = dark() ? 'Mode terang' : 'Mode gelap'; }

// ═════════ EVENT (delegasi) ═════════
const A = {
  nav: el => go(el.dataset.v), drawer: () => document.body.classList.toggle('drawer'), theme: toggleTheme, lang: gantiBahasa, demo: gantiDemo,
  open: el => { if (el.closest('#modalHost')) closeModal(); openDetail(el.dataset.id); }, back: () => go(S.backTo || 'pasien'),
  pasienBaru: () => openPasienForm(), pasienEdit: el => openPasienForm(el.dataset.id),
  stage: el => openStage(el.dataset.id, el.dataset.k), fraksi: el => openFraksi(el.dataset.id),
  stok: el => adjStok(el.dataset.id, +el.dataset.d), opname: openOpname, ambang: el => openAmbang(el.dataset.id), jenis: openJenis,
  tab: el => { S[el.dataset.t] = el.dataset.v; renderView(S.view); },
  csv: exportCsv, userNew: () => openUser(), userEdit: el => openUser(el.dataset.un), saveCfg, testWA,
  stkPick: () => { const f = $('#stkFile'); if (f) f.click(); }, mclose: closeModal, mbg: (el, e) => { if (e.target === el) closeModal(); },
  pfReset: () => { S.pf = {}; S.q = ''; $('#gq').value = ''; renderView('pasien'); },
  pfClear: el => { delete S.pf[el.dataset.k]; pasienRows(); },
  cfTahap: el => { S.cf.tahap = el.dataset.v; renderView('carepath'); },
  apvOk: el => openApproval(el.dataset.id, 'Disetujui'), apvRev: el => openApproval(el.dataset.id, 'Revisi'),
  mediaPick: () => { const f = $('#mediaFile'); if (f) f.click(); }, mediaOpen: el => bukaMedia(el.dataset.mid), mediaDel: el => hapusMedia(el.dataset.mid),
  perubahan: el => openPerubahan(el.dataset.id),
  planPick: () => { const f = $('#planFiles'); if (f) f.click(); },
  planDel: el => { PLAN_FILES.splice(+el.dataset.j, 1); planList(); },
  alrAdd: () => { const b = $('#alrRows'); if (!b) return; const n = b.querySelectorAll('[data-alr]').length; if (n >= 10) return toast('Maksimal 10 alert', '', 'warn'); const j = Math.max(-1, ...$$('#alrRows [data-alr]').map(r => +r.dataset.alr)) + 1; b.insertAdjacentHTML('beforeend', barisAlert(j)); },
  alrDel: el => { const r = el.closest('[data-alr]'); if (!r) return; if ($$('#alrRows [data-alr]').length > 1) r.remove(); else r.querySelectorAll('input').forEach(x => { x.value = ''; }); },
  muAdd: () => { const b = $('#muRows'); if (!b) return; const n = b.querySelectorAll('tr').length; if (n >= 12) return toast('Maksimal 12 lapangan', '', 'warn'); const k = Math.max(-1, ...$$('#muRows tr').map(r => +r.dataset.mu)) + 1; b.insertAdjacentHTML('beforeend', barisMU(k)); },
  muDel: el => { const tr = el.closest('tr'); if (tr && $$('#muRows tr').length > 1) tr.remove(); },
  calMode: el => { S.cal.mode = el.dataset.v; renderView('calendar'); }, calNav: el => geserCal(+el.dataset.v),
  calDay: el => { S.cal.ref = el.dataset.d; S.cal.mode = 'day'; renderView('calendar'); },
  agNew: () => openAgenda(), agEdit: el => openAgenda(el.dataset.aid), agPanel: el => openCekin(el.dataset.aid), summary: el => unduhSummary(el.dataset.id), agBatal: el => batalAg(el.dataset.aid), agDel: el => hapusAg(el.dataset.aid),
  rfReset: () => { S.rf = { from: '', to: '', dokter: '', teknik: '', kasus: '' }; renderView('report'); },
  retry: () => muatSesi(),
  logout: () => logout(), akun: () => openAkun(),
  lgEye: el => { const p = $('#lgPass'); if (!p) return; const show = p.type === 'password'; p.type = show ? 'text' : 'password'; el.innerHTML = `<i class="bi ${show ? 'bi-eye-slash' : 'bi-eye'}"></i>`; el.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password'); p.focus(); }
};
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; const f = A[el.dataset.act]; if (f) { if (el.tagName === 'A') e.preventDefault(); f(el, e); } });
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('a[data-act],tr[data-act],div.card[data-act],[role=button][data-act],b[data-act]')) { e.preventDefault(); e.target.click(); }
  if (e.key === 'Escape') { if ($('#modalHost .modal')) closeModal(); else document.body.classList.remove('drawer'); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); const g = $('#gq'); if (g) g.focus(); }
});
document.addEventListener('submit', e => { if (e.target.id === 'loginForm') { e.preventDefault(); doLogin(); return; } if (e.target.id === 'mform') { e.preventDefault(); if (FORM) FORM(e.target); } else if (e.target.closest && e.target.closest('#v-users')) e.preventDefault(); });
document.addEventListener('change', e => {
  const t = e.target, b = t.dataset && t.dataset.bind;
  if (t.id === 'f_NRM') { const v = normNRM(t.value); if (t.value.trim()) t.value = v; t.dispatchEvent(new Event('input', { bubbles: true })); return; }
  if (t.id === 'stkFile') { stikerFile(t.files && t.files[0]); t.value = ''; return; }
  if (t.dataset && t.dataset.pf) { if (t.value) S.pf[t.dataset.pf] = t.value; else delete S.pf[t.dataset.pf]; pasienRows(); return; }
  if (t.id === 'mediaFile') { unggahBerkas(t.dataset.id, t.files); return; }
  if (t.id === 'planFiles') { Array.from(t.files || []).forEach(f => { if (MEDIA_OK.indexOf(f.type) < 0) return toast('Format tidak didukung', f.name, 'err'); if (f.size > MEDIA_MAX * 1.4 && f.type.indexOf('video') === 0) return toast('Berkas terlalu besar', f.name + ' melebihi 15 MB.', 'err'); PLAN_FILES.push(f); }); t.value = ''; planList(); return; }
  if (t.id === 'muPar' || t.id === 'muOk') { muToggle(); return; }
  if (t.id === 'f_jenis') prToggle();
  if (['f_Jenis', 'f_IDPasien', 'f_Tanggal'].indexOf(t.id) >= 0) agHint();
  if (b) { const p = b.split('.'); S[p[0]][p[1]] = t.value; if (p[0] === 'cf') renderView('carepath'); else if (p[0] === 'cal') renderView('calendar'); else renderView('report'); return; }
  if (t.dataset && t.dataset.chg === 'utoggle') toggleUser(t.dataset.un, t.checked);
});
const setQ = debounce(v => { S.q = v; if (S.view !== 'pasien') go('pasien', { force: true }); else pasienRows(); const pq = $('#pq'), gq = $('#gq'); if (pq && pq.value !== v) pq.value = v; if (gq && gq.value !== v) gq.value = v; }, 120);
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'gq' || t.id === 'pq') setQ(t.value);
  if (t.id === 'f_NRM') { const v = normNRM(t.value); const dup = v && S.pasien.find(x => normNRM(x.NRM) === v && !(S.editingId && x.ID === S.editingId)); const er = $('#e_NRM'); if (er) { er.textContent = dup ? 'NRM sudah terdaftar atas nama ' + dup.Nama + '!' : ''; t.classList.toggle('bad', !!dup); } }
  if (t.classList && t.classList.contains('auto')) t.classList.remove('auto');
  if (t.classList && t.classList.contains('bad')) { t.classList.remove('bad'); const er = $('#e_' + String(t.id).slice(2)); if (er && t.id !== 'f_NRM') er.textContent = ''; }
});
document.addEventListener('paste', e => {
  if (!$('#stkZone')) return;
  const it = Array.from((e.clipboardData && e.clipboardData.items) || []).find(x => x.type && x.type.indexOf('image/') === 0);
  if (it) { e.preventDefault(); stikerFile(it.getAsFile()); }
});
['dragenter', 'dragover'].forEach(n => document.addEventListener(n, e => { const z = e.target.closest && e.target.closest('#stkZone'); if (z) { e.preventDefault(); z.classList.add('drag'); } }));
document.addEventListener('dragleave', e => { const z = e.target.closest && e.target.closest('#stkZone'); if (z) z.classList.remove('drag'); });
document.addEventListener('drop', e => { const z = e.target.closest && e.target.closest('#stkZone'); if (z) { e.preventDefault(); z.classList.remove('drag'); stikerFile(e.dataTransfer && e.dataTransfer.files[0]); } });
window.addEventListener('online', () => { setSync(); reload(true); });
window.addEventListener('offline', setSync);

// ═════════ LOGIN, SESI & AKUN ═════════
const TOK_KEY = 'rt_tok', USR_KEY = 'rt_user';
let TOKEN = '', tick = null;
try { TOKEN = localStorage.getItem(TOK_KEY) || ''; } catch (e) { TOKEN = ''; }
function simpanToken(t) { TOKEN = t || ''; try { if (TOKEN) localStorage.setItem(TOK_KEY, TOKEN); else localStorage.removeItem(TOK_KEY); } catch (e) { /* storage dibatasi */ } }
function bersihkanData() {
  load({ me: null }); S.pending = 0; S.q = ''; S.pf = {}; S.cf = { tahap: '', dokter: '', teknik: '', kasus: '' }; S.detailId = null;
  Object.keys(mediaCache).forEach(k => { try { URL.revokeObjectURL(mediaCache[k]); } catch (e) { /* abaikan */ } delete mediaCache[k]; });
  $$('.view').forEach(v => { v.innerHTML = ''; }); const g = $('#gq'); if (g) g.value = ''; $('#alertBar').innerHTML = '';
}
function showLogin(err, info) {
  closeModal(); clearTimeout(window.__bootWatch); document.body.classList.remove('drawer');
  $('#boot').hidden = true; $('#app').hidden = true; $('#gate').hidden = true;
  let last = ''; try { last = localStorage.getItem(USR_KEY) || ''; } catch (e) { /* abaikan */ }
  const L = $('#login'); L.hidden = false;
  L.innerHTML = `<div class="lgbox"><div class="lgside"><div class="lg-logo"><i class="bi bi-radioactive"></i></div><div><b>Siloam Agora</b><small>RADIOTERAPI</small></div>
    <h1>Sistem Manajemen Radioterapi</h1><p>Alur layanan, jadwal radiasi, inventaris masker, dan laporan TAT dalam satu tempat.</p><div class="lg-rs"><i class="bi bi-hospital"></i>${esc(B.rs || 'RS Siloam Agora')}</div></div>
    <form id="loginForm" class="lgform" novalidate autocomplete="on"><button type="button" class="lg-lang" data-act="lang" data-noi18n><i class="bi bi-translate"></i><span></span></button><h2>Masuk</h2><p class="muted">Gunakan username dan password yang diberikan Super Admin.</p>
    ${info ? `<div class="lg-info"><i class="bi bi-check-circle"></i>${esc(info)}</div>` : ''}
    <div class="fld"><label for="lgUser">Username</label><div class="lg-in"><i class="bi bi-person"></i><input id="lgUser" class="input" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" value="${esc(last)}"></div></div>
    <div class="fld"><label for="lgPass">Password</label><div class="lg-in"><i class="bi bi-lock"></i><input id="lgPass" class="input" type="password" name="password" autocomplete="current-password"><button type="button" class="lg-eye" data-act="lgEye" aria-label="Tampilkan password"><i class="bi bi-eye"></i></button></div></div>
    <div id="lgErr" class="formerr" role="alert">${esc(err || '')}</div>
    <button id="lgBtn" type="submit" class="btn p" style="width:100%"><i class="bi bi-box-arrow-in-right"></i>Masuk</button>
    <div class="hint" style="text-align:center">Lupa password? Hubungi Super Admin.</div></form></div>`;
  langUi();
  setTimeout(() => { const f = last ? $('#lgPass') : $('#lgUser'); if (f) f.focus(); }, 30);
}
function doLogin() {
  const u = $('#lgUser').value.trim(), p = $('#lgPass').value, err = $('#lgErr'), btn = $('#lgBtn');
  err.textContent = '';
  if (!u || !p) { err.textContent = 'Isi username dan password.'; return; }
  const reset = () => { btn.disabled = false; btn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i>Masuk'; };
  btn.disabled = true; btn.innerHTML = '<span class="spin s"></span>Memeriksa…';
  panggil({ action: 'masuk', username: u, password: p, appUrl: location.href }).then(r => {
    if (!r || !r.success) { reset(); err.textContent = r ? r.message : 'Server tidak merespons.'; const pw = $('#lgPass'); if (pw) { pw.value = ''; pw.focus(); } return; }
    simpanToken(r.data.token); try { localStorage.setItem(USR_KEY, u.toLowerCase()); } catch (e) { /* abaikan */ }
    try { mulaiApp(r.data.app); } catch (e) { console.error(e); reset(); err.textContent = 'Gagal memulai aplikasi: ' + e.message; }
  }).catch(e => { reset(); err.textContent = (e && e.message) || 'Koneksi ke server gagal.'; });
}
function mulaiApp(p) {
  load(p);
  if (window.__RT_TEST__) window.__RT_TEST__.S = S; // hanya untuk pengujian otomatis
  $('#login').hidden = true; $('#login').innerHTML = ''; $('#boot').hidden = true; $('#gate').hidden = true; $('#app').hidden = false; clearTimeout(window.__bootWatch);
  themeUi(); dirtyAll(); go('dashboard', { force: true });
  loadChart();
  if (!tick) tick = setInterval(() => { if (!TOKEN || document.hidden || S.pending || $('#modalHost .modal') || (S.view === 'users' && S.userTab === 'cfg')) return; reload(true); }, 60000);
}
function logout() {
  if (S.pending > 0) return toast('Masih menyimpan data', 'Tunggu hingga status "Tersinkron", lalu keluar.', 'warn');
  const t = TOKEN; simpanToken('');
  panggil({ action: 'keluar', token: t }).catch(() => { /* sesi tetap kedaluwarsa otomatis */ });
  bersihkanData(); showLogin('', 'Anda telah keluar.');
}
function sesiHabis(msg) {
  if (!TOKEN && !$('#login').hidden) return;
  simpanToken(''); bersihkanData(); showLogin(msg || 'Sesi berakhir. Silakan masuk kembali.');
}
function openAkun() {
  const m = S.me || {};
  modal({ icon: 'bi-person-circle', size: 'sm', title: 'Akun saya', sub: m.nama + ' · ' + m.peran, ok: 'Simpan password baru', okIc: 'bi-key',
    body: `<div class="kv"><div><small>Username</small><b class="num">${esc(m.username)}</b></div><div><small>No. HP</small><b class="num">${esc(m.nohp || '–')}</b></div></div>
      <button type="button" class="btn g" data-act="logout"><i class="bi bi-box-arrow-right"></i>Keluar dari aplikasi</button>
      <div class="fsec" style="margin-top:4px">Ganti password</div>
      <div class="fgrid">${fld({ n: 'lama', l: 'Password lama', t: 'password', req: 1, cls: 'full' })}${fld({ n: 'baru', l: 'Password baru', t: 'password', req: 1, ph: 'Minimal 6 karakter' })}${fld({ n: 'baru2', l: 'Ulangi password baru', t: 'password', req: 1 })}</div>`,
    onSubmit: form => {
      const d = obj(form); clearErr();
      if (!d.lama) return setErr('Isi password lama.', 'lama');
      if (!d.baru || d.baru.length < 6) return setErr('Password baru minimal 6 karakter.', 'baru');
      if (d.baru !== d.baru2) return setErr('Ulangi password baru tidak sama.', 'baru2');
      const b = form.querySelector('[type=submit]'); b.disabled = true; b.innerHTML = '<span class="spin s"></span>Menyimpan…';
      api('gantiPasswordSaya', d.lama, d.baru).then(r => { simpanToken(r.data.token); closeModal(); toast('Password diganti', 'Gunakan password baru saat masuk berikutnya.', 'ok'); })
        .catch(e => { b.disabled = false; b.innerHTML = '<i class="bi bi-key"></i>Simpan password baru'; if (TOKEN) setErr(e.message, /lama/i.test(e.message) ? 'lama' : 'baru'); });
    } });
}

// ═════════ BOOT ═════════
function gate(html) { clearTimeout(window.__bootWatch); $('#boot').hidden = true; $('#app').hidden = true; const g = $('#gate'); g.hidden = false; g.innerHTML = html; }
const BUILD = 'LOADCHART_R14';
function loadChart() {
  if (typeof Chart !== 'undefined' || document.getElementById('chartjs')) return;
  const s = document.createElement('script'); s.id = 'chartjs'; s.async = true;
  s.src = 'https:' + String.fromCharCode(47, 47) + 'cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
  s.onload = () => { dirtyAll(); renderView(S.view); };
  s.onerror = () => toast('Grafik tidak dapat dimuat', 'Periksa koneksi internet. Fitur lain tetap berfungsi.', 'warn');
  document.head.appendChild(s);
}
function muatSesi() {
  $('#gate').hidden = true; $('#login').hidden = true; $('#boot').hidden = false; clearTimeout(window.__bootWatch);
  api('getAppData').then(r => {
    try { mulaiApp(r.data); }
    catch (e) { console.error(e); gate(`<div class="ic"><i class="bi bi-exclamation-triangle"></i></div><h2 class="t">Gagal memulai aplikasi</h2><p class="muted" style="margin:8px 0 16px;word-break:break-word">${esc(e.message)}</p><button class="btn p" data-act="retry">Coba lagi</button> <button class="btn g" data-act="logout">Masuk ulang</button>`); }
  }).catch(e => {
    if (!TOKEN) return; // sesi berakhir → halaman masuk sudah tampil
    gate(`<div class="ic"><i class="bi bi-wifi-off"></i></div><h2 class="t">Tidak dapat memuat data</h2><p class="muted" style="margin:8px 0 16px;word-break:break-word">${esc(e.message)}</p><button class="btn p" data-act="retry">Coba lagi</button> <button class="btn g" data-act="logout">Masuk ulang</button>`);
  });
}
function init() {
  try { const t = localStorage.getItem('rt_theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) { /* abaikan */ }
  langArr(); pasangI18n(); langUi(); pasangDemo();
  if (!API_SIAP) return gate(`<div class="ic"><i class="bi bi-plug"></i></div><h2 class="t">URL API belum diatur</h2><p class="muted" style="margin:8px 0 16px">Buka berkas js/config.js, isi GAS_URL dengan URL Web App Google Apps Script (berakhiran /exec), lalu unggah ulang ke GitHub.</p>`);
  try { B.rs = localStorage.getItem('rt_rs') || ''; } catch (e) { /* abaikan */ }
  if (!B.rs) B.rs = CFG.NAMA_RS || '';
  if (TOKEN) muatSesi(); else showLogin();
  bootInfo();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
