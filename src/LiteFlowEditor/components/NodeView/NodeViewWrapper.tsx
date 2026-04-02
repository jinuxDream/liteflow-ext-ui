import React from 'react';
import { Node } from '@antv/x6';
import NodeView from './index';
import { useShowParams } from '../../context/ShowParamsContext';
import styles from './NodeViewWrapper.module.less';

interface IProps {
  icon: string;
  node: Node;
  children: React.ReactNode;
}

const NodeViewWrapper: React.FC<IProps> = (props) => {
  const { showParams } = useShowParams();

  return (
    <div className={styles.nodeViewContainer}>
      <NodeView
        {...props}
        showParams={showParams}
      />
    </div>
  );
};

export default NodeViewWrapper;
