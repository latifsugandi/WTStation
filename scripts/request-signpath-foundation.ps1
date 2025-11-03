# scripts/request-signpath-foundation.ps1
# Script helper untuk request certificate gratis dari SignPath Foundation

Write-Host "SignPath Foundation - Free Certificate Request" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "SignPath Foundation menyediakan FREE code signing certificate" -ForegroundColor Green
Write-Host "untuk project open source yang memenuhi syarat." -ForegroundColor Green
Write-Host ""

Write-Host "Project Anda:" -ForegroundColor Yellow
Write-Host "  Name: WTStation" -ForegroundColor White
Write-Host "  License: MIT (Open Source)" -ForegroundColor White
Write-Host "  Description: WhatsApp Multi-Account Management Desktop App" -ForegroundColor White
Write-Host ""

Write-Host "Syarat:" -ForegroundColor Yellow
Write-Host "  - Project harus open source (MIT License - OK)" -ForegroundColor Green
Write-Host "  - Repository harus public (GitHub/GitLab/Bitbucket)" -ForegroundColor White
Write-Host "  - Project aktif dan maintained" -ForegroundColor White
Write-Host ""

$hasRepo = Read-Host "Apakah project sudah ada di repository public? (Y/N)"
if ($hasRepo -ne "Y" -and $hasRepo -ne "y") {
    Write-Host ""
    Write-Host "Anda perlu membuat repository public dulu:" -ForegroundColor Yellow
    Write-Host "  1. GitHub: https://github.com/new" -ForegroundColor Cyan
    Write-Host "  2. GitLab: https://gitlab.com/projects/new" -ForegroundColor Cyan
    Write-Host "  3. Bitbucket: https://bitbucket.org/repo/create" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Setelah repository dibuat, jalankan script ini lagi." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
$repoUrl = Read-Host "Masukkan URL repository (contoh: https://github.com/username/wtstation)"

if ([string]::IsNullOrEmpty($repoUrl)) {
    Write-Host "ERROR: URL repository harus diisi" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Langkah selanjutnya:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Buka website SignPath Foundation:" -ForegroundColor Yellow
Write-Host "   https://signpath.org/" -ForegroundColor White
Write-Host ""
Write-Host "2. Klik 'Request Certificate' atau 'Apply'" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Isi form dengan informasi berikut:" -ForegroundColor Yellow
Write-Host "   Project Name: WTStation" -ForegroundColor White
Write-Host "   Project URL: $repoUrl" -ForegroundColor White
Write-Host "   License: MIT" -ForegroundColor White
Write-Host "   Description: WhatsApp Multi-Account Management Desktop App for Windows" -ForegroundColor White
Write-Host "   Platform: Windows" -ForegroundColor White
Write-Host ""
Write-Host "4. Submit application dan tunggu approval (1-3 hari kerja)" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Setelah approved:" -ForegroundColor Yellow
Write-Host "   - Login ke https://app.signpath.io/" -ForegroundColor White
Write-Host "   - Certificate akan tersedia di project" -ForegroundColor White
Write-Host "   - Get API token dan setup environment variables" -ForegroundColor White
Write-Host "   - Build & sign: npm run pack:sign" -ForegroundColor White
Write-Host ""

$openWebsite = Read-Host "Buka website SignPath Foundation di browser sekarang? (Y/N)"
if ($openWebsite -eq "Y" -or $openWebsite -eq "y") {
    Start-Process "https://signpath.org/"
}

Write-Host ""
Write-Host "Informasi tambahan:" -ForegroundColor Cyan
Write-Host "  - Website: https://signpath.org/" -ForegroundColor White
Write-Host "  - Documentation: https://docs.signpath.io/" -ForegroundColor White
Write-Host "  - Timeline: 1-3 hari kerja untuk approval" -ForegroundColor White
Write-Host ""
Write-Host "Setelah certificate approved, ikuti panduan di:" -ForegroundColor Yellow
Write-Host "  SIGNPATH_FOUNDATION_SETUP.md" -ForegroundColor Cyan
Write-Host ""

