# Sistem Manajemen Radioterapi — RS Siloam Agora (Frontend)

Situs statis (HTML/CSS/JS) untuk GitHub Pages. Seluruh data tersimpan di Google Sheets
dan diakses lewat backend Google Apps Script (REST API JSON) — backend **tidak** ada di repository ini.

```
index.html        ← halaman utama (wajib di root repository)
css/style.css     ← seluruh tampilan
js/config.js      ← ⚙️ ISI URL Web App Apps Script (GAS_URL) di sini
js/app.js         ← seluruh logika aplikasi (SPA)
```

## Konfigurasi
Buka `js/config.js`, ganti `GAS_URL` dengan URL Web App Apps Script yang berakhiran `/exec`.

## Update
```
git add .
git commit -m "Deskripsi perubahan"
git push
```
GitHub Pages memperbarui situs dalam 1–2 menit (tekan Ctrl+Shift+R bila masih versi lama).

## Keamanan
Repository ini aman untuk publik: tidak ada password, API key, atau data pasien di dalamnya.
Data pasien hanya bisa diakses setelah login (username + password) yang diperiksa di server.
