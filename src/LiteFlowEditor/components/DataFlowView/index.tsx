import React, { useMemo, useState } from 'react';
import { Table, Tag, Tooltip, Collapse } from 'antd';
import { DataFlowAnalyzer, DataFlowAnalysis, ContextField, MatrixCell } from '../../utils/DataFlowAnalyzer';
import styles from './index.module.less';

interface DataFlowViewProps {
  nodes: Array<{
    id: string;
    name: string;
    inputParams?: any[];
    outputParams?: any[];
  }>;
  onNodeClick?: (nodeId: string) => void;
  onFieldClick?: (fieldName: string) => void;
}

const DataFlowView: React.FC<DataFlowViewProps> = ({ nodes, onNodeClick, onFieldClick }) => {
  const [selectedField, setSelectedField] = useState<string | null>(null);

  // 分析数据流
  const analysis: DataFlowAnalysis = useMemo(() => {
    return DataFlowAnalyzer.analyze(nodes);
  }, [nodes]);

  const { contextFields, nodeDataFlows, matrix } = analysis;

  // 高亮选中的字段
  const highlightField = (fieldName: string) => {
    setSelectedField(prev => prev === fieldName ? null : fieldName);
    onFieldClick?.(fieldName);
  };

  // 渲染矩阵单元格
  const renderMatrixCell = (cell: MatrixCell | undefined) => {
    if (!cell || (!cell.isRead && !cell.isWrite)) {
      return <span className={styles.cellEmpty}>-</span>;
    }

    let className = styles.cellBase;
    let content = '';

    if (cell.isWrite && cell.isRead) {
      className = `${styles.cellBase} ${styles.cellReadWrite}`;
      content = 'R/W';
    } else if (cell.isWrite) {
      className = `${styles.cellBase} ${cell.isFirstWrite ? styles.cellFirstWrite : styles.cellWrite}`;
      content = cell.isFirstWrite ? 'W✨' : 'W';
    } else if (cell.isRead) {
      className = `${styles.cellBase} ${styles.cellRead}`;
      content = 'R';
    }

    return (
      <Tooltip
        title={
          <div>
            <div>字段: {cell.fieldName}</div>
            <div>节点: {nodeDataFlows.find(n => n.nodeId === cell.nodeId)?.nodeName}</div>
            <div>操作: {content}</div>
          </div>
        }
      >
        <span className={className}>{content}</span>
      </Tooltip>
    );
  };

  // 渲染矩阵视图
  const renderMatrix = () => {
    if (contextFields.length === 0 || nodeDataFlows.length === 0) {
      return <div className={styles.emptyText}>暂无数据</div>;
    }

    // 生成表头
    const columns = [
      {
        title: '字段',
        dataIndex: 'fieldName',
        key: 'fieldName',
        fixed: 'left' as const,
        width: 120,
        render: (text: string, record: ContextField) => (
          <div
            className={`${styles.fieldNameCell} ${selectedField === text ? styles.selected : ''}`}
            onClick={() => highlightField(text)}
          >
            {record.firstSourceNodeId === null ? (
              <Tag color="purple" style={{ marginRight: 4 }}>入</Tag>
            ) : (
              <Tag color="green" style={{ marginRight: 4 }}>出</Tag>
            )}
            <span>{text}</span>
          </div>
        ),
      },
      ...nodeDataFlows.map(node => ({
        title: (
          <div
            className={styles.nodeHeader}
            onClick={() => onNodeClick?.(node.nodeId)}
          >
            <span className={styles.nodeIndex}>{node.nodeIndex}</span>
            <span className={styles.nodeName}>{node.nodeName}</span>
          </div>
        ),
        dataIndex: node.nodeId,
        key: node.nodeId,
        width: 80,
        align: 'center' as const,
        render: (_: any, record: ContextField) => {
          const cell = matrix.cells.get(`${record.fieldName}:${node.nodeId}`);
          return renderMatrixCell(cell);
        },
      })),
    ];

    return (
      <div className={styles.matrixContainer}>
        <Table
          dataSource={contextFields}
          columns={columns}
          rowKey="fieldName"
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          className={styles.matrixTable}
          rowClassName={(record) => selectedField === record.fieldName ? styles.highlightRow : ''}
        />
      </div>
    );
  };

  // 渲染字段流转图例
  const renderLegend = () => (
    <div className={styles.legend}>
      <span className={styles.legendItem}>
        <span className={`${styles.cellBase} ${styles.cellRead}`}>R</span>
        <span>读取</span>
      </span>
      <span className={styles.legendItem}>
        <span className={`${styles.cellBase} ${styles.cellWrite}`}>W</span>
        <span>写入</span>
      </span>
      <span className={styles.legendItem}>
        <span className={`${styles.cellBase} ${styles.cellFirstWrite}`}>W✨</span>
        <span>首次写入</span>
      </span>
      <span className={styles.legendItem}>
        <Tag color="purple" style={{ margin: 0 }}>入</Tag>
        <span>接口输入</span>
      </span>
    </div>
  );

  return (
    <div className={styles.dataFlowView}>
      <div className={styles.mainContent}>
        {renderMatrix()}
      </div>
      <Collapse
        defaultActiveKey={['legend']}
        ghost
        className={styles.legendCollapse}
      >
        <Collapse.Panel header="图例说明" key="legend">
          {renderLegend()}
        </Collapse.Panel>
      </Collapse>
    </div>
  );
};

export default DataFlowView;
