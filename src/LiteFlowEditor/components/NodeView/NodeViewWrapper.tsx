import React from 'react';
import { Node } from '@antv/x6';
import NodeView from './index';
import { useShowParams } from '../../context/ShowParamsContext';

interface IProps {
  icon: string;
  node: Node;
  children: React.ReactNode;
}

const NodeViewWrapper: React.FC<IProps> = (props) => {
  const { showParams } = useShowParams();
  console.log('NodeViewWrapper render with showParams:', showParams);
  
  return (
    <NodeView 
      {...props} 
      showParams={showParams}
    />
  );
};

export default NodeViewWrapper;
