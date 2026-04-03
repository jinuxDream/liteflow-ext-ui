import React, { useMemo, useState, useCallback } from 'react';
import { Table, Tag, Tooltip, Collapse, Input, Select, Popover, Badge } from 'antd';
import { ArrowRightOutlined, ArrowLeftOutlined, SwapOutlined } from '@ant-design/icons';
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

// 排序类型
type SortType = 'default' | 'name' | 'dependency' | 'status';
// 筛选类型
type FilterType = 'all' | 'input' | 'process' | 'output' | 'unused' | 'required' | 'circular' | 'missing' | 'typeMismatch';

const DataFlowView: React.FC<DataFlowViewProps> = ({ nodes, onNodeClick, onFieldClick }) => {
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [sortType, setSortType] = useState<SortType>('default');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

  // 分析数据流
  const analysis: DataFlowAnalysis = useMemo(() => {
    return DataFlowAnalyzer.analyze(nodes);
  }, [nodes]);

  const { contextFields, nodeDataFlows, matrix, rowStatusMap } = analysis;

  // 高亮选中的字段
  const highlightField = (fieldName: string) => {
    setSelectedField(prev => prev === fieldName ? null : fieldName);
    onFieldClick?.(fieldName);
  };

  // 过滤和排序后的字段
  const filteredFields = useMemo(() => {
    let fields = [...contextFields];

    // 搜索过滤
    if (searchText) {
      const lower = searchText.toLowerCase();
      fields = fields.filter(f =>
        f.fieldName.toLowerCase().includes(lower) ||
        f.description?.toLowerCase().includes(lower)
      );
    }

    // 类型过滤
    switch (filterType) {
      case 'input':
        fields = fields.filter(f => f.isInput);
        break;
      case 'process':
        fields = fields.filter(f => f.isProcess);
        break;
      case 'output':
        fields = fields.filter(f => f.isOutput);
        break;
      case 'unused':
        fields = fields.filter(f => rowStatusMap.get(f.fieldName)?.isUnused);
        break;
      case 'required':
        fields = fields.filter(f => rowStatusMap.get(f.fieldName)?.isDependsOnInput);
        break;
      case 'circular':
        fields = fields.filter(f => rowStatusMap.get(f.fieldName)?.hasCircularDependency);
        break;
      case 'missing':
        fields = fields.filter(f => rowStatusMap.get(f.fieldName)?.isMissing);
        break;
      case 'typeMismatch':
        fields = fields.filter(f => rowStatusMap.get(f.fieldName)?.hasTypeMismatch);
        break;
    }

    // 排序
    switch (sortType) {
      case 'name':
        fields.sort((a, b) => a.fieldName.localeCompare(b.fieldName));
        break;
      case 'dependency':
        // 按首次使用顺序排序（入参优先，然后按依赖顺序）
        fields.sort((a, b) => {
          if (a.isInput && !b.isInput) return -1;
          if (!a.isInput && b.isInput) return 1;
          if (a.isOutput && !b.isOutput) return 1;
          if (!a.isOutput && b.isOutput) return -1;
          // 过程变量按首次写入节点排序
          const aFirst = nodeDataFlows.find(n => n.nodeId === a.firstSourceNodeId)?.nodeIndex ?? 999;
          const bFirst = nodeDataFlows.find(n => n.nodeId === b.firstSourceNodeId)?.nodeIndex ?? 999;
          return aFirst - bFirst;
        });
        break;
      case 'status':
        fields.sort((a, b) => {
          const aStatus = rowStatusMap.get(a.fieldName);
          const bStatus = rowStatusMap.get(b.fieldName);
          // 未使用的放最后
          if (aStatus?.isUnused && !bStatus?.isUnused) return 1;
          if (!aStatus?.isUnused && bStatus?.isUnused) return -1;
          // 必须的放前面
          if (aStatus?.isInputRequired && !bStatus?.isInputRequired) return -1;
          if (!aStatus?.isInputRequired && bStatus?.isInputRequired) return 1;
          return a.fieldName.localeCompare(b.fieldName);
        });
        break;
    }

    return fields;
  }, [contextFields, searchText, filterType, sortType, rowStatusMap, nodeDataFlows]);

  // 过滤后的节点列（如果选择了特定节点）
  const filteredNodeDataFlows = useMemo(() => {
    if (selectedNodes.length === 0) return nodeDataFlows;
    return nodeDataFlows.filter(n => selectedNodes.includes(n.nodeId));
  }, [nodeDataFlows, selectedNodes]);

  // 分析选中节点的影响范围
  const selectedNodeImpact = useMemo(() => {
    if (selectedNodes.length === 0) return null;
    // 只分析第一个选中的节点
    return DataFlowAnalyzer.analyzeNodeImpact(selectedNodes[0], nodeDataFlows, contextFields);
  }, [selectedNodes, nodeDataFlows, contextFields]);

  // 渲染节点影响分析面板
  const renderNodeImpact = () => {
    if (!selectedNodeImpact || selectedNodes.length === 0) return null;

    const { inputs, outputs, upstreamNodes, downstreamNodes, summary } = selectedNodeImpact;
    const selectedNode = nodeDataFlows.find(n => n.nodeId === selectedNodes[0]);

    return (
      <div className={styles.nodeImpactPanel}>
        <div className={styles.impactHeader}>
          <SwapOutlined style={{ marginRight: 6 }} />
          <span>节点影响分析</span>
          <span className={styles.nodeName}>{selectedNode?.nodeName}</span>
        </div>
        <div className={styles.impactSummary}>
          <span className={styles.summaryItem}>
            <ArrowLeftOutlined /> 上游 {summary.upstreamNodeCount} 节点
          </span>
          <span className={styles.summaryDivider}>|</span>
          <span className={styles.summaryItem}>
            <ArrowRightOutlined /> 下游 {summary.downstreamNodeCount} 节点
          </span>
        </div>

        {/* 输入参数及其来源 */}
        {inputs.length > 0 && (
          <div className={styles.impactSection}>
            <div className={styles.sectionTitle}>
              <Badge status="processing" text={`入参 ${inputs.length}`} />
            </div>
            <div className={styles.fieldList}>
              {inputs.map(input => (
                <div key={input.fieldName} className={styles.fieldItem}>
                  <span className={styles.fieldName}>{input.fieldName}</span>
                  {input.sourceNodes.length > 0 && (
                    <span className={styles.fieldMeta}>
                      ← {input.sourceNodes.map(n => n.nodeName).join(', ')}
                    </span>
                  )}
                  {input.sourceNodes.length === 0 && (
                    <span className={styles.fieldMetaWarning}>无来源</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 输出参数及其去向 */}
        {outputs.length > 0 && (
          <div className={styles.impactSection}>
            <div className={styles.sectionTitle}>
              <Badge status="success" text={`出参 ${outputs.length}`} />
            </div>
            <div className={styles.fieldList}>
              {outputs.map(output => (
                <div key={output.fieldName} className={styles.fieldItem}>
                  <span className={styles.fieldName}>{output.fieldName}</span>
                  {output.consumerNodes.length > 0 ? (
                    <span className={styles.fieldMeta}>
                      → {output.consumerNodes.map(n => n.nodeName).join(', ')}
                    </span>
                  ) : (
                    <span className={styles.fieldMetaWarning}>未消费</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 上游节点 */}
        {upstreamNodes.length > 0 && (
          <div className={styles.impactSection}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>⬆️</span>
              上游节点 {upstreamNodes.length}
            </div>
            <div className={styles.nodeList}>
              {upstreamNodes.map(node => (
                <Tag key={node.nodeId} color="blue" className={styles.nodeTag}>
                  {node.nodeIndex}. {node.nodeName}
                  <span className={styles.nodeFieldCount}>({node.providedFields.length})</span>
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* 下游节点 */}
        {downstreamNodes.length > 0 && (
          <div className={styles.impactSection}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>⬇️</span>
              下游节点 {downstreamNodes.length}
            </div>
            <div className={styles.nodeList}>
              {downstreamNodes.map(node => (
                <Tag key={node.nodeId} color="green" className={styles.nodeTag}>
                  {node.nodeIndex}. {node.nodeName}
                  <span className={styles.nodeFieldCount}>({node.consumedFields.length})</span>
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    );
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
        title: '上下文',
        dataIndex: 'fieldName',
        key: 'fieldName',
        fixed: 'left' as const,
        width: 140,
        render: (text: string, record: ContextField) => {
          // 判断字段类型：入参 > 过程 > 出参
          let tagColor = 'cyan';
          let tagText = '过程';

          if (record.isInput) {
            tagColor = 'purple';
            tagText = '入参';
          } else if (record.isOutput) {
            tagColor = 'green';
            tagText = '出参';
          }

          // 获取行状态
          const rowStatus = rowStatusMap.get(record.fieldName);
          const isUnused = rowStatus?.isUnused || false;
          const isDependsOnInput = rowStatus?.isDependsOnInput || false;
          const isInputRequired = rowStatus?.isInputRequired || false;
          const hasCircular = rowStatus?.hasCircularDependency || false;
          const isMissing = rowStatus?.isMissing || false;
          const hasTypeMismatch = rowStatus?.hasTypeMismatch || false;

          // 增强tooltip，包含检测信息（统一格式）
          const warnings: JSX.Element[] = [];

          // 问题状态（红色）
          if (isMissing) {
            warnings.push(
              <div key="missing" style={{ color: '#ff4d4f', marginTop: 4 }}>
                ❌ 缺失字段: 被 {rowStatus?.missingInNodes?.map(id => nodeDataFlows.find(n => n.nodeId === id)?.nodeName || id).join(', ')} 读取但无提供者
              </div>
            );
          }
          if (isDependsOnInput && isInputRequired) {
            warnings.push(
              <div key="required" style={{ color: '#ff4d4f', marginTop: 4 }}>
                🔴 必须入参: 此字段依赖接口入参，入参缺失会导致流程失败
              </div>
            );
          }

          // 警告状态（橙色）
          if (hasTypeMismatch) {
            warnings.push(
              <div key="typeMismatch" style={{ color: '#fa8c16', marginTop: 4 }}>
                📝 类型不匹配:
                {rowStatus?.typeMismatchDetails?.map(d => (
                  <div key={`${d.writeNodeId}-${d.readNodeId}`} style={{ marginLeft: 8 }}>
                    {nodeDataFlows.find(n => n.nodeId === d.writeNodeId)?.nodeName}({d.writeNodeType}) → {nodeDataFlows.find(n => n.nodeId === d.readNodeId)?.nodeName}({d.readNodeType})
                  </div>
                ))}
              </div>
            );
          }

          // 提示状态（黄色/紫色）
          if (isDependsOnInput && !isInputRequired) {
            warnings.push(
              <div key="optional" style={{ color: '#faad14', marginTop: 4 }}>
                ⚠️ 可选入参: 此字段依赖接口入参，入参可选
              </div>
            );
          }
          if (isUnused) {
            warnings.push(
              <div key="unused" style={{ color: '#faad14', marginTop: 4 }}>
                ⚠️ 未消费: 此字段被写入但未被任何节点读取
              </div>
            );
          }
          if (hasCircular) {
            warnings.push(
              <div key="circular" style={{ color: '#722ed1', marginTop: 4 }}>
                🔄 循环依赖: 涉及节点 {rowStatus?.circularDependencyNodes?.join(', ')}
              </div>
            );
          }

          const tooltipContent = (
            <div>
              <div><strong>{record.fieldName}</strong></div>
              <div>类型: {record.fieldType}</div>
              {record.description && <div>描述: {record.description}</div>}
              {record.firstSourceNodeId && (
                <div>来源: {nodeDataFlows.find(n => n.nodeId === record.firstSourceNodeId)?.nodeName || record.firstSourceNodeId}</div>
              )}
              {record.consumerNodeIds.length > 0 && (
                <div>消费: {record.consumerNodeIds.map(id => nodeDataFlows.find(n => n.nodeId === id)?.nodeName || id).join(', ')}</div>
              )}
              {warnings}
            </div>
          );

          // 检测状态图标（统一顺序：问题 > 警告 > 提示）
          const warningIcons = [];
          if (isMissing) warningIcons.push('❌');
          if (isDependsOnInput && isInputRequired) warningIcons.push('🔴');
          if (hasTypeMismatch) warningIcons.push('📝');
          if (isDependsOnInput && !isInputRequired) warningIcons.push('⚠️');
          if (isUnused) warningIcons.push('⚠️');
          if (hasCircular) warningIcons.push('🔄');

          return (
            <Tooltip title={tooltipContent}>
              <div
                className={`${styles.fieldNameCell} ${selectedField === text ? styles.selected : ''}`}
                onClick={() => highlightField(text)}
              >
                <Tag color={tagColor} style={{ marginRight: 4 }}>{tagText}</Tag>
                <span className={isUnused ? styles.deletedText : ''}>{text}</span>
                {warningIcons.length > 0 && (
                  <span style={{ marginLeft: 4, fontSize: 10 }}>{warningIcons.slice(0, 2).join('')}</span>
                )}
              </div>
            </Tooltip>
          );
        },
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        fixed: 'left' as const,
        width: 150,
        render: (text: string, record: ContextField) => {
          // 获取行状态
          const rowStatus = rowStatusMap.get(record.fieldName);
          const isUnused = rowStatus?.isUnused || false;

          return (
            <div className={styles.descriptionCell}>
              <span className={isUnused ? styles.deletedText : ''}>
                {record.description || '-'}
              </span>
            </div>
          );
        },
      },
      ...filteredNodeDataFlows.map(node => ({
        title: (
          <Tooltip title={`节点ID: ${node.nodeId}`}>
            <div
              className={styles.nodeHeader}
              onClick={() => onNodeClick?.(node.nodeId)}
            >
              <span className={styles.nodeIndex}>{node.nodeIndex}</span>
              <span className={styles.nodeName}>{node.nodeName}</span>
            </div>
          </Tooltip>
        ),
        dataIndex: node.nodeId,
        key: node.nodeId,
        width: 100,
        minWidth: 100,
        align: 'center' as const,
        render: (_: any, record: ContextField) => {
          const cell = matrix.cells.get(`${record.fieldName}:${node.nodeId}`);
          return renderMatrixCell(cell);
        },
      })),
    ];

    // 计算每行的 className
    const getRowClassName = (record: ContextField): string => {
      const classes = [styles.matrixRow];

      // 选中状态
      if (selectedField === record.fieldName) {
        classes.push(styles.highlightRow);
      }

      // 获取行状态
      const rowStatus = rowStatusMap.get(record.fieldName);

      if (rowStatus) {
        // 优先显示问题状态（红色 > 黄色）
        // 缺失字段 -> 红色背景（最高优先级）
        if (rowStatus.isMissing) {
          classes.push(styles.rowMissing);
        }
        // 循环依赖 -> 紫色背景
        else if (rowStatus.hasCircularDependency) {
          classes.push(styles.rowCircular);
        }
        // 类型不匹配 -> 橙色背景
        else if (rowStatus.hasTypeMismatch) {
          classes.push(styles.rowTypeMismatch);
        }
        // 依赖入参且入参必须 -> 红色背景
        else if (rowStatus.isDependsOnInput && rowStatus.isInputRequired) {
          classes.push(styles.rowRequired);
        }
        // 依赖入参但入参可选 -> 黄色背景
        else if (rowStatus.isDependsOnInput && !rowStatus.isInputRequired) {
          classes.push(styles.rowOptional);
        }
        // 未被消费 -> 黄色背景
        else if (rowStatus.isUnused) {
          classes.push(styles.rowUnused);
        }
      }

      return classes.join(' ');
    };

    return (
      <div className={styles.matrixContainer}>
        <Table
          dataSource={filteredFields}
          columns={columns}
          rowKey="fieldName"
          pagination={false}
          size="small"
          className={styles.matrixTable}
          rowClassName={getRowClassName}
        />
      </div>
    );
  };

  // 渲染字段流转图例
  const renderLegend = () => (
    <div className={styles.legend}>
      {/* 单元格类型 */}
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
        <span className={`${styles.cellBase} ${styles.cellReadWrite}`}>R/W</span>
        <span>既读又写</span>
      </span>
      {/* 字段类型 */}
      <span className={styles.legendDivider}>|</span>
      <span className={styles.legendItem}>
        <Tag color="purple" style={{ margin: 0 }}>入参</Tag>
        <span>接口输入</span>
      </span>
      <span className={styles.legendItem}>
        <Tag color="cyan" style={{ margin: 0 }}>过程</Tag>
        <span>中间流转</span>
      </span>
      <span className={styles.legendItem}>
        <Tag color="green" style={{ margin: 0 }}>出参</Tag>
        <span>最终输出</span>
      </span>
      {/* 问题状态 */}
      <span className={styles.legendDivider}>|</span>
      <span className={styles.legendItem}>
        <span className={styles.legendColorBox} style={{ background: '#fff1f0', borderColor: '#ff4d4f' }}></span>
        <span>❌ 缺失/必须</span>
      </span>
      <span className={styles.legendItem}>
        <span className={styles.legendColorBox} style={{ background: '#fff7e6', borderColor: '#fa8c16' }}></span>
        <span>📝 类型不匹配</span>
      </span>
      <span className={styles.legendItem}>
        <span className={styles.legendColorBox} style={{ background: '#fffbe6', borderColor: '#faad14' }}></span>
        <span>⚠️ 可选/未消费</span>
      </span>
      <span className={styles.legendItem}>
        <span className={styles.legendColorBox} style={{ background: '#f9f0ff', borderColor: '#722ed1' }}></span>
        <span>🔄 循环依赖</span>
      </span>
    </div>
  );

  // 渲染工具栏
  const renderToolbar = () => {
    const nodeOptions = nodeDataFlows
      .filter(n => n.nodeId !== 'interface-input' && n.nodeId !== 'interface-output')
      .map(n => ({
        label: `${n.nodeIndex}. ${n.nodeName}`,
        value: n.nodeId,
      }));

    return (
      <div className={styles.toolbar}>
        <Input.Search
          placeholder="搜索字段"
          allowClear
          size="small"
          style={{ width: 140 }}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        <Select
          size="small"
          style={{ width: 120 }}
          value={filterType}
          onChange={setFilterType}
          options={[
            { label: '📋 全部', value: 'all' },
            { label: '🟣 入参', value: 'input' },
            { label: '🔵 过程', value: 'process' },
            { label: '🟢 出参', value: 'output' },
            { label: '⚠️ 未消费', value: 'unused' },
            { label: '🔴 必须', value: 'required' },
            { label: '🔄 循环', value: 'circular' },
            { label: '❌ 缺失', value: 'missing' },
            { label: '📝 类型', value: 'typeMismatch' },
          ]}
        />
        <Select
          size="small"
          style={{ width: 100 }}
          value={sortType}
          onChange={setSortType}
          options={[
            { label: '默认', value: 'default' },
            { label: '名称', value: 'name' },
            { label: '依赖', value: 'dependency' },
            { label: '状态', value: 'status' },
          ]}
        />
        {nodeOptions.length > 0 && (
          <Select
            mode="multiple"
            size="small"
            style={{ minWidth: 120, maxWidth: 200 }}
            placeholder="筛选节点"
            allowClear
            value={selectedNodes}
            onChange={setSelectedNodes}
            options={nodeOptions}
            maxTagCount={1}
            maxTagPlaceholder={(omitted) => `+${omitted.length}`}
          />
        )}
        <span className={styles.fieldCount}>
          {filteredFields.length}/{contextFields.length}
        </span>
      </div>
    );
  };

  return (
    <div className={styles.dataFlowView}>
      {renderToolbar()}
      {renderNodeImpact()}
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
