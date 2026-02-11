# LiteFlow Editor Standalone

LiteFlow 可视化编辑器独立版本，可以作为一个 React 组件在项目中使用。

## 安装

```bash
npm install liteflow-editor-standalone
```

## 使用

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

export default App;
```

## API

### LiteFlowEditor

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| className | 样式类名 | string | - |
| onReady | 图实例创建完成回调 | (graph: Graph) => void | - |
| widgets | 自定义工具栏组件 | React.FC<any>[] | - |
| children | 子节点 | React.ReactNode | - |

## 构建

```bash
npm install
npm run build
```

## 开发

```bash
npm install
npm run dev
```
