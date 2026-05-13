#!/bin/sh
set -eu


DEFAULT_BASE_URL="https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/go/latest"

normalize_platform() {
  case "$1" in
    Darwin) printf "darwin" ;;
    Linux) printf "linux" ;;
    CYGWIN*|MINGW*|MSYS*) printf "windows" ;;
    *) printf "Unsupported platform: %s\n" "$1" >&2; exit 1 ;;
  esac
}

normalize_arch() {
  case "$1" in
    x86_64|amd64) printf "amd64" ;;
    arm64|aarch64) printf "arm64" ;;
    *) printf "Unsupported architecture: %s\n" "$1" >&2; exit 1 ;;
  esac
}

uname_s="${TELROBOT_TEST_UNAME_S:-$(uname -s)}"
uname_m="${TELROBOT_TEST_UNAME_M:-$(uname -m)}"
platform="$(normalize_platform "$uname_s")"
arch="$(normalize_arch "$uname_m")"
asset="telrobot-${platform}-${arch}"

if [ -n "${TELROBOT_DOWNLOAD_BASE_URL:-}" ]; then
  base_url="${TELROBOT_DOWNLOAD_BASE_URL%/}"
else
  base_url="$DEFAULT_BASE_URL"
fi

url="${base_url}/${asset}"
telrobot_home="${TELROBOT_HOME:-"$HOME/.telrobot-cli"}"
bin_dir="${TELROBOT_BIN_DIR:-"$telrobot_home/bin"}"
destination="${bin_dir}/telrobot-cli"
config_path="${TELROBOT_CONFIG_PATH:-"$telrobot_home/config.yaml"}"
api_url="${TELROBOT_API_URL:-"http://localhost:8001"}"

write_config() {
  mkdir -p "$(dirname "$config_path")"

  # 写入 YAML 格式配置（CLI 实际读取的格式）
  cat > "$config_path" <<EOF
server:
  baseURL: ${api_url}
  apiVersion: v1
auth:
  token: ${TELROBOT_TOKEN:-}
output:
  format: table
EOF
}

if [ "${TELROBOT_SETUP_DRY_RUN:-}" = "1" ]; then
  printf "platform: %s\n" "$platform"
  printf "arch: %s\n" "$arch"
  printf "asset: %s\n" "$asset"
  printf "url: %s\n" "$url"
  printf "destination: %s\n" "$destination"
  printf "config path: %s\n" "$config_path"
  exit 0
fi

printf "📥 Downloading Telrobot CLI for %s-%s...\n" "$platform" "$arch"
printf "🔗 URL: %s\n" "$url"

mkdir -p "$bin_dir"

if command -v curl >/dev/null 2>&1; then
  curl -fL "$url" -o "$destination"
elif command -v wget >/dev/null 2>&1; then
  wget -O "$destination" "$url"
else
  printf "❌ Failed to initialize Telrobot: curl or wget is required to download %s\n" "$url" >&2
  exit 1
fi

chmod +x "$destination"
write_config

printf "✅ Installed Telrobot CLI: %s\n" "$destination"
printf "📝 Wrote config: %s\n" "$config_path"
printf "🚀 Ready to use! Agents will read executablePath from config.\n"