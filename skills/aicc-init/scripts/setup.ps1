$ErrorActionPreference = "Stop"

$DefaultBaseUrl = "https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/static/aicc-cli/latest"

function Normalize-Architecture {
  param([string]$Value)

  switch ($Value.ToLowerInvariant()) {
    "amd64" { return "x64" }
    "x86_64" { return "x64" }
    "arm64" { return "arm64" }
    "aarch64" { return "arm64" }
    default { throw "Unsupported architecture: $Value" }
  }
}

$Platform = "win32"
$ArchSource = if ($env:AICC_TEST_ARCH) { $env:AICC_TEST_ARCH } else { $env:PROCESSOR_ARCHITECTURE }
$Arch = Normalize-Architecture $ArchSource

if ($Arch -ne "x64") {
  throw "Windows is currently supported only on x64"
}

$Asset = "aicc-win32-x64.exe"

if ($env:AICC_DOWNLOAD_BASE_URL) {
  $BaseUrl = $env:AICC_DOWNLOAD_BASE_URL.TrimEnd("/")
} else {
  $BaseUrl = $DefaultBaseUrl
}

$Url = "$BaseUrl/$Asset"
$BinDir = if ($env:AICC_BIN_DIR) { $env:AICC_BIN_DIR } else { Join-Path $HOME ".aicc\bin" }
$Destination = Join-Path $BinDir "aicc.exe"

if ($env:AICC_SETUP_DRY_RUN -eq "1") {
  Write-Output "platform: $Platform"
  Write-Output "arch: $Arch"
  Write-Output "asset: $Asset"
  Write-Output "url: $Url"
  Write-Output "destination: $Destination"
  exit 0
}

New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
Invoke-WebRequest -Uri $Url -OutFile $Destination
Write-Output "Installed AICC executable: $Destination"
