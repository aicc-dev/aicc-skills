# Telrobot CLI Windows 安装脚本（PowerShell 兜底方案）
# 用于没有 Node.js 的 Windows 用户
# 运行方式: powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$DEFAULT_BASE_URL = "https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/go/latest"

# ── 平台检测（Windows 仅支持 amd64）────────────────────────────
$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -eq "AMD64" -or $arch -eq "x86_64") {
    $normalizedArch = "amd64"
} else {
    Write-Error "Unsupported architecture: $arch. Only amd64 is supported on Windows."
    exit 1
}

$assetName = "telrobot-windows-${normalizedArch}.exe"

# ── 路径解析 ────────────────────────────────────────────────────
$telrobotHome = if ($env:TELROBOT_HOME) { $env:TELROBOT_HOME } else { Join-Path $HOME ".telrobot-cli" }
$binDir       = if ($env:TELROBOT_BIN_DIR) { $env:TELROBOT_BIN_DIR } else { Join-Path $telrobotHome "bin" }
$destination  = Join-Path $binDir "telrobot-cli.exe"

$baseUrl = if ($env:TELROBOT_DOWNLOAD_BASE_URL) {
    $env:TELROBOT_DOWNLOAD_BASE_URL.TrimEnd("/")
} else {
    $DEFAULT_BASE_URL
}
$url = "${baseUrl}/${assetName}"

# ── Dry-run 模式 ─────────────────────────────────────────────────
if ($env:TELROBOT_SETUP_DRY_RUN -eq "1") {
    Write-Host "platform: windows"
    Write-Host "arch: $normalizedArch"
    Write-Host "asset: $assetName"
    Write-Host "url: $url"
    Write-Host "destination: $destination"
    exit 0
}

if (-not $Force -and (Test-Path $destination)) {
    Write-Host "✅ Telrobot CLI already exists, skipping download: $destination"
    Write-Host "ℹ️  Config is managed by telrobot-cli config commands; setup.ps1 does not write config.yaml."
    exit 0
}

# ── 下载 ────────────────────────────────────────────────────────
Write-Host "📥 Downloading Telrobot CLI for windows-${normalizedArch}..."
Write-Host "🔗 URL: $url"

New-Item -ItemType Directory -Force -Path $binDir | Out-Null

try {
    Invoke-WebRequest -Uri $url -OutFile $destination -UseBasicParsing
} catch {
    Write-Error "❌ Download failed: $_"
    exit 1
}

Write-Host "✅ Installed Telrobot CLI: $destination"
Write-Host "ℹ️  Config is managed by telrobot-cli config commands; setup.ps1 does not write config.yaml."
