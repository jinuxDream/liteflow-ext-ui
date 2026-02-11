#!/bin/bash
set -e

echo "开始构建前端静态资源..."
cd "$(dirname "$0")"

npm install
npm run build:demo

echo "修改HTML文件中的资源路径..."
sed -i '' 's|href="./|href="/liteflow-ui-assets/|g' ../dist-demo/index.html
sed -i '' 's|src="./|src="/liteflow-ui-assets/|g' ../dist-demo/index.html

echo "复制静态资源到后端项目..."
BACKEND_DIR="../liteflow-editor-server/liteflow-editor-ui-starter/src/main/resources"

mkdir -p "$BACKEND_DIR/static/assets"
cp ../dist-demo/index.html "$BACKEND_DIR/static/"
cp -r ../dist-demo/assets/* "$BACKEND_DIR/static/assets/"

echo "构建完成！"
