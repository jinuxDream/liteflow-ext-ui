import React, { useState, useRef, useEffect } from 'react';
import { Graph } from '@antv/x6';
import { Tag } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import styles from './index.module.less';

interface IParam {
  fieldName: string;
  fieldType: string;
  required: boolean;
  description: string;
}

interface IProps {
  visible: boolean;
  nodeId: string;
  nodeName: string;
  nodePosition: { x: number; y: number };
  inputParameters: IParam[];
  outputParameters: IParam[];
  onClose: () => void;
  graph?: Graph;
  initialPosition?: { x: number; y: number };
}

const NodeParamsPanel: React.FC<IProps> = ({ 
  visible, 
  nodeId, 
  nodeName, 
  nodePosition, 
  inputParameters, 
  outputParameters,
  onClose,
  graph,
  initialPosition
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [nodeViewportPosition, setNodeViewportPosition] = useState({ x: 0, y: 0 });
  const [hasInitialized, setHasInitialized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && graph) {
      const node = graph.getCellById(nodeId);
      if (node) {
        const updatePosition = () => {
          const bbox = node.getBBox();
          const center = bbox.center;
          const clientPoint = graph.localToClient(center);
          setNodeViewportPosition({
            x: clientPoint.x,
            y: clientPoint.y
          });
        };
        
        updatePosition();
        
        if (!hasInitialized) {
          if (initialPosition) {
            setPosition(initialPosition);
          } else {
            const bbox = node.getBBox();
            const center = bbox.center;
            const clientPoint = graph.localToClient(center);
            setPosition({
              x: clientPoint.x + 150,
              y: clientPoint.y - 50
            });
          }
          setHasInitialized(true);
        }
        
        const handleTransform = () => {
          updatePosition();
        };
        
        graph.on('scale', handleTransform);
        graph.on('translate', handleTransform);
        
        return () => {
          graph.off('scale', handleTransform);
          graph.off('translate', handleTransform);
        };
      }
    }
  }, [visible, nodePosition, nodeId, graph, hasInitialized, initialPosition]);

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

  if (!visible) return null;

  const hasParams = (inputParameters?.length > 0 || outputParameters?.length > 0);

  return (
    <>
      <svg 
        className={styles.connectionLine}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 9998
        }}
      >
        <line
          x1={nodeViewportPosition.x}
          y1={nodeViewportPosition.y}
          x2={position.x}
          y2={position.y + 20}
          stroke="#1890ff"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
      </svg>
      <div
        ref={panelRef}
        className={styles.nodeParamsPanel}
        style={{
          left: position.x,
          top: position.y,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className={styles.panelHeader} onMouseDown={handleMouseDown}>
          <SettingOutlined className={styles.headerIcon} />
          <span className={styles.headerTitle}>{nodeName || nodeId}</span>
          <span className={styles.closeBtn} onClick={onClose}>×</span>
        </div>
        
        {hasParams && (
          <div className={styles.panelContent}>
            <div className={styles.paramsSection}>
              <div className={`${styles.paramsSectionHeader} ${styles.paramsSectionHeaderParams}`}>
                <SettingOutlined className={styles.paramsSectionIcon} />
                <span className={styles.paramsSectionTitle}>参数</span>
                <span className={styles.paramsSectionCount}>
                  ({(inputParameters?.length || 0) + (outputParameters?.length || 0)})
                </span>
              </div>
              
              {inputParameters?.length > 0 && (
                <div className={styles.paramGroup}>
                  <div className={styles.paramGroupHeader}>输入参数 ({inputParameters.length})</div>
                  <div className={styles.paramTable}>
                    {inputParameters.map((param, index) => (
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
              
              {outputParameters?.length > 0 && (
                <div className={styles.paramGroup}>
                  <div className={styles.paramGroupHeader}>输出参数 ({outputParameters.length})</div>
                  <div className={styles.paramTable}>
                    {outputParameters.map((param, index) => (
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
        )}
        
        {!hasParams && (
          <div className={styles.panelContent}>
            <div className={styles.noParams}>该节点没有参数</div>
          </div>
        )}
      </div>
    </>
  );
};

export default NodeParamsPanel;