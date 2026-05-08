#!/bin/sh
set -eu

version="${AICC_VERSION:-dev}"
dist_dir="${AICC_DIST_DIR:-dist}"

build_target() {
  goos="$1"
  goarch="$2"
  output="$3"

  printf "GOOS=%s GOARCH=%s -> %s\n" "$goos" "$goarch" "$output"
  GOOS="$goos" GOARCH="$goarch" go build -ldflags "-X main.version=${version}" -o "${dist_dir}/${output}" ./cmd/aicc
}

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

# GOOS=darwin GOARCH=arm64 -> aicc-darwin-arm64
build_target darwin arm64 aicc-darwin-arm64
# GOOS=darwin GOARCH=amd64 -> aicc-darwin-x64
build_target darwin amd64 aicc-darwin-x64
# GOOS=linux GOARCH=arm64 -> aicc-linux-arm64
build_target linux arm64 aicc-linux-arm64
# GOOS=linux GOARCH=amd64 -> aicc-linux-x64
build_target linux amd64 aicc-linux-x64
# GOOS=windows GOARCH=amd64 -> aicc-win32-x64.exe
build_target windows amd64 aicc-win32-x64.exe
