import React, { useState, useMemo, useCallback } from 'react';
import { Tag, Badge, Input, Empty, Card } from 'antd';
import { SearchOutlined, EditOutlined, EyeOutlined, SwapOutlined, ClusterOutlined, TableOutlined } from '@ant-design/icons';
import { LineageAnalyzer, LineageGraph, FieldNode } from '../../utils/LineageAnalyzer';
import styles from './index.module.less';

type ViewType = 'field' | 'node' | 'context';

interface DataLineageGraphProps {
  nodes: Array<{
    id: string;
    name: string;
    inputParams?: any[];
    outputParams?: any[];
  }>;
  onNodeClick?: (nodeId: string) => void;
}

const DataLineageGraph: React.FC<DataLineageGraphProps> = ({ nodes, onNodeClick }) => {
  const [viewType, setViewType] = useState<ViewType>('node');

  // 字段血缘状态
  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<FieldNode | null>(null);
  const [searchText, setSearchText] = useState('');

  // 节点血缘状态
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeSearchText, setNodeSearchText] = useState('');

  // 上下文血缘状态
  const [selectedContextForLineage, setSelectedContextForLineage] = useState<string | null>(null);
  const [selectedFieldInContext, setSelectedFieldInContext] = useState<FieldNode | null>(null);

  // 分析血缘
  const lineageGraph: LineageGraph = useMemo(() => {
    return LineageAnalyzer.analyze(nodes);
  }, [nodes]);

  // 按上下文分组字段
  const contextGroups = useMemo(() => {
    const groups: Record<string, FieldNode[]> = {};
    lineageGraph.fieldNodeList.forEach(field => {
      if (!groups[field.contextName]) {
        groups[field.contextName] = [];
      }
      groups[field.contextName].push(field);
    });
    return groups;
  }, [lineageGraph]);

  // 所有上下文列表
  const contexts = useMemo(() => {
    return Object.keys(contextGroups).sort();
  }, [contextGroups]);

  // 节点列表（排除接口虚拟节点，过滤无数据节点）
  const nodeList = useMemo(() => {
    return lineageGraph.nodeInfos
      .filter(n => {
        // 排除接口虚拟节点
        if (n.nodeId === 'interface-input' || n.nodeId === 'interface-output') return false;
        // 过滤无数据节点：没有名称且没有输入输出参数
        const hasData = n.nodeName || n.inputParams.length > 0 || n.outputParams.length > 0;
        return hasData;
      })
      .sort((a, b) => a.nodeIndex - b.nodeIndex)
      .map(n => ({
        ...n,
        // 格式化显示名称
        displayName: n.nodeName || n.nodeId.slice(0, 8),
        // 格式化序号
        displayIndex: n.nodeIndex >= 900 ? '-' : n.nodeIndex,
      }));
  }, [lineageGraph]);

  // 节点映射
  const nodeMap = useMemo(() => {
    const map: Record<string, { name: string; index: number }> = {};
    lineageGraph.nodeInfos.forEach(n => {
      map[n.nodeId] = { name: n.nodeName, index: n.nodeIndex };
    });
    return map;
  }, [lineageGraph]);

  // 字段映射
  const fieldMap = lineageGraph.fieldNodes;

  // 过滤上下文
  const filteredContexts = useMemo(() => {
    if (!searchText) return contexts;
    const lower = searchText.toLowerCase();
    return contexts.filter(ctx =>
      ctx.toLowerCase().includes(lower) ||
      contextGroups[ctx].some(f => f.fieldName.toLowerCase().includes(lower))
    );
  }, [contexts, searchText, contextGroups]);

  // 当前选中上下文的字段列表
  const currentFields = useMemo(() => {
    if (!selectedContext) return [];
    return contextGroups[selectedContext] || [];
  }, [selectedContext, contextGroups]);

  // 过滤节点
  const filteredNodes = useMemo(() => {
    if (!nodeSearchText) return nodeList;
    const lower = nodeSearchText.toLowerCase();
    return nodeList.filter(n =>
      n.nodeName.toLowerCase().includes(lower) ||
      n.nodeId.toLowerCase().includes(lower)
    );
  }, [nodeList, nodeSearchText]);

  // 选中节点的信息
  const selectedNodeInfo = useMemo(() => {
    if (!selectedNodeId) return null;
    return lineageGraph.nodeInfos.find(n => n.nodeId === selectedNodeId);
  }, [selectedNodeId, lineageGraph]);

  // 获取来源节点信息
  const getSourceNodes = useCallback((field: FieldNode) => {
    return field.sourceNodeIds
      .filter(id => id !== 'interface-input')
      .map(id => {
        const nodeInfo = nodeMap[id];
        return { id, name: nodeInfo?.name || id, index: nodeInfo?.index || 999 };
      })
      .sort((a, b) => a.index - b.index);
  }, [nodeMap]);

  // 获取消费节点信息
  const getConsumerNodes = useCallback((field: FieldNode) => {
    return field.consumerNodeIds
      .filter(id => id !== 'interface-output')
      .map(id => {
        const nodeInfo = nodeMap[id];
        return { id, name: nodeInfo?.name || id, index: nodeInfo?.index || 999 };
      })
      .sort((a, b) => a.index - b.index);
  }, [nodeMap]);

  // 是否为接口入参
  const isInterfaceInput = useCallback((field: FieldNode) => {
    return field.sourceNodeIds.includes('interface-input');
  }, []);

  // 是否为接口出参
  const isInterfaceOutput = useCallback((field: FieldNode) => {
    return field.consumerNodeIds.includes('interface-output');
  }, []);

  // 渲染字段状态
  const renderFieldStatus = (field: FieldNode) => {
    if (field.status === 'normal') return null;
    const statusMap: Record<string, { color: string; text: string }> = {
      missing: { color: '#ff4d4f', text: '缺失' },
      unused: { color: '#faad14', text: '未消费' },
      circular: { color: '#722ed1', text: '循环' },
    };
    const config = statusMap[field.status];
    if (!config) return null;
    return <Tag color={config.color} style={{ fontSize: 10, marginLeft: 4 }}>{config.text}</Tag>;
  };

  // ==================== 字段血缘视图 ====================

  const renderFieldLineage = () => {
    return (
      <div className={styles.threeColumnLayout}>
        {/* 第一栏：上下文列表 */}
        <div className={styles.contextPanel}>
          <div className={styles.panelHeader}>
            <span>上下文</span>
            <span className={styles.count}>{contexts.length}</span>
          </div>
          <div className={styles.searchBox}>
            <Input
              placeholder="筛选..."
              prefix={<SearchOutlined />}
              size="small"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
            />
          </div>
          <div className={styles.panelList}>
            {filteredContexts.map(ctx => {
              const fields = contextGroups[ctx];
              const isSelected = selectedContext === ctx;
              return (
                <div
                  key={ctx}
                  className={`${styles.listItem} ${isSelected ? styles.selected : ''}`}
                  onClick={() => {
                    setSelectedContext(ctx);
                    setSelectedField(null);
                  }}
                >
                  <span className={styles.itemName}>{ctx}</span>
                  <span className={styles.itemCount}>{fields.length}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 第二栏：字段列表 */}
        <div className={styles.fieldPanel}>
          <div className={styles.panelHeader}>
            <span>{selectedContext || '字段'}</span>
            <span className={styles.count}>{currentFields.length}</span>
          </div>
          <div className={styles.panelList}>
            {selectedContext ? (
              currentFields.map(field => (
                <div
                  key={field.fieldName}
                  className={`${styles.listItem} ${selectedField?.fieldName === field.fieldName ? styles.selected : ''}`}
                  onClick={() => setSelectedField(field)}
                >
                  <Tag
                    color={field.fieldRole === 'input' ? 'purple' : field.fieldRole === 'output' ? 'green' : 'blue'}
                    style={{ fontSize: 10 }}
                  >
                    {field.fieldRole === 'input' ? '入' : field.fieldRole === 'output' ? '出' : '过'}
                  </Tag>
                  <span className={styles.itemName}>{field.fieldName}</span>
                  {renderFieldStatus(field)}
                </div>
              ))
            ) : (
              <div className={styles.emptyPanel}>
                <Empty description="选择上下文" />
              </div>
            )}
          </div>
        </div>

        {/* 第三栏：血缘详情 */}
        <div className={styles.detailPanel}>
          {renderFieldDetail()}
        </div>
      </div>
    );
  };

  const renderFieldDetail = () => {
    if (!selectedField) {
      return (
        <div className={styles.emptyDetail}>
          <Empty description="点击字段查看血缘关系" />
        </div>
      );
    }

    const sourceNodes = getSourceNodes(selectedField);
    const consumerNodes = getConsumerNodes(selectedField);
    const isInput = isInterfaceInput(selectedField);
    const isOutput = isInterfaceOutput(selectedField);

    return (
      <div className={styles.detailContent}>
        <Card className={styles.fieldCard} bordered={false}>
          <div className={styles.fieldHeader}>
            <span className={styles.fieldTitle}>{selectedField.fieldName}</span>
            <Tag color={selectedField.fieldRole === 'input' ? 'purple' : selectedField.fieldRole === 'output' ? 'green' : 'blue'}>
              {selectedField.fieldRole === 'input' ? '入参' : selectedField.fieldRole === 'output' ? '出参' : '过程'}
            </Tag>
          </div>
          <div className={styles.fieldMeta}>
            <span className={styles.fieldType}>{selectedField.fieldType}</span>
            <span className={styles.fieldContext}>{selectedField.contextName}</span>
          </div>
          {selectedField.description && (
            <div className={styles.fieldDescription}>{selectedField.description}</div>
          )}
        </Card>

        {/* 来源节点 */}
        <div className={styles.lineageRow}>
          <span className={styles.lineageRowLabel}>写</span>
          <div className={styles.lineageRowContent}>
            {isInput && <Tag color="purple" style={{ fontSize: 10 }}>接口入参</Tag>}
            {sourceNodes.map(node => (
              <span
                key={node.id}
                className={styles.nodeTagWrite}
                onClick={() => onNodeClick?.(node.id)}
              >
                <span className={styles.nodeIndex}>{node.index}</span>
                {node.name}
              </span>
            ))}
            {!isInput && sourceNodes.length === 0 && <span className={styles.flowEmpty}>无</span>}
          </div>
        </div>

        {/* 消费节点 */}
        <div className={styles.lineageRow}>
          <span className={styles.lineageRowLabel}>读</span>
          <div className={styles.lineageRowContent}>
            {isOutput && <Tag color="green" style={{ fontSize: 10 }}>接口出参</Tag>}
            {consumerNodes.map(node => (
              <span
                key={node.id}
                className={styles.nodeTagRead}
                onClick={() => onNodeClick?.(node.id)}
              >
                <span className={styles.nodeIndex}>{node.index}</span>
                {node.name}
              </span>
            ))}
            {!isOutput && consumerNodes.length === 0 && <span className={styles.flowEmpty}>无</span>}
          </div>
        </div>
      </div>
    );
  };

  // ==================== 节点血缘视图 ====================

  const renderNodeLineage = () => {
    return (
      <div className={styles.twoColumnLayout}>
        {/* 左侧：节点列表 */}
        <div className={styles.nodeListPanel}>
          <div className={styles.panelHeader}>
            <span>节点</span>
            <span className={styles.count}>{nodeList.length}</span>
          </div>
          <div className={styles.searchBox}>
            <Input
              placeholder="搜索节点..."
              prefix={<SearchOutlined />}
              size="small"
              value={nodeSearchText}
              onChange={e => setNodeSearchText(e.target.value)}
              allowClear
            />
          </div>
          <div className={styles.panelList}>
            {filteredNodes.map(node => {
              const isSelected = selectedNodeId === node.nodeId;
              return (
                <div
                  key={node.nodeId}
                  className={`${styles.listItem} ${isSelected ? styles.selected : ''}`}
                  onClick={() => setSelectedNodeId(node.nodeId)}
                >
                  {node.displayIndex !== '-' && (
                    <Badge count={node.displayIndex} style={{ backgroundColor: '#1890ff' }} />
                  )}
                  <span className={styles.itemName}>{node.displayName}</span>
                  {!node.nodeName && (
                    <Tag color="default" style={{ fontSize: 10 }}>未命名</Tag>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 右侧：节点详情 */}
        <div className={styles.detailPanel}>
          {renderNodeDetail()}
        </div>
      </div>
    );
  };

  const renderNodeDetail = () => {
    if (!selectedNodeInfo) {
      return (
        <div className={styles.emptyDetail}>
          <Empty description="点击节点查看血缘关系" />
        </div>
      );
    }

    const inputParams = selectedNodeInfo.inputParams;
    const outputParams = selectedNodeInfo.outputParams;

    // 统计上下游节点
    const upstreamNodes = new Set<string>();
    const downstreamNodes = new Set<string>();

    inputParams.forEach(param => {
      const field = fieldMap.get(param.fieldName);
      if (field) {
        field.sourceNodeIds.forEach(id => {
          if (id !== 'interface-input' && id !== selectedNodeInfo.nodeId) {
            upstreamNodes.add(id);
          }
        });
      }
    });

    outputParams.forEach(param => {
      const field = fieldMap.get(param.fieldName);
      if (field) {
        field.consumerNodeIds.forEach(id => {
          if (id !== 'interface-output' && id !== selectedNodeInfo.nodeId) {
            downstreamNodes.add(id);
          }
        });
      }
    });

    return (
      <div className={styles.detailContent}>
        {/* 节点基本信息 + 数据流转概览合并 */}
        <Card className={styles.nodeCard} bordered={false}>
          <div className={styles.nodeCardTop}>
            <div className={styles.nodeCardLeft}>
              <div className={styles.fieldHeader}>
                <Badge count={selectedNodeInfo.nodeIndex} style={{ backgroundColor: '#1890ff' }} />
                <span className={styles.fieldTitle}>{selectedNodeInfo.nodeName}</span>
              </div>
            </div>
            <div className={styles.nodeCardRight}>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{inputParams.length}</div>
                <div className={styles.statLabel}>读取</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{outputParams.length}</div>
                <div className={styles.statLabel}>写入</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{upstreamNodes.size}</div>
                <div className={styles.statLabel}>上游</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{downstreamNodes.size}</div>
                <div className={styles.statLabel}>下游</div>
              </div>
            </div>
          </div>
        </Card>

        {/* 输入字段 - 每个字段两行 */}
        <div className={styles.fieldGroup}>
          <div className={styles.fieldGroupHeader}>
            <EyeOutlined style={{ color: '#1890ff' }} />
            <span>读取字段</span>
            <span className={styles.fieldGroupCount}>{inputParams.length}</span>
          </div>
          <div className={styles.fieldGroupList}>
            {inputParams.length > 0 ? (
              inputParams.map(param => {
                const field = fieldMap.get(param.fieldName);
                const isInput = field?.sourceNodeIds.includes('interface-input');
                const sourceNodes = getSourceNodes(field!);
                const contextName = param.context || field?.contextName || 'DataContext';

                return (
                  <div key={param.fieldName} className={styles.fieldGroupItem}>
                    <div className={styles.fieldGroupLine1}>
                      <span className={styles.fieldContextTag}>{contextName}</span>
                      <Tag color={isInput ? 'purple' : 'blue'} style={{ fontSize: 11 }}>
                        {param.fieldName}
                      </Tag>
                      <span className={styles.fieldGroupItemType}>{param.fieldType}</span>
                      {param.description && (
                        <span className={styles.fieldGroupItemDesc}>{param.description}</span>
                      )}
                    </div>
                    <div className={styles.fieldGroupLine2}>
                      <span className={styles.flowFromLabel}>来自</span>
                      {isInput ? (
                        <Tag color="purple" style={{ fontSize: 10 }}>接口入参</Tag>
                      ) : sourceNodes.length > 0 ? (
                        sourceNodes.map(s => (
                          <span
                            key={s.id}
                            className={styles.nodeTagWrite}
                            onClick={() => onNodeClick?.(s.id)}
                          >
                            <span className={styles.nodeIndex}>{s.index}</span>
                            {s.name}
                          </span>
                        ))
                      ) : (
                        <span className={styles.flowEmpty}>无</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.fieldGroupEmpty}>无读取字段</div>
            )}
          </div>
        </div>

        {/* 输出字段 - 每个字段两行 */}
        <div className={styles.fieldGroup}>
          <div className={styles.fieldGroupHeader}>
            <EditOutlined style={{ color: '#52c41a' }} />
            <span>写入字段</span>
            <span className={styles.fieldGroupCount}>{outputParams.length}</span>
          </div>
          <div className={styles.fieldGroupList}>
            {outputParams.length > 0 ? (
              outputParams.map(param => {
                const field = fieldMap.get(param.fieldName);
                const isOutput = field?.consumerNodeIds.includes('interface-output');
                const consumerNodes = getConsumerNodes(field!);
                const contextName = param.context || field?.contextName || 'DataContext';

                return (
                  <div key={param.fieldName} className={styles.fieldGroupItem}>
                    <div className={styles.fieldGroupLine1}>
                      <span className={styles.fieldContextTag}>{contextName}</span>
                      <Tag color={isOutput ? 'green' : 'blue'} style={{ fontSize: 11 }}>
                        {param.fieldName}
                      </Tag>
                      <span className={styles.fieldGroupItemType}>{param.fieldType}</span>
                      {param.description && (
                        <span className={styles.fieldGroupItemDesc}>{param.description}</span>
                      )}
                    </div>
                    <div className={styles.fieldGroupLine2}>
                      <span className={styles.flowToLabel}>去向</span>
                      {isOutput ? (
                        <Tag color="green" style={{ fontSize: 10 }}>接口出参</Tag>
                      ) : consumerNodes.length > 0 ? (
                        consumerNodes.map(c => (
                          <span
                            key={c.id}
                            className={styles.nodeTagRead}
                            onClick={() => onNodeClick?.(c.id)}
                          >
                            <span className={styles.nodeIndex}>{c.index}</span>
                            {c.name}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: 11, color: '#faad14' }}>未消费</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.fieldGroupEmpty}>无写入字段</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==================== 上下文血缘视图 ====================

  const renderContextLineage = () => {
    const contextFields = selectedContextForLineage ? contextGroups[selectedContextForLineage] || [] : [];

    return (
      <div className={styles.twoColumnLayout}>
        {/* 左侧：上下文列表 */}
        <div className={styles.nodeListPanel}>
          <div className={styles.panelHeader}>
            <span>上下文</span>
            <span className={styles.count}>{contexts.length}</span>
          </div>
          <div className={styles.panelList}>
            {contexts.map(ctx => {
              const fields = contextGroups[ctx];
              const isSelected = selectedContextForLineage === ctx;
              return (
                <div
                  key={ctx}
                  className={`${styles.listItem} ${isSelected ? styles.selected : ''}`}
                  onClick={() => {
                    setSelectedContextForLineage(ctx);
                    setSelectedFieldInContext(null);
                  }}
                >
                  <span className={styles.itemName}>{ctx}</span>
                  <span className={styles.itemCount}>{fields.length}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右侧：上下文字段流转 */}
        <div className={styles.detailPanel}>
          {renderContextDetail()}
        </div>
      </div>
    );
  };

  const renderContextDetail = () => {
    if (!selectedContextForLineage) {
      return (
        <div className={styles.emptyDetail}>
          <Empty description="选择上下文查看字段流转" />
        </div>
      );
    }

    const contextFields = contextGroups[selectedContextForLineage] || [];

    return (
      <div className={styles.detailContent}>
        <Card className={styles.contextCard} bordered={false}>
          <div className={styles.fieldHeader}>
            <span className={styles.fieldTitle}>{selectedContextForLineage}</span>
            <span className={styles.count}>{contextFields.length} 字段</span>
          </div>
        </Card>

        <div className={styles.fieldFlowContainer}>
          {contextFields.map(field => {
            const isInput = isInterfaceInput(field);
            const isOutput = isInterfaceOutput(field);
            const sources = getSourceNodes(field);
            const consumers = getConsumerNodes(field);

            return (
              <div key={field.fieldName} className={styles.lineageRow}>
                <Tag
                  color={field.fieldRole === 'input' ? 'purple' : field.fieldRole === 'output' ? 'green' : 'blue'}
                  style={{ fontSize: 10, flexShrink: 0 }}
                >
                  {field.fieldName}
                </Tag>
                {field.description && (
                  <span className={styles.paramDesc}>{field.description}</span>
                )}
                <span className={styles.lineageRowLabel}>写</span>
                <div className={styles.lineageRowContent}>
                  {isInput && <Tag color="purple" style={{ fontSize: 10 }}>接口入参</Tag>}
                  {sources.map(s => (
                    <span
                      key={s.id}
                      className={styles.nodeTagWrite}
                      onClick={() => onNodeClick?.(s.id)}
                    >
                      <span className={styles.nodeIndex}>{s.index}</span>
                      {s.name}
                    </span>
                  ))}
                  {!isInput && sources.length === 0 && <span className={styles.flowEmpty}>-</span>}
                </div>

                <span className={styles.lineageRowSeparator} />

                <span className={styles.lineageRowLabel}>读</span>
                <div className={styles.lineageRowContent}>
                  {isOutput && <Tag color="green" style={{ fontSize: 10 }}>接口出参</Tag>}
                  {consumers.map(c => (
                    <span
                      key={c.id}
                      className={styles.nodeTagRead}
                      onClick={() => onNodeClick?.(c.id)}
                    >
                      <span className={styles.nodeIndex}>{c.index}</span>
                      {c.name}
                    </span>
                  ))}
                  {!isOutput && consumers.length === 0 && <span className={styles.flowEmpty}>-</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ==================== 主渲染 ====================

  return (
    <div className={styles.dataLineageGraph}>
      <div className={styles.viewTabs}>
        <div
          className={`${styles.viewTab} ${viewType === 'node' ? styles.active : ''}`}
          onClick={() => setViewType('node')}
        >
          <ClusterOutlined /> 节点血缘
        </div>
        <div
          className={`${styles.viewTab} ${viewType === 'context' ? styles.active : ''}`}
          onClick={() => setViewType('context')}
        >
          <SwapOutlined /> 上下文血缘
        </div>
        <div
          className={`${styles.viewTab} ${viewType === 'field' ? styles.active : ''}`}
          onClick={() => setViewType('field')}
        >
          <TableOutlined /> 字段血缘
        </div>
      </div>

      <div className={styles.viewContent}>
        {viewType === 'node' && renderNodeLineage()}
        {viewType === 'context' && renderContextLineage()}
        {viewType === 'field' && renderFieldLineage()}
      </div>
    </div>
  );
};

export default DataLineageGraph;