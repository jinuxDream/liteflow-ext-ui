import React from 'react';
import { Node } from '@antv/x6';
import classNames from 'classnames';
import { Tooltip, Tag } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

import styles from './index.module.less';

interface INodeViewProps {
  icon: string;
  node: Node;
  children: React.ReactNode;
  showParams: boolean;
}

const NodeView: React.FC<INodeViewProps> = (props) => {
  const { icon, children, showParams: contextShowParams } = props;
  const { node } = props.node as any;
  
  let nodeId = null;
  let metadata = null;
  let nodeShowParams = contextShowParams;
  
  try {
    const data = node.getData();
    console.log('NodeView - node data:', data);
    if (data && data.model) {
      nodeId = data.model.id;
      metadata = data.model.metadata;
      console.log('NodeView - metadata:', metadata);
      console.log('NodeView - inputParameters:', metadata?.inputParameters);
      console.log('NodeView - outputParameters:', metadata?.outputParameters);
    }
    
    const showParamsProp = node.getProp('showParams');
    if (showParamsProp !== undefined) {
      nodeShowParams = showParamsProp;
      console.log('NodeView - nodeShowParams from prop:', nodeShowParams);
    } else if (data && data._showParams !== undefined) {
      nodeShowParams = data._showParams;
      console.log('NodeView - nodeShowParams from data._showParams:', nodeShowParams);
    }
  } catch (error) {
    console.error('NodeView - error:', error);
  }
  
  console.log('NodeView render - showParams:', nodeShowParams);
  
  const displayText = metadata?.nodeName || nodeId;
  const nodeIdContent = displayText ? (
    <Tooltip title={displayText} placement="bottom">
      <div className={classNames(styles.componentType)}>{displayText}</div>
    </Tooltip>
  ) : null;

  const renderParams = () => {
    console.log('renderParams called - showParams:', nodeShowParams, 'metadata:', !!metadata);
    
    if (!nodeShowParams || !metadata) {
      console.log('renderParams returning null - showParams:', nodeShowParams, 'metadata:', !!metadata);
      return null;
    }

    const inputParams = metadata.inputParameters || [];
    const outputParams = metadata.outputParameters || [];

    console.log('renderParams - inputParams length:', inputParams.length, 'outputParams length:', outputParams.length);

    if (inputParams.length === 0 && outputParams.length === 0) {
      console.log('renderParams returning null - no params');
      return null;
    }

    console.log('renderParams returning params container');
    return (
      <div className={styles.paramsContainer}>
        <div className={styles.paramsSection}>
          <div className={`${styles.paramsSectionHeader} ${styles.paramsSectionHeaderParams}`}>
            <SettingOutlined className={styles.paramsSectionIcon} />
            <span className={styles.paramsSectionTitle}>参数</span>
            <span className={styles.paramsSectionCount}>
              ({(inputParams?.length || 0) + (outputParams?.length || 0)})
            </span>
          </div>
          
          {inputParams.length > 0 && (
            <div className={styles.paramGroup}>
              <div className={styles.paramGroupHeader}>输入参数 ({inputParams.length})</div>
              <div className={styles.paramTable}>
                {inputParams.map((param, index) => (
                  <div key={`input-${index}`} className={styles.paramRow}>
                    <div className={styles.paramDirection}>
                      <Tag color="blue" className={styles.directionTag}>输入</Tag>
                    </div>
                    <div className={styles.paramName}>{param.fieldName}</div>
                    <div className={styles.paramType}>
                      <Tag color="cyan" className={styles.typeTag}>{param.fieldType}</Tag>
                    </div>
                    <div className={styles.paramRequired}>
                      <Tag color={param.required ? 'red' : 'default'} className={styles.reqTag}>
                        {param.required ? '必填' : '可选'}
                      </Tag>
                    </div>
                    <div className={styles.paramDesc}>{param.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {outputParams.length > 0 && (
            <div className={styles.paramGroup}>
              <div className={styles.paramGroupHeader}>输出参数 ({outputParams.length})</div>
              <div className={styles.paramTable}>
                {outputParams.map((param, index) => (
                  <div key={`output-${index}`} className={styles.paramRow}>
                    <div className={styles.paramDirection}>
                      <Tag color="green" className={styles.directionTag}>输出</Tag>
                    </div>
                    <div className={styles.paramName}>{param.fieldName}</div>
                    <div className={styles.paramType}>
                      <Tag color="cyan" className={styles.typeTag}>{param.fieldType}</Tag>
                    </div>
                    <div className={styles.paramRequired}>
                      <Tag color={param.required ? 'red' : 'default'} className={styles.reqTag}>
                        {param.required ? '必填' : '可选'}
                      </Tag>
                    </div>
                    <div className={styles.paramDesc}>{param.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className={classNames(styles.liteflowShapeWrapper)}>
      <img className={styles.liteflowShapeSvg} src={icon}></img>
      { nodeIdContent }
      { children }
    </div>
  );
};

export default NodeView;
