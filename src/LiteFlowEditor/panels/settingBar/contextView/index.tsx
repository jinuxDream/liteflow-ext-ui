import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Graph } from '@antv/x6';
import { Tag, Empty, Segmented, Select } from 'antd';
import { ClusterOutlined, AppstoreOutlined } from '@ant-design/icons';
import styles from './index.module.less';

interface IProps {
  flowGraph: Graph;
}

interface ContextInfo {
  name: string;
  description: string;
  fields: Array<{ fieldName: string; fieldType: string; description: string }>;
}

interface NodeContextInfo {
  nodeId: string;
  nodeName: string;
  contextName: string;
  inputFields: Array<{ name: string; desc: string; type: string }>;
  outputFields: Array<{ name: string; desc: string; type: string }>;
}

type ViewMode = 'node' | 'context';

const ContextView: React.FC<IProps> = ({ flowGraph }) => {
  const [nodeContextMap, setNodeContextMap] = useState<NodeContextInfo[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('node');
  const [filterNode, setFilterNode] = useState<string | undefined>(undefined);
  const [filterContext, setFilterContext] = useState<string | undefined>(undefined);

  // 从画布节点收集上下文信息
  const collectNodeContextInfo = useCallback(() => {
    if (!flowGraph) return [];

    const result: NodeContextInfo[] = [];
    const nodes = flowGraph.getNodes();

    nodes.forEach(node => {
      const data = node.getData();

      if (data && data.model) {
        const model = data.model;
        const metadata = model.metadata || model;

        if (metadata) {
          const nodeName = metadata.nodeName || model.id || node.id;
          const nodeContexts = metadata.contexts || [];
          const inputParams = metadata.inputParameters || [];
          const outputParams = metadata.outputParameters || [];

          const allContexts = nodeContexts.length > 0 ? nodeContexts :
            [...new Set([...inputParams.map(p => p.context), ...outputParams.map(p => p.context)].filter(Boolean))];

          allContexts.forEach((contextName: string) => {
            if (!contextName) return;

            const inputFields = inputParams
              .filter((p: any) => p && p.context === contextName)
              .map((p: any) => ({
                name: p.fieldName,
                desc: p.description || '',
                type: p.fieldType || ''
              }));

            const outputFields = outputParams
              .filter((p: any) => p && p.context === contextName)
              .map((p: any) => ({
                name: p.fieldName,
                desc: p.description || '',
                type: p.fieldType || ''
              }));

            if (inputFields.length > 0 || outputFields.length > 0) {
              result.push({
                nodeId: node.id,
                nodeName,
                contextName,
                inputFields,
                outputFields
              });
            }
          });
        }
      }
    });

    return result;
  }, [flowGraph]);

  // 初始化和监听画布变化
  useEffect(() => {
    if (!flowGraph) return;

    const timer = setTimeout(() => {
      setNodeContextMap(collectNodeContextInfo());
    }, 500);

    const handleModelChange = () => {
      setNodeContextMap(collectNodeContextInfo());
    };

    flowGraph.on('model:changed', handleModelChange);
    flowGraph.on('model:change', handleModelChange);
    flowGraph.on('node:added', handleModelChange);
    flowGraph.on('node:removed', handleModelChange);

    return () => {
      clearTimeout(timer);
      flowGraph.off('model:changed', handleModelChange);
      flowGraph.off('model:change', handleModelChange);
      flowGraph.off('node:added', handleModelChange);
      flowGraph.off('node:removed', handleModelChange);
    };
  }, [flowGraph, collectNodeContextInfo]);

  // 获取所有节点选项
  const nodeOptions = useMemo(() => {
    const nodes = new Set(nodeContextMap.map(item => item.nodeName));
    return Array.from(nodes).map(name => ({ label: name, value: name }));
  }, [nodeContextMap]);

  // 获取所有上下文选项
  const contextOptions = useMemo(() => {
    const ctxs = new Set(nodeContextMap.map(item => item.contextName));
    return Array.from(ctxs).map(name => ({ label: name, value: name }));
  }, [nodeContextMap]);

  // 筛选后的数据
  const filteredData = useMemo(() => {
    let data = nodeContextMap;

    if (viewMode === 'node' && filterNode) {
      data = data.filter(item => item.nodeName === filterNode);
    }
    if (viewMode === 'context' && filterContext) {
      data = data.filter(item => item.contextName === filterContext);
    }

    return data;
  }, [nodeContextMap, viewMode, filterNode, filterContext]);

  // 从节点数据中汇总上下文字段描述
  const contextFieldDescMap = useMemo(() => {
    const map = new Map<string, Map<string, { type: string; desc: string }>>();

    nodeContextMap.forEach(item => {
      if (!map.has(item.contextName)) {
        map.set(item.contextName, new Map());
      }
      const fieldMap = map.get(item.contextName)!;

      [...item.inputFields, ...item.outputFields].forEach(field => {
        if (!fieldMap.has(field.name)) {
          fieldMap.set(field.name, { type: field.type, desc: field.desc });
        }
      });
    });

    // 转换为 ContextInfo 格式
    const result: Record<string, ContextInfo> = {};
    map.forEach((fieldMap, ctxName) => {
      const fields: Array<{ fieldName: string; fieldType: string; description: string }> = [];
      fieldMap.forEach((info, fieldName) => {
        fields.push({
          fieldName,
          fieldType: info.type,
          description: info.desc
        });
      });
      result[ctxName] = {
        name: ctxName,
        description: '',
        fields
      };
    });

    return result;
  }, [nodeContextMap]);

  // 按节点分组
  const nodeGroupedData = useMemo(() => {
    const nodeMap = new Map<string, Map<string, NodeContextInfo[]>>();

    filteredData.forEach(item => {
      if (!nodeMap.has(item.nodeId)) {
        nodeMap.set(item.nodeId, new Map());
      }
      const ctxMap = nodeMap.get(item.nodeId)!;
      if (!ctxMap.has(item.contextName)) {
        ctxMap.set(item.contextName, []);
      }
      ctxMap.get(item.contextName)!.push(item);
    });

    const result: Array<{
      key: string;
      nodeName: string;
      contexts: Array<{
        contextName: string;
        inputs: Array<{ name: string; desc: string; type: string }>;
        outputs: Array<{ name: string; desc: string; type: string }>;
      }>;
    }> = [];

    nodeMap.forEach((ctxMap, nodeId) => {
      const firstItem = filteredData.find(i => i.nodeId === nodeId);
      const contextList: any[] = [];
      ctxMap.forEach((items, contextName) => {
        const allInputs = items.flatMap(i => i.inputFields);
        const allOutputs = items.flatMap(i => i.outputFields);
        contextList.push({ contextName, inputs: allInputs, outputs: allOutputs });
      });
      result.push({
        key: nodeId,
        nodeName: firstItem?.nodeName || nodeId,
        contexts: contextList
      });
    });

    return result;
  }, [filteredData]);

  // 按上下文分组
  const contextGroupedData = useMemo(() => {
    const ctxMap = new Map<string, Array<{
      nodeName: string;
      inputs: Array<{ name: string; desc: string; type: string }>;
      outputs: Array<{ name: string; desc: string; type: string }>;
    }>>();

    filteredData.forEach(item => {
      if (!ctxMap.has(item.contextName)) {
        ctxMap.set(item.contextName, []);
      }
      ctxMap.get(item.contextName)!.push({
        nodeName: item.nodeName,
        inputs: item.inputFields,
        outputs: item.outputFields
      });
    });

    const result: Array<{
      key: string;
      contextName: string;
      contextDesc: string;
      nodes: Array<{
        nodeName: string;
        inputs: Array<{ name: string; desc: string; type: string }>;
        outputs: Array<{ name: string; desc: string; type: string }>;
      }>;
    }> = [];

    ctxMap.forEach((items, contextName) => {
      const ctxInfo = contextFieldDescMap[contextName];
      result.push({
        key: contextName,
        contextName,
        contextDesc: ctxInfo?.description || '',
        nodes: items
      });
    });

    return result;
  }, [filteredData, contextFieldDescMap]);

  // 渲染字段列表
  const renderFields = (fields: Array<{ name: string; desc: string; type: string }>, color: string) => {
    if (!fields || fields.length === 0) return <span className={styles.noField}>-</span>;
    return (
      <div className={styles.fieldList}>
        {fields.map((f, idx) => (
          <div key={idx} className={styles.fieldItem}>
            <Tag color={color} className={styles.fieldTag}>{f.name}</Tag>
            <span className={styles.fieldDesc}>{f.desc || f.type}</span>
          </div>
        ))}
      </div>
    );
  };

  // 渲染上下文字段定义
  const renderContextFields = (contextName: string) => {
    const ctxInfo = contextFieldDescMap[contextName];
    if (!ctxInfo || !ctxInfo.fields || ctxInfo.fields.length === 0) return null;

    return (
      <div className={styles.contextFields}>
        <div className={styles.contextFieldsTitle}>字段定义:</div>
        {ctxInfo.fields.map((f, idx) => (
          <div key={idx} className={styles.contextFieldRow}>
            <Tag color="geekblue">{f.fieldName}</Tag>
            <span className={styles.contextFieldType}>{f.fieldType}</span>
            {f.description && <span className={styles.contextFieldDesc}>{f.description}</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.contextViewContainer}>
      <div className={styles.viewSwitch}>
        <Segmented
          size="small"
          value={viewMode}
          onChange={(val) => {
            setViewMode(val as ViewMode);
            setFilterNode(undefined);
            setFilterContext(undefined);
          }}
          options={[
            { label: '节点视角', value: 'node', icon: <AppstoreOutlined /> },
            { label: '上下文视角', value: 'context', icon: <ClusterOutlined /> }
          ]}
        />
      </div>

      {/* 筛选器 */}
      <div className={styles.filterRow}>
        {viewMode === 'node' ? (
          <Select
            allowClear
            placeholder="筛选节点"
            value={filterNode}
            onChange={setFilterNode}
            options={nodeOptions}
            style={{ width: '100%' }}
            size="small"
          />
        ) : (
          <Select
            allowClear
            placeholder="筛选上下文"
            value={filterContext}
            onChange={setFilterContext}
            options={contextOptions}
            style={{ width: '100%' }}
            size="small"
          />
        )}
      </div>

      <div className={styles.tableContainer}>
        {viewMode === 'node' ? (
          nodeGroupedData.length > 0 ? (
            <div className={styles.dataList}>
              {nodeGroupedData.map((group, idx) => (
                <div key={idx} className={styles.dataItem}>
                  <div className={styles.dataLabel}>
                    <Tag color="blue">{group.nodeName}</Tag>
                    <span className={styles.ctxCount}>{group.contexts.length} 个上下文</span>
                  </div>
                  <div className={styles.dataChildren}>
                    {group.contexts.map((ctx, cidx) => (
                      <div key={cidx} className={styles.contextGroupCompact}>
                        <div className={styles.contextGroupHeader}>
                          <Tag color="orange">{ctx.contextName}</Tag>
                        </div>
                        <div className={styles.fieldRow}>
                          <span className={styles.fieldLabel}>读:</span>
                          {renderFields(ctx.inputs, 'cyan')}
                        </div>
                        <div className={styles.fieldRow}>
                          <span className={styles.fieldLabel}>写:</span>
                          {renderFields(ctx.outputs, 'green')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty description="无匹配数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )
        ) : (
          contextGroupedData.length > 0 ? (
            <div className={styles.dataList}>
              {contextGroupedData.map((group, idx) => (
                <div key={idx} className={styles.dataItem}>
                  <div className={styles.dataLabel}>
                    <Tag color="orange">{group.contextName}</Tag>
                    <span className={styles.ctxCount}>{group.nodes.length} 个节点使用</span>
                  </div>
                  {renderContextFields(group.contextName)}
                  <div className={styles.dataChildren}>
                    {group.nodes.map((node, nidx) => (
                      <div key={nidx} className={styles.contextGroupCompact}>
                        <div className={styles.contextGroupHeader}>
                          <Tag color="blue">{node.nodeName}</Tag>
                        </div>
                        <div className={styles.fieldRow}>
                          <span className={styles.fieldLabel}>读:</span>
                          {renderFields(node.inputs, 'cyan')}
                        </div>
                        <div className={styles.fieldRow}>
                          <span className={styles.fieldLabel}>写:</span>
                          {renderFields(node.outputs, 'green')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty description="无匹配数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )
        )}
      </div>
    </div>
  );
};

export default ContextView;