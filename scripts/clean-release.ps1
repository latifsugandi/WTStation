# Script untuk membersihkan folder release sebelum build
Write-Host "Membersihkan folder release..."

# Kill processes
Get-Process | Where-Object {
    $_.MainWindowTitle -like "*Wastation*" -or 
    $_.Path -like "*release*Wastation*" -or
    $_.ProcessName -eq "Wastation"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 1

# Hapus folder release
if (Test-Path "release") {
    Remove-Item -Path "release" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Folder release dihapus"
} else {
    Write-Host "✓ Folder release tidak ada"
}

Write-Host "Selesai. Siap untuk build."
