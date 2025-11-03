# scripts/setup-signpath.ps1
# Script helper untuk setup SignPath.io

Write-Host "🚀 Setup SignPath.io untuk WTStation" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Langkah-langkah setup SignPath.io:" -ForegroundColor Yellow
Write-Host ""

Write-Host "STEP 1: Buat Project di SignPath.io" -ForegroundColor Green
Write-Host "  1. Buka: https://app.signpath.io/" -ForegroundColor White
Write-Host "  2. Login dengan akun Anda" -ForegroundColor White
Write-Host "  3. Klik 'Projects' atau 'Create Project'" -ForegroundColor White
Write-Host "  4. Klik 'New Project' atau '+' button" -ForegroundColor White
Write-Host "  5. Isi:" -ForegroundColor White
Write-Host "     - Name: WTStation" -ForegroundColor Gray
Write-Host "     - Platform: Windows" -ForegroundColor Gray
Write-Host "  6. Klik 'Create' atau 'Save'" -ForegroundColor White
Write-Host ""

Write-Host "STEP 2: Setup Certificate" -ForegroundColor Green
Write-Host "  Opsi A - Upload Certificate Sendiri:" -ForegroundColor White
Write-Host "    1. Di project WTStation, cari 'Certificates'" -ForegroundColor Gray
Write-Host "    2. Klik 'Upload Certificate' atau 'Add Certificate'" -ForegroundColor Gray
Write-Host "    3. Upload file Signature\WTStation.pem atau .cer" -ForegroundColor Gray
Write-Host ""
Write-Host "  Opsi B - Request Certificate dari SignPath:" -ForegroundColor White
Write-Host "    1. Di project, klik 'Request Certificate'" -ForegroundColor Gray
Write-Host "    2. Pilih 'Code Signing Certificate'" -ForegroundColor Gray
Write-Host "    3. Ikuti wizard (butuh approval, bisa beberapa hari)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Catatan: Untuk open source, cek SignPath Foundation (gratis)" -ForegroundColor Yellow
Write-Host "    https://signpath.org/" -ForegroundColor Cyan
Write-Host ""

Write-Host "STEP 3: Dapatkan API Token" -ForegroundColor Green
Write-Host "  1. Klik menu 'Settings' atau 'API' (biasanya di kanan atas)" -ForegroundColor White
Write-Host "  2. Pilih 'API Tokens' atau 'Tokens'" -ForegroundColor White
Write-Host "  3. Klik 'Create Token' atau 'Generate Token'" -ForegroundColor White
Write-Host "  4. Beri nama: 'WTStation Build'" -ForegroundColor White
Write-Host "  5. ⚠️  COPY TOKEN yang muncul (hanya muncul sekali!)" -ForegroundColor Red
Write-Host "  6. Simpan token dengan aman" -ForegroundColor White
Write-Host ""

Write-Host "STEP 4: Setup Environment Variables" -ForegroundColor Green
Write-Host ""
$apiToken = Read-Host "Masukkan API Token dari SignPath"
$projectId = Read-Host "Masukkan Project ID/Nama (default: WTStation)" 
if ([string]::IsNullOrEmpty($projectId)) {
    $projectId = "WTStation"
}

# Set environment variables untuk session ini
$env:SIGNPATH_API_TOKEN = $apiToken
$env:SIGNPATH_PROJECT_ID = $projectId
$env:SIGNPATH_API_URL = "https://app.signpath.io/api/v1"

Write-Host ""
Write-Host "✅ Environment variables sudah di-set untuk session ini" -ForegroundColor Green
Write-Host ""

Write-Host "Untuk permanent, buat file .env di root project:" -ForegroundColor Yellow
Write-Host "  SIGNPATH_API_TOKEN=$apiToken" -ForegroundColor White
Write-Host "  SIGNPATH_PROJECT_ID=$projectId" -ForegroundColor White
Write-Host "  SIGNPATH_API_URL=https://app.signpath.io/api/v1" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  JANGAN commit file .env ke Git!" -ForegroundColor Red
Write-Host ""

# Test connection (optional)
Write-Host "Ingin test koneksi ke SignPath sekarang? (Y/N)" -ForegroundColor Cyan
$test = Read-Host
if ($test -eq "Y" -or $test -eq "y") {
    Write-Host ""
    Write-Host "Testing connection..." -ForegroundColor Yellow
    
    try {
        $headers = @{
            "Authorization" = "Bearer $apiToken"
        }
        
        # Try to get project info
        $testUrl = "https://app.signpath.io/api/v1/projects/$projectId"
        $response = Invoke-RestMethod -Uri $testUrl -Method Get -Headers $headers -ErrorAction Stop
        
        Write-Host "✅ Koneksi berhasil!" -ForegroundColor Green
        Write-Host "   Project: $($response.name)" -ForegroundColor White
        
    } catch {
        Write-Host "❌ Error test koneksi: $_" -ForegroundColor Red
        Write-Host "   Pastikan API token dan project ID benar" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Setup selesai!" -ForegroundColor Green
Write-Host ""
Write-Host "Langkah selanjutnya:" -ForegroundColor Cyan
Write-Host "  1. Pastikan certificate sudah di-setup di SignPath project" -ForegroundColor White
Write-Host "  2. Build dan sign dengan: npm run pack:sign" -ForegroundColor White
Write-Host ""

