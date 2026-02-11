import React from 'react';
import { Node } from '@antv/x6';
import classNames from 'classnames';
import { Tooltip } from 'antd';

import styles from './index.module.less';

const NodeView: React.FC<{ icon: string; node: Node; children: React.ReactNode }> = (props) => {
  const { icon, children } = props;
  const { node } = props.node as any;
  let nodeId = null;
  
  try {
    const data = node.getData();
    if (data && data.model) {
      nodeId = data.model.id;
    }
  } catch (error) {
  }
  
  const nodeIdContent = nodeId ? (
    <Tooltip title={nodeId} placement="bottom">
      <div className={classNames(styles.componentType)}>{nodeId}</div>
    </Tooltip>
  ) : null;
  
  return (
    <div className={classNames(styles.liteflowShapeWrapper)}>
      <img className={styles.liteflowShapeSvg} src={icon}></img>
      { nodeIdContent }
      { children }
    </div>
  );
};

export default NodeView;
