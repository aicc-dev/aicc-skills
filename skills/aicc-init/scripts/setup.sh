#!/bin/sh
set -eu

DEFAULT_BASE_URL="https://oss-telrobot.oss-cn-hangzhou.aliyuncs.com/static/aicc-cli/latest"

normalize_platform() {
  case "$1" in
    Darwin) printf "darwin" ;;
    Linux) printf "linux" ;;
    *) printf "Unsupported platform: %s\n" "$1" >&2; exit 1 ;;
  esac
}

normalize_arch() {
  case "$1" in
    x86_64|amd64) printf "x64" ;;
    arm64|aarch64) printf "arm64" ;;
    *) printf "Unsupported architecture: %s\n" "$1" >&2; exit 1 ;;
  esac
}

uname_s="${AICC_TEST_UNAME_S:-$(uname -s)}"
uname_m="${AICC_TEST_UNAME_M:-$(uname -m)}"
platform="$(normalize_platform "$uname_s")"
arch="$(normalize_arch "$uname_m")"
asset="aicc-${platform}-${arch}"

if [ -n "${AICC_DOWNLOAD_BASE_URL:-}" ]; then
  base_url="${AICC_DOWNLOAD_BASE_URL%/}"
else
  base_url="$DEFAULT_BASE_URL"
fi

url="${base_url}/${asset}"
bin_dir="${AICC_BIN_DIR:-"$HOME/.aicc/bin"}"
destination="${bin_dir}/aicc"

if [ "${AICC_SETUP_DRY_RUN:-}" = "1" ]; then
  printf "platform: %s\n" "$platform"
  printf "arch: %s\n" "$arch"
  printf "asset: %s\n" "$asset"
  printf "url: %s\n" "$url"
  printf "destination: %s\n" "$destination"
  exit 0
fi

mkdir -p "$bin_dir"

if command -v curl >/dev/null 2>&1; then
  curl -fL "$url" -o "$destination"
elif command -v wget >/dev/null 2>&1; then
  wget -O "$destination" "$url"
else
  printf "Failed to initialize AICC: curl or wget is required to download %s\n" "$url" >&2
  exit 1
fi

chmod +x "$destination"
printf "Installed AICC executable: %s\n" "$destination"
