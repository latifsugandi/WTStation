# scripts/sign-with-local-cert.ps1
# Script untuk signing installer dengan certificate lokal (.pfx)

param(
    [string]$InstallerPath = "",
    [string]$Version = "1.0.0",
    [string]$PfxPath = "Signature\WTStation.pfx",
    [string]$Password = ""
)

# Jika path tidak di-specify, cari otomatis
if ([string]::IsNullOrEmpty($InstallerPath)) {
    $InstallerPath = "release\WTStation Setup $Version.exe"
}

Write-Host "🔐 Code Signing dengan Certificate Lokal" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check certificate file
if (-not (Test-Path $PfxPath)) {
    Write-Host "❌ Error: Certificate file tidak ditemukan: $PfxPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Pastikan file .pfx sudah ada, atau jalankan:" -ForegroundColor Yellow
    Write-Host "  npm run setup:cert" -ForegroundColor White
    exit 1
}

Write-Host "✅ Certificate ditemukan: $PfxPath" -ForegroundColor Green

# Check installer
if (-not (Test-Path $InstallerPath)) {
    Write-Host "❌ Error: Installer tidak ditemukan: $InstallerPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Pastikan sudah build dulu dengan: npm run pack" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Installer ditemukan: $InstallerPath" -ForegroundColor Green
Write-Host ""

# Get password from environment or prompt
$certPassword = $Password
if ([string]::IsNullOrEmpty($certPassword)) {
    $certPassword = $env:CSC_KEY_PASSWORD
}

if ([string]::IsNullOrEmpty($certPassword)) {
    Write-Host "Masukkan password untuk certificate .pfx (kosongkan jika tidak ada password):" -ForegroundColor Yellow
    $securePassword = Read-Host -AsSecureString
    if ($securePassword.Length -gt 0) {
        $certPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
        )
    }
}

# Use signtool untuk signing
$pfxFullPath = (Resolve-Path $PfxPath).Path
$installerFullPath = (Resolve-Path $InstallerPath).Path

Write-Host "✍️  Signing installer..." -ForegroundColor Yellow

# Check if signtool exists
$signtoolPath = Get-Command signtool -ErrorAction SilentlyContinue
if (-not $signtoolPath) {
    # Try to find in Windows SDK
    $sdkPaths = @(
        "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe",
        "${env:ProgramFiles}\Windows Kits\10\bin\*\x64\signtool.exe"
    )
    
    $signtoolPath = $null
    foreach ($path in $sdkPaths) {
        $found = Get-Item $path -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $signtoolPath = $found.FullName
            break
        }
    }
}

if (-not $signtoolPath) {
    Write-Host "❌ Error: signtool tidak ditemukan" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Windows SDK:" -ForegroundColor Yellow
    Write-Host "  1. Download dari: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/" -ForegroundColor White
    Write-Host "  2. Atau install via Visual Studio Installer" -ForegroundColor White
    Write-Host ""
    Write-Host "Atau gunakan electron-builder dengan certificate langsung:" -ForegroundColor Yellow
    Write-Host "  `$env:CSC_LINK = `"$pfxFullPath`"" -ForegroundColor White
    if (-not [string]::IsNullOrEmpty($certPassword)) {
        Write-Host "  `$env:CSC_KEY_PASSWORD = `"$certPassword`"" -ForegroundColor White
    }
    Write-Host "  npm run pack" -ForegroundColor White
    exit 1
}

try {
    # Build signtool command
    $timestampUrl = "http://timestamp.digicert.com"
    
    if ([string]::IsNullOrEmpty($certPassword)) {
        $signCmd = "& `"$signtoolPath`" sign /f `"$pfxFullPath`" /t `"$timestampUrl`" `"$installerFullPath`""
    } else {
        $signCmd = "& `"$signtoolPath`" sign /f `"$pfxFullPath`" /p `"$certPassword`" /t `"$timestampUrl`" `"$installerFullPath`""
    }
    
    Write-Host "  → Executing signtool..." -ForegroundColor Gray
    Invoke-Expression $signCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Installer berhasil di-sign!" -ForegroundColor Green
        Write-Host ""
        
        # Verify signature
        Write-Host "🔍 Verifying signature..." -ForegroundColor Cyan
        $verifyCmd = "& `"$signtoolPath`" verify /pa `"$installerFullPath`""
        Invoke-Expression $verifyCmd
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Signature valid!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "⚠️  Signature verification returned warning (mungkin normal)" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "Verify dengan PowerShell:" -ForegroundColor Cyan
        Write-Host "  Get-AuthenticodeSignature `"$installerFullPath`"" -ForegroundColor White
        
    } else {
        Write-Host ""
        Write-Host "❌ Error: Signing gagal (exit code: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}

