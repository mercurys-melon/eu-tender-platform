<#
  oces3-til-pem.ps1 - konverterer OCES3-organisationscertifikat (.p12) til
  base64-kodet PEM til env-variablerne UDBUD_DK_MTLS_CERT_B64 / _KEY_B64.

  Brug (fra en mappe UDEN FOR repo'et):
    powershell -ExecutionPolicy Bypass -File <repo>\scripts\oces3-til-pem.ps1 -P12 .\mercurry.p12

  Udskriver de to base64-vaerdier til konsollen og sletter de midlertidige
  PEM-filer igen. Den private noegle skrives aldrig til repo'et.
#>
param(
  [Parameter(Mandatory = $true)][string]$P12,
  [string]$OpenSsl = "C:\Program Files\Git\usr\bin\openssl.exe"
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $OpenSsl)) { throw "openssl ikke fundet: $OpenSsl (installer Git for Windows eller angiv -OpenSsl)" }
if (-not (Test-Path $P12)) { throw "Filen findes ikke: $P12" }

$tmp = Join-Path $env:TEMP ("oces3-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  $crt = Join-Path $tmp 'client.crt'
  $key = Join-Path $tmp 'client.key'
  # openssl spoerger selv efter .p12-adgangskoden
  & $OpenSsl pkcs12 -in $P12 -clcerts -nokeys -out $crt
  if ($LASTEXITCODE -ne 0) { throw "openssl fejlede ved udtraek af certifikat" }
  & $OpenSsl pkcs12 -in $P12 -nocerts -nodes -out $key
  if ($LASTEXITCODE -ne 0) { throw "openssl fejlede ved udtraek af noegle" }

  Write-Host "`nSubject (find Subject Serial Number / UUID her):" -ForegroundColor Cyan
  & $OpenSsl x509 -in $crt -noout -subject -enddate

  Write-Host "`nUDBUD_DK_MTLS_CERT_B64=" -ForegroundColor Yellow
  [Convert]::ToBase64String([IO.File]::ReadAllBytes($crt))
  Write-Host "`nUDBUD_DK_MTLS_KEY_B64=" -ForegroundColor Yellow
  [Convert]::ToBase64String([IO.File]::ReadAllBytes($key))
  Write-Host "`nIndsaet som 'Sensitive' env vars i Vercel. Ryd konsollen bagefter (cls)." -ForegroundColor Cyan
}
finally {
  Remove-Item -Recurse -Force $tmp
}
