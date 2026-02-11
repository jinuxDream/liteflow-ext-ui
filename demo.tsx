import React, { useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { LiteFlowEditor } from './src';

function App() {
  const editorRef = useRef<any>(null);

  const handleReady = (graph: any) => {
    console.log('Graph ready:', graph);
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <LiteFlowEditor ref={editorRef} onReady={handleReady} />
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
