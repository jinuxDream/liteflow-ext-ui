import React, { useState, useRef, useEffect } from 'react';
import { Tag } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import styles from './index.module.less';

interface IParam {
  fieldName: string;
  fieldType: string;
  required: boolean;
  description: string;
}

interface INodeParams {
  nodeId: string;
  nodeName: string;
  position: { x: number; y: number };
  inputParameters: IParam[];
  outputParameters: IParam[];
}

interface IProps {
  visible: boolean;
  nodesParams: INodeParams[];
  onClose: () => void;
}

const ParamsFloatingPanel: React.FC<IProps> = ({ visible, nodesParams, onClose }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && nodesParams.length > 0) {
      const firstNode = nodesParams[0];
      setPosition({
        x: firstNode.position.x + 200,
        y: firstNode.position.y
      });
    }
  }, [visible, nodesParams]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!visible || nodesParams.length === 0) return null;

  return (
    <div
      ref={panelRef}
      className={styles.paramsFloatingPanel}
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className={styles.panelHeader} onMouseDown={handleMouseDown}>
        <SettingOutlined className={styles.headerIcon} />
        <span className={styles.headerTitle}>节点参数</span>
        <span className={styles.headerCount}>({nodesParams.length})</span>
      </div>
      
      <div className={styles.panelContent}>
        {nodesParams.map((nodeParam) => (
          <div key={nodeParam.nodeId} className={styles.nodeSection}>
            <div className={styles.nodeHeader}>
              <span className={styles.nodeName}>{nodeParam.nodeName || nodeParam.nodeId}</span>
            </div>
            
            {(nodeParam.inputParameters?.length > 0 || nodeParam.outputParameters?.length > 0) && (
              <div className={styles.paramsSection}>
                <div className={`${styles.paramsSectionHeader} ${styles.paramsSectionHeaderParams}`}>
                  <SettingOutlined className={styles.paramsSectionIcon} />
                  <span className={styles.paramsSectionTitle}>参数</span>
                  <span className={styles.paramsSectionCount}>
                    ({(nodeParam.inputParameters?.length || 0) + (nodeParam.outputParameters?.length || 0)})
                  </span>
                </div>
                
                {nodeParam.inputParameters?.length > 0 && (
                  <div className={styles.paramGroup}>
                    <div className={styles.paramGroupHeader}>输入参数 ({nodeParam.inputParameters.length})</div>
                    <div className={styles.paramTable}>
                      {nodeParam.inputParameters.map((param, index) => (
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
                
                {nodeParam.outputParameters?.length > 0 && (
                  <div className={styles.paramGroup}>
                    <div className={styles.paramGroupHeader}>输出参数 ({nodeParam.outputParameters.length})</div>
                    <div className={styles.paramTable}>
                      {nodeParam.outputParameters.map((param, index) => (
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParamsFloatingPanel;