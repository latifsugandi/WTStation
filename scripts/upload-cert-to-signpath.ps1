# scripts/upload-cert-to-signpath.ps1
# Script untuk upload certificate lokal ke SignPath.io

param(
    [string]$CertPath = "Signature\WTStation.pem",
    [string]$ProjectId = "WTStation"
)

Write-Host "Upload Certificate ke SignPath.io" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check environment variables
$API_TOKEN = $env:SIGNPATH_API_TOKEN
$API_URL = $env:SIGNPATH_API_URL

if ([string]::IsNullOrEmpty($API_URL)) {
    $API_URL = "https://app.signpath.io/api/v1"
}

if ([string]::IsNullOrEmpty($API_TOKEN)) {
    Write-Host "ERROR: SIGNPATH_API_TOKEN tidak di-set!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Set dulu dengan:" -ForegroundColor Yellow
    Write-Host "  `$env:SIGNPATH_API_TOKEN = 'your-token-here'" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Check certificate file
if (-not (Test-Path $CertPath)) {
    Write-Host "ERROR: File certificate tidak ditemukan: $CertPath" -ForegroundColor Red
    exit 1
}

Write-Host "File certificate: $CertPath" -ForegroundColor Green
Write-Host "Project ID: $ProjectId" -ForegroundColor Green
Write-Host ""

# Check if file has private key
$certContent = Get-Content $CertPath -Raw
$hasPrivateKey = $certContent -match "BEGIN.*PRIVATE KEY" -or $certContent -match "BEGIN RSA PRIVATE KEY"

if ($hasPrivateKey) {
    Write-Host "SUCCESS: File berisi private key" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "WARNING: File TIDAK berisi private key" -ForegroundColor Yellow
    Write-Host "Untuk code signing, butuh file dengan private key" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opsi:" -ForegroundColor Cyan
    Write-Host "  1. Upload file .pfx/.p12 yang lengkap (dengan private key)" -ForegroundColor White
    Write-Host "  2. Atau file .pem yang berisi BOTH certificate DAN private key" -ForegroundColor White
    Write-Host ""
    
    $continue = Read-Host "Tetap lanjutkan upload? (Y/N)"
    if ($continue -ne "Y" -and $continue -ne "y") {
        Write-Host "Upload dibatalkan" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "Uploading certificate ke SignPath..." -ForegroundColor Yellow

try {
    $fileName = Split-Path -Leaf $CertPath
    $fileBytes = [System.IO.File]::ReadAllBytes($CertPath)
    $fileBase64 = [Convert]::ToBase64String($fileBytes)
    
    $headers = @{
        "Authorization" = "Bearer $API_TOKEN"
        "Content-Type" = "application/json"
    }
    
    # Try to upload certificate
    # Note: API endpoint bisa berbeda, sesuaikan dengan dokumentasi SignPath
    $uploadUrl = "$API_URL/projects/$ProjectId/certificates"
    
    $body = @{
        name = "WTStation Certificate"
        certificateData = $fileBase64
        fileName = $fileName
    } | ConvertTo-Json
    
    Write-Host "  -> Sending request..." -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    Write-Host "SUCCESS: Certificate berhasil di-upload!" -ForegroundColor Green
    Write-Host "  Certificate ID: $($response.id)" -ForegroundColor White
    Write-Host ""
    Write-Host "Certificate sekarang bisa digunakan untuk signing di project $ProjectId" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "ERROR: Upload gagal" -ForegroundColor Red
    Write-Host "  Message: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.ErrorDetails) {
        Write-Host "Detail: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Catatan:" -ForegroundColor Yellow
    Write-Host "  1. API endpoint bisa berbeda - cek dokumentasi SignPath" -ForegroundColor White
    Write-Host "  2. Upload certificate bisa via web UI di SignPath dashboard" -ForegroundColor White
    Write-Host "  3. Pastikan project $ProjectId sudah dibuat di SignPath" -ForegroundColor White
    Write-Host ""
    Write-Host "Cara manual:" -ForegroundColor Cyan
    Write-Host "  1. Login ke https://app.signpath.io/" -ForegroundColor White
    Write-Host "  2. Buka project $ProjectId" -ForegroundColor White
    Write-Host "  3. Menu Certificates -> Upload Certificate" -ForegroundColor White
    Write-Host "  4. Upload file: $CertPath" -ForegroundColor White
    Write-Host ""
    
    exit 1
}

