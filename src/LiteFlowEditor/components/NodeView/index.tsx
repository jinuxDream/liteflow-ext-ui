import React from 'react';
import { Node } from '@antv/x6';
import classNames from 'classnames';
import { Tooltip, Tag } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';

import styles from './index.module.less';

interface INodeViewProps {
  icon: string;
  node: Node;
  children: React.ReactNode;
  showParams: boolean;
}

const NodeView: React.FC<INodeViewProps> = (props) => {
  const { icon, children, showParams } = props;
  const { node } = props.node as any;
  
  let nodeId = null;
  let metadata = null;
  
  try {
    const data = node.getData();
    if (data && data.model) {
      nodeId = data.model.id;
      metadata = data.model.metadata;
    }
  } catch (error) {
  }
  
  const displayText = metadata?.nodeName || nodeId;
  const nodeIdContent = displayText ? (
    <Tooltip title={displayText} placement="bottom">
      <div className={classNames(styles.componentType)}>{displayText}</div>
    </Tooltip>
  ) : null;

  const renderParams = () => {
    if (!showParams || !metadata) return null;

    const inputParams = metadata.inputParameters || [];
    const outputParams = metadata.outputParameters || [];

    if (inputParams.length === 0 && outputParams.length === 0) return null;

    return (
      <div className={styles.paramsContainer}>
        {inputParams.length > 0 && (
          <div className={styles.paramsSection}>
            <div className={styles.paramsHeader}>
              <ArrowLeftOutlined className={styles.paramsIcon} />
              <span className={styles.paramsTitle}>输入</span>
            </div>
            <div className={styles.paramsList}>
              {inputParams.map((param, index) => (
                <Tooltip key={`in-${index}`} title={`${param.fieldName}: ${param.description}`}>
                  <Tag color="cyan" className={styles.paramTag}>
                    {param.fieldName}
                  </Tag>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
        {outputParams.length > 0 && (
          <div className={styles.paramsSection}>
            <div className={styles.paramsHeader}>
              <ArrowRightOutlined className={styles.paramsIcon} />
              <span className={styles.paramsTitle}>输出</span>
            </div>
            <div className={styles.paramsList}>
              {outputParams.map((param, index) => (
                <Tooltip key={`out-${index}`} title={`${param.fieldName}: ${param.description}`}>
                  <Tag color="green" className={styles.paramTag}>
                    {param.fieldName}
                  </Tag>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className={classNames(styles.liteflowShapeWrapper)}>
      <img className={styles.liteflowShapeSvg} src={icon}></img>
      { nodeIdContent }
      { renderParams() }
      { children }
    </div>
  );
};

export default NodeView;
