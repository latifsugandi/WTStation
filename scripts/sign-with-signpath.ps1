# scripts/sign-with-signpath.ps1
# Script untuk signing installer dengan SignPath.io

param(
    [string]$InstallerPath = "",
    [string]$Version = "1.0.0"
)

# Jika path tidak di-specify, cari otomatis
if ([string]::IsNullOrEmpty($InstallerPath)) {
    $InstallerPath = "release\WTStation Setup $Version.exe"
}

# Check environment variables
$API_TOKEN = $env:SIGNPATH_API_TOKEN
$API_URL = $env:SIGNPATH_API_URL
$PROJECT_ID = $env:SIGNPATH_PROJECT_ID

# Default values
if ([string]::IsNullOrEmpty($API_URL)) {
    $API_URL = "https://app.signpath.io/api/v1"
}

if ([string]::IsNullOrEmpty($PROJECT_ID)) {
    $PROJECT_ID = "WTStation"
}

# Validation
if ([string]::IsNullOrEmpty($API_TOKEN)) {
    Write-Host "ERROR: SIGNPATH_API_TOKEN tidak di-set!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Cara setup:" -ForegroundColor Yellow
    Write-Host "  1. Login ke https://app.signpath.io/" -ForegroundColor Cyan
    Write-Host "  2. Buat API Token di Settings -> API Tokens" -ForegroundColor Cyan
    Write-Host "  3. Set environment variable:" -ForegroundColor Cyan
    Write-Host "     `$env:SIGNPATH_API_TOKEN = 'your-token-here'" -ForegroundColor White
    Write-Host ""
    exit 1
}

if (-not (Test-Path $InstallerPath)) {
    Write-Host "ERROR: Installer tidak ditemukan: $InstallerPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Pastikan sudah build dulu dengan: npm run pack" -ForegroundColor Yellow
    exit 1
}

Write-Host "SignPath.io Code Signing" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Installer: $InstallerPath" -ForegroundColor White
Write-Host "Project: $PROJECT_ID" -ForegroundColor White
Write-Host ""

# Step 1: Upload file ke SignPath
Write-Host "Uploading installer ke SignPath..." -ForegroundColor Yellow

$fileName = Split-Path -Leaf $InstallerPath

try {
    # Create multipart form data
    $boundary = [System.Guid]::NewGuid().ToString()
    $fileBytes = [System.IO.File]::ReadAllBytes($InstallerPath)
    $enc = [System.Text.Encoding]::GetEncoding("iso-8859-1")
    
    # Build multipart form body
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
        "Content-Type: application/octet-stream",
        "",
        $enc.GetString($fileBytes),
        "--$boundary--"
    ) -join "`r`n"
    
    $headers = @{
        "Authorization" = "Bearer $API_TOKEN"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    
    # Upload endpoint (sesuaikan dengan dokumentasi SignPath)
    $uploadUrl = "$API_URL/projects/$PROJECT_ID/artifacts/upload"
    
    Write-Host "  -> Sending request to SignPath..." -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $headers -Body ([System.Text.Encoding]::GetEncoding("iso-8859-1").GetBytes($bodyLines))
    
    Write-Host "SUCCESS: Upload berhasil!" -ForegroundColor Green
    
    # Step 2: Request signing
    Write-Host ""
    Write-Host "Requesting code signing..." -ForegroundColor Yellow
    
    $artifactId = $response.id
    if ([string]::IsNullOrEmpty($artifactId)) {
        $artifactId = $response.artifactId
    }
    
    $signUrl = "$API_URL/projects/$PROJECT_ID/signing-requests"
    $signBody = @{
        artifactId = $artifactId
        signingPolicyId = $null  # Use default policy
    } | ConvertTo-Json
    
    $signHeaders = @{
        "Authorization" = "Bearer $API_TOKEN"
        "Content-Type" = "application/json"
    }
    
    $signResponse = Invoke-RestMethod -Uri $signUrl -Method Post -Headers $signHeaders -Body $signBody
    
    Write-Host "SUCCESS: Signing request submitted!" -ForegroundColor Green
    Write-Host "  -> Request ID: $($signResponse.id)" -ForegroundColor Gray
    
    # Step 3: Poll untuk status (wait for signing complete)
    Write-Host ""
    Write-Host "Menunggu proses signing selesai..." -ForegroundColor Yellow
    
    $requestId = $signResponse.id
    $statusUrl = "$API_URL/projects/$PROJECT_ID/signing-requests/$requestId"
    
    $maxAttempts = 60  # Max 5 minutes
    $attempt = 0
    $signed = $false
    
    while ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 5
        $attempt++
        
        $statusResponse = Invoke-RestMethod -Uri $statusUrl -Method Get -Headers $signHeaders
        
        $status = $statusResponse.status
        Write-Host "  -> Status: $status (attempt $attempt/$maxAttempts)" -ForegroundColor Gray
        
        if ($status -eq "Completed" -or $status -eq "Succeeded") {
            $signed = $true
            break
        }
        
        if ($status -eq "Failed" -or $status -eq "Rejected") {
            Write-Host "ERROR: Signing gagal: $status" -ForegroundColor Red
            Write-Host "   Detail: $($statusResponse.errorMessage)" -ForegroundColor Red
            exit 1
        }
    }
    
    if (-not $signed) {
        Write-Host "ERROR: Timeout: Signing belum selesai setelah 5 menit" -ForegroundColor Red
        Write-Host "   Check status manual di SignPath dashboard" -ForegroundColor Yellow
        exit 1
    }
    
    # Step 4: Download signed file
    Write-Host ""
    Write-Host "Downloading signed installer..." -ForegroundColor Yellow
    
    $downloadUrl = $statusResponse.downloadUrl
    if ([string]::IsNullOrEmpty($downloadUrl)) {
        # Alternative: Construct download URL
        $downloadUrl = "$API_URL/projects/$PROJECT_ID/signing-requests/$requestId/download"
    }
    
    $signedPath = $InstallerPath -replace '\.exe$', '.signed.exe'
    Invoke-WebRequest -Uri $downloadUrl -Headers $signHeaders -OutFile $signedPath
    
    # Replace original dengan signed version
    Write-Host "Replacing original installer..." -ForegroundColor Yellow
    Move-Item -Path $signedPath -Destination $InstallerPath -Force
    
    Write-Host ""
    Write-Host "SUCCESS: Installer berhasil di-sign dengan SignPath!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verifikasi signature:" -ForegroundColor Cyan
    Write-Host "  Get-AuthenticodeSignature `"$InstallerPath`"" -ForegroundColor White
    
} catch {
    Write-Host ""
    Write-Host "ERROR: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Detail error:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Pastikan API token valid" -ForegroundColor White
    Write-Host "  2. Pastikan project ID benar" -ForegroundColor White
    Write-Host "  3. Pastikan certificate sudah di-setup di SignPath project" -ForegroundColor White
    Write-Host "  4. Cek dokumentasi SignPath untuk endpoint yang benar" -ForegroundColor White
    
    exit 1
}
