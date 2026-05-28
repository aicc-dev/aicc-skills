#!/bin/bash

# Telrobot CLI 多平台构建脚本
# 用于生成技能包所需的二进制文件

set -e

VERSION=${1:-"1.0.0"}
DIST_DIR="dist"
BINARY_NAME="telrobot-cli"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔨 Telrobot CLI 多平台构建脚本${NC}"
echo -e "${YELLOW}版本: ${VERSION}${NC}"
echo ""

# 进入项目目录
cd "$PROJECT_DIR"

# 清理旧的构建
echo -e "${BLUE}🧹 清理旧的构建文件...${NC}"
rm -rf "${DIST_DIR}/"
mkdir -p "${DIST_DIR}"

# 定义平台和架构（对应技能包中的命名规范）
build_platform() {
    local goos=$1
    local goarch=$2
    local output_name=$3

    echo -e "${BLUE}🔨 构建 ${goos}/${goarch} -> ${output_name}${NC}"

    # 构建二进制文件
    GOOS=$goos GOARCH=$goarch go build \
        -ldflags "-s -w -X main.Version=${VERSION}" \
        -o "${DIST_DIR}/${output_name}" .

    # 设置执行权限（非Windows）
    if [ $goos != "windows" ]; then
        chmod +x "${DIST_DIR}/${output_name}"
    fi

    echo -e "${GREEN}✅ ${output_name}${NC}"
}

# 构建各个平台
build_platform "darwin" "amd64" "telrobot-darwin-amd64"
build_platform "darwin" "arm64" "telrobot-darwin-arm64"
build_platform "linux" "amd64" "telrobot-linux-amd64"
build_platform "linux" "arm64" "telrobot-linux-arm64"
build_platform "windows" "amd64" "telrobot-windows-amd64.exe"

# 生成校验和（兼容 macOS 和 Linux）
echo -e "${BLUE}🔐 生成校验和...${NC}"
cd "${DIST_DIR}"
if command -v sha256sum >/dev/null 2>&1; then
    sha256sum * > SHA256SUMS
else
    shasum -a 256 * > SHA256SUMS
fi
cd - > /dev/null
echo -e "${GREEN}✅ SHA256SUMS 已生成${NC}"

# 显示构建结果
echo ""
echo -e "${GREEN}🎉 构建完成！${NC}"
echo ""
echo -e "${BLUE}输出目录: ${DIST_DIR}${NC}"
echo ""
echo -e "${BLUE}构建文件:${NC}"
ls -lh "${DIST_DIR}/"
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo "  1. 上传 ${DIST_DIR} 中的文件到发布服务器"
echo "  2. 确保下载地址与 skills/telrobot-init/scripts/setup.js 中的 URL 匹配"
echo "  3. 发布技能包: git push"
echo ""
echo -e "${BLUE}技能包安装:${NC}"
echo "  # 根据你使用的 Agent 替换 <agent-name>："
echo "  npx skills add gsq/telrobot-saas-cli -a <agent-name> -g -y"
echo ""
echo "  支持的 Agent 示例："

echo "    workbuddy   →  npx skills add gsq172/aicc-skills -a workbuddy -g -y"
echo "    qoder       →  npx skills add gsq172/aicc-skills -a qoder -g -y"
echo "    cursor      →  npx skills add gsq172/aicc-skills-a cursor -g -y"
echo "    claude-code →  npx skills add gsq172/aicc-skills -a claude-code -g -y"