# 📋 Panduan Instalasi — Sistem Manajemen Radioterapi v2.0
### Backend di Google Apps Script · Frontend di GitHub Pages

Mulai versi 2.0 aplikasi dipecah menjadi dua bagian:

```
┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐
│ FRONTEND — GitHub Pages              │ fetch  │ BACKEND — Google Apps Script         │
│ https://USERNAME.github.io/REPO/     │ ─────▶ │ Web App …/exec  (JSON saja)          │
│ index.html · css/ · js/              │ ◀───── │ Kode.gs · Integritas.gs              │
│ (tampilan, tidak menyimpan data)     │  JSON  │ Google Sheets (database) · Drive     │
└──────────────────────────────────────┘        └──────────────────────────────────────┘
```

**Yang Anda terima:**

| Berkas | Untuk | Cara pakai |
|---|---|---|
| `Kode.gs` | Apps Script | salin-tempel ke editor Apps Script |
| `Integritas.gs` | Apps Script | salin-tempel ke editor Apps Script |
| `appsscript.json` | Apps Script | salin-tempel ke manifest Apps Script |
| `radioterapi-siloam.zip` | GitHub Pages | ekstrak → isi folder inilah yang di-*push* ke GitHub |
| `PANDUAN-INSTALASI.md` | Anda | panduan ini |

> Database (Google Sheets), akun pengguna, password, data pasien, dan pengaturan WA **tidak berubah** — tidak ada data yang dipindahkan.

---

## BAGIAN A — Backend (Google Apps Script)

### A1. Perbarui kode di proyek Apps Script yang sudah ada
1. Buka https://script.google.com → buka proyek **Sistem Manajemen Radioterapi** yang selama ini dipakai.
2. Buka **Kode.gs** → hapus seluruh isinya → tempel isi `Kode.gs` yang baru → **Simpan** (Ctrl+S).
3. Buka **Integritas.gs** → ganti seluruh isinya dengan `Integritas.gs` yang baru → Simpan.
4. Klik ⚙️ **Project Settings** → centang **Show "appsscript.json" manifest file in editor** → kembali ke Editor → buka `appsscript.json` → ganti isinya → Simpan.
5. **Hapus** berkas `Index.html`, `JavaScript.html`, dan `Stylesheet.html` dari proyek Apps Script (klik ⋮ di samping nama berkas → *Delete*). Tampilan kini ada di GitHub, bukan di Apps Script.

> 🆕 **Instalasi baru (belum pernah ada database)?** Setelah langkah 1–4, pilih fungsi `setupAppEnvironment` → ▶ **Run** → izinkan akses. Buka *Execution log*: username & password sementara Super Admin tercatat di sana. Jalankan **hanya sekali**.

### A2. Uji backend
Pilih fungsi **`cekIntegritas`** di dropdown → ▶ **Run** → buka *Execution log*. Semua baris harus ✅ (baris ℹ️ tentang "alamat frontend" wajar sebelum login pertama dari GitHub Pages).

### A3. Deploy ulang sebagai Web App (versi baru)
Agar URL lama **tetap sama**, perbarui deployment yang sudah ada — jangan buat baru:

1. **Deploy** → **Manage deployments**
2. Pilih deployment Web app yang aktif → klik ✏️ (Edit)
3. **Version:** pilih **New version**
4. Pastikan:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone` ← wajib, tanpa ini situs GitHub tidak bisa terhubung
5. Klik **Deploy** → salin **Web app URL** (berakhiran `/exec`).

> Belum pernah deploy? Pakai **Deploy → New deployment → ⚙️ Web app** dengan pengaturan yang sama.

### A4. Pastikan API hidup
Tempel URL `/exec` tadi di browser. Yang benar tampil teks JSON seperti:
```json
{"success":true,"data":{"login":true,"rs":"RS Siloam Agora","app":"Sistem Manajemen Radioterapi","api":"2.0"},"message":"OK"}
```
Sejak versi ini, URL Apps Script **tidak lagi menampilkan aplikasi** — hanya JSON. Aplikasi dibuka lewat alamat GitHub Pages.

---

## BAGIAN B — Isi alamat API di frontend

1. Ekstrak `radioterapi-siloam.zip`. Hasilnya folder **`radioterapi-siloam`** yang **langsung berisi** `index.html`, `css`, `js`, `README.md`.
2. Buka `js\config.js` dengan Notepad, ganti baris:
   ```js
   GAS_URL: 'https://script.google.com/macros/s/XXXX/exec',
   ```
   dengan URL `/exec` dari langkah A3 (tetap di antara tanda kutip `'...'`). Simpan.

> Lupa langkah ini? Situs akan menampilkan pesan **"URL API belum diatur"**.

---

## BAGIAN C — Upload frontend ke GitHub Pages

> 🔑 **Istilah singkat**
> **Repository (repo)** = folder proyek di GitHub · **Commit** = "Save" yang tercatat riwayatnya · **Push** = kirim ke GitHub (upload) · **Branch** = cabang proyek, kita pakai `main` · **Personal Access Token** = "password khusus" untuk Git di terminal.

> ⛔ **Jangan** pakai tombol *Add file → Upload files* di web GitHub — struktur folder `css/` dan `js/` akan rusak dan tampilan jadi polos. Selalu lewat terminal seperti di bawah.

### C1. Install Git (sekali saja)
- **Windows:** unduh dari https://git-scm.com/download/win → install dengan pilihan default → buka **PowerShell**.
- **Mac:** buka Terminal, ketik `git --version` (macOS akan menawarkan instalasi bila belum ada).

Cek:
```powershell
git --version
```
Normal: `git version 2.xx.x`.

### C2. Akun GitHub
Daftar di https://github.com bila belum punya. Username akan menjadi bagian alamat situs: `https://USERNAME.github.io/...`

### C3. Identitas Git (sekali per komputer)
```powershell
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@contoh.com"
```
`user.name` hanyalah label di riwayat — bukan username GitHub.

### C4. Buat repository
github.com → tombol **+** (kanan atas) → **New repository**
- Repository name: misalnya `radioterapi`
- Pilih **Public** (GitHub Pages gratis hanya untuk repo publik — aman, tidak ada password/data di berkas frontend)
- **Jangan** centang *Add a README*, *.gitignore*, atau *license*
- **Create repository** → biarkan halaman itu terbuka.

### C5. Masuk ke folder yang BENAR ⚠️ (langkah paling penting)
Folder kerja Anda adalah **`radioterapi-siloam`** — folder hasil ekstrak ZIP yang **langsung** berisi `index.html`.

Cara cepat di Windows: buka folder `radioterapi-siloam` di File Explorer → klik address bar → ketik `powershell` → Enter.

Lalu cek isinya:
```powershell
dir
```
Wajib terlihat:
```
css
js
.nojekyll
index.html
README.md
```
- Kalau yang terlihat justru **folder `radioterapi-siloam`** lagi (bukan `index.html`) → Anda satu level terlalu tinggi, jalankan `cd radioterapi-siloam` lalu `dir` lagi.
- Pastikan **tidak ada** berkas `.gs` di sini. Berkas backend tidak boleh ikut ke GitHub.
- Pastikan `js\config.js` sudah berisi URL dari Bagian B.

### C6. Kirim ke GitHub (jalankan satu per satu)
```powershell
git init
```
Normal: `Initialized empty Git repository in ...`

```powershell
git add .
```
⚠️ Ada **titik** di akhir. Normal: tidak ada tulisan apa pun (bisa muncul peringatan `LF will be replaced by CRLF` — abaikan).

```powershell
git commit -m "Upload pertama"
```
Normal: muncul daftar berkas `create mode 100644 index.html`, dst.

```powershell
git branch -M main
git remote add origin https://github.com/USERNAME/radioterapi.git
```
Ganti `USERNAME` dan `radioterapi` sesuai milik Anda (salin dari halaman repo di C4).

```powershell
git push -u origin main
```
- **Username:** username GitHub
- **Password:** tempel **Personal Access Token** (bukan password akun). Saat ditempel **layar tetap kosong** — itu normal, tekan Enter.
- Berhasil bila muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

> Muncul jendela "Sign in with your browser"? Klik saja — itu cara login yang lebih mudah dan tidak perlu token.

#### Membuat Personal Access Token (bila diminta / muncul "Password authentication is not supported")
1. Buka https://github.com/settings/tokens → **Generate new token** → **Generate new token (classic)**
2. Note: `git-push-token` · Expiration: `90 days` · centang ✅ **repo**
3. **Generate token** → salin token `ghp_...` (hanya tampil sekali, simpan di Notepad)
4. Jalankan lagi `git push -u origin main`, tempel token sebagai password.

### C7. Aktifkan GitHub Pages
1. Buka repo di github.com → pastikan di halaman depan terlihat `index.html`, folder `css` dan `js` (bukan folder `radioterapi-siloam`).
2. **Settings** → menu kiri **Pages**
   | Kolom | Nilai |
   |---|---|
   | Source | **Deploy from a branch** |
   | Branch | **main** · **/ (root)** → Save |
   | Enforce HTTPS | ✅ |
3. Tunggu 1–2 menit, refresh → muncul **"Your site is live at https://USERNAME.github.io/radioterapi/"**.

---

## BAGIAN D — Uji & mulai pakai

1. Buka alamat GitHub Pages → halaman **Masuk** tampil dengan nama RS.
2. Login dengan username/password yang sama seperti sebelumnya. *(Semua pengguna perlu login sekali lagi karena alamat aplikasi berubah; pilihan bahasa/tema juga perlu dipilih ulang.)*
3. Buka semua menu, coba satu simpan data kecil (mis. ubah ambang stok) → di Google Sheets nilainya ikut berubah.
4. Jalankan lagi `cekIntegritas` di Apps Script → baris "Alamat frontend untuk tautan WA" kini berisi alamat GitHub Pages. Tautan **"Buka aplikasi"** di pesan WA otomatis mengarah ke situs ini.
5. Bagikan alamat GitHub Pages ke seluruh staf (URL Apps Script lama kini hanya mengembalikan JSON).

---

## BAGIAN E — Cara update di kemudian hari

**Frontend berubah** (berkas di folder `radioterapi-siloam`): dari folder itu jalankan
```powershell
git add .
git commit -m "Deskripsi singkat perubahan"
git push
```
Tunggu 1–2 menit, buka situs dengan **Ctrl+Shift+R**.

**Backend berubah** (`Kode.gs`): tempel kode → Simpan → **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. URL tetap sama, `config.js` tidak perlu diubah.
> ⚠️ Hanya menyimpan kode **tidak** mengubah Web App yang sedang berjalan — wajib *New version*.

---

## Troubleshooting

| Yang terlihat | Penyebab | Solusi |
|---|---|---|
| "URL API belum diatur" | `GAS_URL` di `js/config.js` masih `XXXX` | Isi URL `/exec`, lalu `git add .` → `commit` → `push` |
| "Koneksi ke server gagal…" saat Masuk | URL salah, akses Web App bukan *Anyone*, atau internet | Cek URL di browser (harus tampil JSON, langkah A4); pastikan *Who has access: Anyone* |
| "Respons server bukan JSON" | URL bukan berakhiran `/exec` (mis. `/dev` atau URL editor) | Salin ulang *Web app URL* dari Manage deployments |
| Buka URL `/exec` muncul halaman login Google | Akses Web App bukan *Anyone* | Manage deployments → ✏️ → Who has access: **Anyone** → Deploy |
| Perubahan `Kode.gs` tidak berpengaruh | Belum *New version* | Langkah A3 |
| Situs 404 "File not found" | Folder yang di-push salah (di repo terlihat folder `radioterapi-siloam`, bukan `index.html`) | Masuk ke folder yang berisi `index.html`, lalu `git init` → `git add .` → `git commit -m "fix"` → `git branch -M main` → `git remote add origin URL` → `git push -u origin main --force` (*--force* menimpa isi repo yang salah) |
| Tampilan polos tanpa warna | Folder `css/`/`js/` rusak (upload via web) | Push ulang lewat terminal dari folder yang benar |
| `remote origin already exists` | `git remote add` sudah pernah dijalankan | Lewati, lanjut `git push` |
| `src refspec main does not match any` | Belum commit | `git add .` lalu `git commit -m "Upload pertama"` |
| `Updates were rejected…` | Repo dibuat dengan README | `git pull --rebase origin main` lalu `git push` |
| Situs masih versi lama | Cache browser | **Ctrl+Shift+R** atau jendela Incognito |
| "Sesi berakhir. Silakan masuk kembali." | Sesi 6 jam habis / password diganti | Login ulang (normal) |

---

## Catatan teknis
- Semua komunikasi: `fetch()` → `POST` JSON berjenis `text/plain` (tanpa CORS preflight) ke `doPost`, atau `GET ?action=boot` ke `doGet`. Backend hanya mengembalikan JSON (`ContentService`).
- Keamanan tetap di server: login username+password (hash SHA-256 + salt), token sesi 6 jam, kunci akun setelah 5 gagal, RBAC per peran, data Dokter tersaring per DPJP. Fungsi yang bisa dipanggil dibatasi daftar putih.
- `HtmlService` hanya tersisa di server untuk mengubah Treatment Summary menjadi PDF (bukan tampilan).
- Token login disimpan di browser untuk alamat `USERNAME.github.io`. Hindari memasang situs lain yang tidak Anda percayai di akun GitHub yang sama.
