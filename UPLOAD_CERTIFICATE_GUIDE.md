# Upload Certificate Manual ke SignPath.io

Panduan untuk mengupload certificate yang sudah Anda buat manual ke SignPath.io.

## 📋 File Certificate Anda

File yang tersedia:
- `Signature\WTStation.pem` (3 KB) - PEM file
- `Signature\WTStation.cer` (2 KB) - Certificate file

## ⚠️ Catatan Penting

File `.pem` dan `.cer` yang ada **tidak berisi private key**. Untuk code signing, kita butuh **private key** juga.

**Opsi untuk mendapatkan private key:**
1. File `.pem` atau `.key` terpisah yang berisi private key
2. File `.pfx` atau `.p12` yang lengkap (certificate + private key)
3. Export private key dari tempat certificate dibuat

## 🔧 Cara Upload ke SignPath.io

### Metode 1: Via Web UI (Recommended)

1. **Login** ke https://app.signpath.io/
2. **Buka project** WTStation (atau buat baru jika belum ada)
3. **Klik menu "Certificates"** atau "Signing Certificates"
4. **Klik "Upload Certificate"** atau "Add Certificate"
5. **Upload file:**
   - Jika punya file `.pfx` atau `.p12` lengkap → upload itu
   - Jika hanya `.pem` atau `.cer` → upload itu (tapi tidak bisa untuk signing tanpa private key)
6. **Masukkan password** (jika file `.pfx`/.p12` punya password)
7. **Beri nama:** `WTStation Signing Certificate`
8. **Klik "Upload"** atau "Save"

✅ **Certificate sudah terupload!**

### Metode 2: Via Script (API)

Jika API token sudah di-set:

```powershell
# Upload certificate
npm run upload:cert
```

**Catatan:** Script ini mungkin perlu disesuaikan dengan API endpoint SignPath yang sebenarnya.

## 📝 Format File yang Dibutuhkan

| Format | Bisa untuk Signing? | Catatan |
|--------|-------------------|---------|
| `.pfx` / `.p12` | ✅ Ya | **Recommended** - Berisi certificate + private key |
| `.pem` (lengkap) | ✅ Ya | Harus berisi BOTH certificate DAN private key |
| `.pem` (cert only) | ❌ Tidak | Hanya certificate, tidak ada private key |
| `.cer` | ❌ Tidak | Hanya certificate, tidak ada private key |

## 🔍 Cek Apakah File Punya Private Key

```powershell
# Cek file .pem
Get-Content "Signature\WTStation.pem" | Select-String "PRIVATE KEY"
```

Jika ada output → **Ada private key**
Jika tidak ada → **Tidak ada private key**

## 🚀 Langkah Selanjutnya

Setelah certificate terupload di SignPath:

1. **Pastikan certificate sudah di-assign ke project**
2. **Setup API token** (jika belum):
   ```powershell
   $env:SIGNPATH_API_TOKEN = "token-anda"
   $env:SIGNPATH_PROJECT_ID = "WTStation"
   ```
3. **Build dan sign:**
   ```powershell
   npm run pack:sign
   ```

## ❓ FAQ

**Q: File .pem saya tidak berisi private key, bisa digunakan?**
A: Tidak, untuk code signing **harus ada private key**. Cari file `.pfx`/`.p12` yang lengkap, atau file `.pem` yang berisi private key.

**Q: Di mana biasanya private key disimpan?**
A: Biasanya di:
- File `.key` atau `.pem` terpisah
- File `.pfx`/`.p12` (lengkap)
- Di server/key management tempat certificate dibuat
- Export dari tool yang dipakai untuk membuat certificate

**Q: Bisa request certificate baru di SignPath?**
A: Ya, tapi butuh approval dan bisa beberapa hari. Untuk open source, cek SignPath Foundation (gratis): https://signpath.org/

**Q: Upload via web UI atau API lebih baik?**
A: **Web UI lebih mudah** dan biasanya lebih reliable. API baik untuk automation/CI/CD.

## 🔗 Referensi

- **SignPath Dashboard**: https://app.signpath.io/
- **SignPath Docs**: https://docs.signpath.io/
- **Panduan Setup**: `SIGNPATH_QUICKSTART.md`

