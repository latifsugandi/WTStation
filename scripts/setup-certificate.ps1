# scripts/setup-certificate.ps1
# Script untuk setup certificate dari file .pem/.cer ke .pfx untuk code signing

param(
    [string]$CertPath = "Signature\WTStation.pem",
    [string]$KeyPath = "",
    [string]$OutputPath = "Signature\WTStation.pfx",
    [string]$Password = ""
)

Write-Host "🔐 Setup Code Signing Certificate" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if OpenSSL is available
$opensslPath = Get-Command openssl -ErrorAction SilentlyContinue

if (-not $opensslPath) {
    Write-Host "⚠️  OpenSSL tidak ditemukan di PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Cara install OpenSSL:" -ForegroundColor Yellow
    Write-Host "  1. Download dari: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor White
    Write-Host "  2. Atau install via Chocolatey: choco install openssl" -ForegroundColor White
    Write-Host "  3. Atau install via winget: winget install ShiningLight.OpenSSL" -ForegroundColor White
    Write-Host ""
    Write-Host "Atau gunakan metode manual dengan Windows Certificate Store (lihat dokumentasi)" -ForegroundColor Yellow
    Write-Host ""
    
    # Try to use Windows built-in tools
    Write-Host "Mencoba menggunakan Windows Certificate Store..." -ForegroundColor Yellow
    
    if (Test-Path "Signature\WTStation.cer") {
        Write-Host "✅ File .cer ditemukan: Signature\WTStation.cer" -ForegroundColor Green
        Write-Host ""
        Write-Host "Instruksi manual:" -ForegroundColor Yellow
        Write-Host "  1. Double-click Signature\WTStation.cer" -ForegroundColor White
        Write-Host "  2. Klik 'Install Certificate...'" -ForegroundColor White
        Write-Host "  3. Pilih 'Local Machine' atau 'Current User'" -ForegroundColor White
        Write-Host "  4. Pilih 'Place all certificates in the following store'" -ForegroundColor White
        Write-Host "  5. Klik 'Browse' dan pilih 'Personal'" -ForegroundColor White
        Write-Host "  6. Klik 'Next' > 'Finish'" -ForegroundColor White
        Write-Host ""
        Write-Host "Kemudian set environment variable:" -ForegroundColor Yellow
        Write-Host "  `$env:CSC_LINK = 'certificate-name-from-store'" -ForegroundColor White
    }
    
    exit 1
}

# Check certificate files
if (-not (Test-Path $CertPath)) {
    Write-Host "❌ Error: File certificate tidak ditemukan: $CertPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Pastikan file ada di:" -ForegroundColor Yellow
    Write-Host "  - Signature\WTStation.pem (dengan private key)" -ForegroundColor White
    Write-Host "  - atau Signature\WTStation.cer (certificate saja)" -ForegroundColor White
    exit 1
}

Write-Host "✅ File certificate ditemukan: $CertPath" -ForegroundColor Green

# Check if PEM file contains private key
$pemContent = Get-Content $CertPath -Raw
$hasPrivateKey = $pemContent -match "BEGIN.*PRIVATE KEY" -or $pemContent -match "BEGIN RSA PRIVATE KEY"

if ($hasPrivateKey) {
    Write-Host "✅ File .pem berisi private key" -ForegroundColor Green
    Write-Host ""
    Write-Host "Converting .pem ke .pfx..." -ForegroundColor Yellow
    
    if ([string]::IsNullOrEmpty($Password)) {
        Write-Host "Masukkan password untuk .pfx file (kosongkan jika tidak perlu):" -ForegroundColor Yellow
        $securePassword = Read-Host -AsSecureString
        $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
        )
    }
    
    # Convert PEM to PFX using OpenSSL
    $certFile = $CertPath
    $pfxFile = $OutputPath
    
    if ([string]::IsNullOrEmpty($Password)) {
        $opensslCmd = "openssl pkcs12 -export -out `"$pfxFile`" -inkey `"$certFile`" -in `"$certFile`" -passout pass:"
    } else {
        $opensslCmd = "openssl pkcs12 -export -out `"$pfxFile`" -inkey `"$certFile`" -in `"$certFile`" -passout pass:`"$Password`""
    }
    
    try {
        Invoke-Expression $opensslCmd
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Berhasil convert ke .pfx: $pfxFile" -ForegroundColor Green
            Write-Host ""
            Write-Host "File .pfx siap digunakan untuk code signing!" -ForegroundColor Green
            Write-Host ""
            
            if (-not [string]::IsNullOrEmpty($Password)) {
                Write-Host "⚠️  Jangan lupa password: $Password" -ForegroundColor Yellow
                Write-Host ""
            }
            
            # Set environment variables untuk electron-builder
            $pfxFullPath = (Resolve-Path $pfxFile).Path
            Write-Host "Untuk menggunakan certificate ini, set environment variables:" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "  `$env:CSC_LINK = `"$pfxFullPath`"" -ForegroundColor White
            if (-not [string]::IsNullOrEmpty($Password)) {
                Write-Host "  `$env:CSC_KEY_PASSWORD = `"$Password`"" -ForegroundColor White
            }
            Write-Host ""
            Write-Host "Atau buat file .env dengan:" -ForegroundColor Cyan
            Write-Host "  CSC_LINK=$pfxFullPath" -ForegroundColor White
            if (-not [string]::IsNullOrEmpty($Password)) {
                Write-Host "  CSC_KEY_PASSWORD=$Password" -ForegroundColor White
            }
        } else {
            Write-Host "❌ Error saat convert certificate" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠️  File .pem tidak berisi private key" -ForegroundColor Yellow
    Write-Host ""
    
    # Check if .cer file exists
    $cerPath = "Signature\WTStation.cer"
    if (Test-Path $cerPath) {
        Write-Host "File .cer ditemukan, tapi untuk code signing butuh private key." -ForegroundColor Yellow
        Write-Host "Private key biasanya ada di file terpisah atau dalam .pem yang lengkap." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Opsi:" -ForegroundColor Cyan
        Write-Host "  1. Pastikan file .pem berisi BOTH certificate DAN private key" -ForegroundColor White
        Write-Host "  2. Atau minta file .p12/.pfx yang sudah lengkap" -ForegroundColor White
        Write-Host "  3. Atau install certificate ke Windows Certificate Store dan gunakan dari sana" -ForegroundColor White
    }
    
    exit 1
}

Write-Host ""
Write-Host "✅ Setup selesai!" -ForegroundColor Green

