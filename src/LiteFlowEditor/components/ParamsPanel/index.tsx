import React, { useState, useRef, useEffect } from 'react';
import { Tag, Tooltip, Collapse } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, CloseOutlined } from '@ant-design/icons';
import styles from './index.module.less';

const { Panel } = Collapse;

interface Parameter {
  fieldName: string;
  description: string;
}

interface NodeMetadata {
  nodeId: string;
  nodeName: string;
  inputParameters: Parameter[];
  outputParameters: Parameter[];
}

interface ParamsPanelProps {
  visible: boolean;
  nodesMetadata: NodeMetadata[];
  onClose: () => void;
}

const ParamsPanel: React.FC<ParamsPanelProps> = ({ visible, nodesMetadata, onClose }) => {
  console.log('ParamsPanel render - visible:', visible, 'nodesMetadata:', nodesMetadata);
  
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  if (!visible || !nodesMetadata || nodesMetadata.length === 0) return null;

  return (
    <div
      ref={panelRef}
      className={styles.paramsPanel}
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>所有节点参数</div>
        <CloseOutlined className={styles.closeButton} onClick={onClose} />
      </div>
      <div className={styles.panelContent}>
        <Collapse defaultActiveKey={['0']} className={styles.collapse}>
          {nodesMetadata.map((nodeMetadata, nodeIndex) => {
            const inputParams = nodeMetadata.inputParameters || [];
            const outputParams = nodeMetadata.outputParameters || [];
            
            if (inputParams.length === 0 && outputParams.length === 0) {
              return null;
            }
            
            return (
              <Panel 
                header={nodeMetadata.nodeName || nodeMetadata.nodeId} 
                key={nodeIndex}
                className={styles.nodePanel}
              >
                {inputParams.length > 0 && (
                  <div className={styles.paramsSection}>
                    <div className={styles.paramsHeader}>
                      <ArrowLeftOutlined className={styles.paramsIcon} />
                      <span className={styles.paramsTitle}>输入参数</span>
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
                      <span className={styles.paramsTitle}>输出参数</span>
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
              </Panel>
            );
          })}
        </Collapse>
      </div>
    </div>
  );
};

export default ParamsPanel;
