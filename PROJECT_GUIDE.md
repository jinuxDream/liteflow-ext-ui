# LiteFlow Editor 独立项目说明

## 项目概述

这是一个从原项目中提取的 LiteFlow 可视化编辑器独立版本，包含了完整的编辑器功能和所有依赖。

## 项目结构

```
liteflow-editor-standalone/
├── src/
│   ├── LiteFlowEditor/          # 编辑器核心代码
│   │   ├── assets/              # SVG 图标资源
│   │   ├── cells/               # 节点类型定义
│   │   ├── common/              # 公共工具函数
│   │   ├── components/          # React 组件
│   │   ├── constant/            # 常量定义
│   │   ├── context/             # React Context
│   │   ├── hooks/               # 自定义 Hooks
│   │   ├── mock/                # 模拟数据
│   │   ├── model/               # 数据模型
│   │   ├── panels/              # 面板组件
│   │   ├── utils/               # 工具函数
│   │   ├── index.tsx            # 主组件
│   │   └── index.module.less    # 样式文件
│   └── index.ts                 # 入口导出文件
├── package.json                 # 项目配置
├── tsconfig.json                # TypeScript 配置
├── vite.config.ts               # Vite 构建配置
├── README.md                    # 使用文档
├── demo.tsx                     # 示例代码
└── index.html                   # 示例页面
```

## 核心功能

1. **可视化编辑**：通过拖拽方式创建和编辑 LiteFlow 流程
2. **多种节点类型**：支持 THEN、WHEN、SWITCH、IF、FOR、WHILE 等节点
3. **工具栏**：提供缩放、撤销/重做、保存等功能
4. **属性设置**：支持节点属性编辑
5. **快捷操作**：支持快捷键和右键菜单

## 依赖说明

### 核心依赖
- React 18.x
- Ant Design 4.x
- AntV X6 2.x 及相关插件
- Lodash

### 开发依赖
- TypeScript 5.x
- Vite 5.x
- ESLint

## 使用方式

### 作为独立组件使用

```tsx
import React from 'react';
import { LiteFlowEditor } from 'liteflow-editor-standalone';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <LiteFlowEditor />
    </div>
  );
}
```

### 获取编辑器实例

```tsx
import React, { useRef } from 'react';
import { LiteFlowEditor } from 'liteflow-editor-standalone';

function App() {
  const editorRef = useRef<any>(null);

  const handleReady = (graph) => {
    console.log('Graph ready:', graph);
  };

  const getEditorData = () => {
    const data = editorRef.current?.toJSON();
    console.log('Editor data:', data);
  };

  const setEditorData = (data) => {
    editorRef.current?.fromJSON(data);
  };

  return (
    <div>
      <LiteFlowEditor ref={editorRef} onReady={handleReady} />
      <button onClick={getEditorData}>获取数据</button>
    </div>
  );
}
```

## 构建

```bash
npm install
npm run build
```

构建完成后，会在 `dist` 目录生成以下文件：
- `index.es.js` - ES Module 格式
- `index.umd.js` - UMD 格式
- `index.d.ts` - TypeScript 类型定义

## 开发

```bash
npm install
npm run dev
```

## 与 SpringBoot 集成

要将此编辑器集成到 SpringBoot 项目中，有以下几种方案：

### 方案 1：静态资源方式

1. 构建前端项目
2. 将构建产物放入 SpringBoot 的 `static` 目录
3. 通过 SpringBoot 提供静态资源访问

### 方案 2：独立部署方式

1. 将前端项目部署到 Nginx 或其他 Web 服务器
2. 通过 SpringBoot 提供 API 接口
3. 前端通过 API 与后端交互

### 方案 3：SpringBoot Starter 方式

创建一个 SpringBoot Starter，将前端资源打包到 JAR 中，通过自动配置提供访问。

## API 接口

编辑器提供以下 API：

### LiteFlowEditor 组件

| 属性 | 类型 | 说明 |
|------|------|------|
| className | string | 样式类名 |
| onReady | (graph: Graph) => void | 图实例创建完成回调 |
| widgets | React.FC<any>[] | 自定义工具栏组件 |
| children | React.ReactNode | 子节点 |

### 编辑器实例方法

| 方法 | 说明 |
|------|------|
| getGraphInstance() | 获取图实例 |
| toJSON() | 获取编辑器数据（JSON 格式） |
| fromJSON(data) | 从 JSON 数据恢复编辑器状态 |

## 注意事项

1. 编辑器需要父容器有明确的宽度和高度
2. 建议使用 React 18.x 版本
3. 确保浏览器支持 ES2020+ 语法
