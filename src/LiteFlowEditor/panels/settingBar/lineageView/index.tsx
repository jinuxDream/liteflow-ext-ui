import React, { useState, useEffect, useCallback } from 'react';
import { Graph } from '@antv/x6';
import { Empty } from 'antd';
import DataLineageGraph from '../../../components/DataLineageGraph';
import styles from './index.module.less';

interface LineageViewProps {
  flowGraph: Graph;
}

interface NodeData {
  id: string;
  name: string;
  inputParams?: any[];
  outputParams?: any[];
}

const LineageView: React.FC<LineageViewProps> = ({ flowGraph }) => {
  const [nodes, setNodes] = useState<NodeData[]>([]);

  // 从画布节点收集数据
  const collectNodes = useCallback(() => {
    if (!flowGraph) return [];

    const result: NodeData[] = [];
    const graphNodes = flowGraph.getNodes();

    graphNodes.forEach(node => {
      const data = node.getData();
      if (data && data.model) {
        const model = data.model;
        const metadata = model.metadata || model;

        // 过滤无效节点：必须有节点名称且不是 UUID
        const nodeName = metadata.nodeName;
        const hasValidName = nodeName && !node.id.match(/^[a-f0-9-]{36}$/i);

        // 或者有参数数据
        const inputParams = metadata.inputParameters || metadata.inputParams || [];
        const outputParams = metadata.outputParameters || metadata.outputParams || [];
        const hasParams = inputParams.length > 0 || outputParams.length > 0;

        // 只保留有效节点
        if (hasValidName || hasParams) {
          result.push({
            id: node.id,
            name: nodeName || node.id,
            inputParams,
            outputParams,
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
      setNodes(collectNodes());
    }, 500);

    const handleModelChange = () => {
      setNodes(collectNodes());
    };

    flowGraph.on('model:change', handleModelChange);
    flowGraph.on('model:changed', handleModelChange);
    flowGraph.on('node:added', handleModelChange);
    flowGraph.on('node:removed', handleModelChange);

    return () => {
      clearTimeout(timer);
      flowGraph.off('model:change', handleModelChange);
      flowGraph.off('model:changed', handleModelChange);
      flowGraph.off('node:added', handleModelChange);
      flowGraph.off('node:removed', handleModelChange);
    };
  }, [flowGraph, collectNodes]);

  if (nodes.length === 0) {
    return <Empty description="暂无节点数据" style={{ marginTop: 100 }} />;
  }

  return (
    <div className={styles.lineageViewContainer}>
      <DataLineageGraph
        nodes={nodes}
        onNodeClick={(nodeId: string) => {
          // 跳转到流程图中该节点的位置
          const node = flowGraph.getNodes().find(n => n.id === nodeId);
          if (node) {
            flowGraph.centerCell(node);
            flowGraph.select(node);
          }
        }}
      />
    </div>
  );
};

export default LineageView;