import React from 'react';
import { LiteFlowEditor } from '@liteflow-editor';
// import ChainManager from './components/ChainManager'
import './index.less';

// const ChainManagerWrapper = () => <ChainManager showActions={false} />;

const App: React.FC<any> = () => {
return (
    <div className='liteflow-editor-demo-wrapper'>
      <LiteFlowEditor
        widgets={[]}
        showSideBar={false}
      />
    </div>
  )};

export default App;
