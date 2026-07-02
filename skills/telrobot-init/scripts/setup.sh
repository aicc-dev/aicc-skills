#!/bin/sh
set -eu

DEFAULT_BASE_URL="https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/go/latest"
force=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --force)
      force=1
      shift
      ;;
    --mode|--profile|--profiles|--current-profile)
      # Legacy setup flags are ignored. Profile/config changes belong to telrobot-cli.
      if [ "$#" -gt 1 ]; then
        shift 2
      else
        shift
      fi
      ;;
    *)
      shift
      ;;
  esac
done

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

if [ "${TELROBOT_SETUP_DRY_RUN:-}" = "1" ]; then
  printf "platform: %s\n" "$platform"
  printf "arch: %s\n" "$arch"
  printf "asset: %s\n" "$asset"
  printf "url: %s\n" "$url"
  printf "destination: %s\n" "$destination"
  exit 0
fi

if [ "$force" -ne 1 ] && [ -f "$destination" ]; then
  printf "✅ Telrobot CLI already exists, skipping download: %s\n" "$destination"
  printf "ℹ️  Config is managed by telrobot-cli config commands; setup.sh does not write config.yaml.\n"
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

printf "✅ Installed Telrobot CLI: %s\n" "$destination"
printf "ℹ️  Config is managed by telrobot-cli config commands; setup.sh does not write config.yaml.\n"
