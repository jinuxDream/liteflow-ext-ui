import React, { useState, useEffect } from 'react';
import { Tag } from 'antd';
import {
  OrderedListOutlined,
  SettingOutlined,
  DatabaseOutlined,
  ApiOutlined,
  CloudServerOutlined
} from '@ant-design/icons';
import { getGlobalViewMode, ViewMode } from '../../context/ViewModeContext';
import { getNodeIndex } from '../../context/NodeIndexContext';
import DataFlowView from '../DataFlowView';
import DependencyView from '../DependencyView';
import styles from './index.module.less';

interface ContentPanelNodeProps {
  nodes: Array<{
    id: string;
    name: string;
    description?: string;
    steps?: any[];
    inputParams?: any[];
    outputParams?: any[];
    dependencies?: any[];
  }>;
  viewMode: '' | 'summary' | 'logic' | 'dataflow' | 'dependency';
  onNodeHover?: (nodeId: string | null) => void;
  hoveredNodeId?: string | null;
}

const ContentPanelNode: React.FC<ContentPanelNodeProps> = ({
  nodes,
  viewMode: propViewMode,
  onNodeHover,
  hoveredNodeId
}) => {
  // 使用全局状态，优先于 props
  const [viewMode, setViewMode] = useState<ViewMode>(propViewMode || getGlobalViewMode());

  // 监听全局 viewMode 变化
  useEffect(() => {
    const checkViewMode = () => {
      const globalMode = getGlobalViewMode();
      if (globalMode !== viewMode) {
        setViewMode(globalMode);
      }
    };

    checkViewMode();
    const interval = setInterval(checkViewMode, 100);
    return () => clearInterval(interval);
  }, [viewMode]);

  // 如果没有选中视图，不渲染
  if (!viewMode) {
    return null;
  }

  // 过滤出当前视图有内容的节点
  const filteredNodes = nodes.filter(node => {
    // 接口信息节点：摘要视图、逻辑视图、依赖视图需要描述，数据流视图需要参数
    if (node.id === 'interface-info') {
      switch (viewMode) {
        case 'summary':
        case 'logic':
        case 'dependency':
          return node.description && node.description.length > 0;
        case 'dataflow':
          return (node.inputParams && node.inputParams.length > 0) ||
                 (node.outputParams && node.outputParams.length > 0);
        default:
          return false;
      }
    }
    // 其他节点：按原逻辑过滤
    switch (viewMode) {
      case 'summary':
        return node.description && node.description.length > 0;
      case 'logic':
        return node.steps && node.steps.length > 0;
      case 'dependency':
        return node.dependencies && node.dependencies.length > 0;
      case 'dataflow':
        // 数据流视图显示所有节点（包括没有参数的节点）
        return true;
      default:
        return false;
    }
  });

  // 获取视图模式标题
  const getViewModeTitle = () => {
    switch (viewMode) {
      case 'summary': return '摘要视图';
      case 'logic': return '逻辑视图';
      case 'dataflow': return '数据流视图';
      case 'dependency': return '依赖视图';
      default: return '';
    }
  };

  // 渲染摘要视图内容（只显示描述）
  const renderSummaryContent = (node: typeof nodes[0]) => {
    if (!node.description) return null;

    return (
      <div className={styles.summaryContent}>
        <div className={styles.summaryText}>{node.description}</div>
      </div>
    );
  };

  // 渲染逻辑视图内容
  const renderLogicContent = (node: typeof nodes[0]) => {
    if (!node.steps || node.steps.length === 0) return null;

    return (
      <div className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <OrderedListOutlined className={styles.sectionIcon} />
          <span>{node.steps.length} 步骤</span>
        </div>
        <div className={styles.stepList}>
          {node.steps.map((step: any, i: number) => (
            <div key={i} className={styles.stepItem}>
              <span className={styles.stepNum}>{step.order || i + 1}.</span>
              <span className={styles.stepText}>{step.description || step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染数据流视图内容
  const renderDataFlowContent = (node: typeof nodes[0]) => {
    if ((!node.inputParams || node.inputParams.length === 0) &&
        (!node.outputParams || node.outputParams.length === 0)) {
      return null;
    }

    return (
      <div className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <SettingOutlined className={styles.sectionIcon} />
          <span>参数</span>
        </div>
        <div className={styles.paramSection}>
          {node.inputParams && node.inputParams.length > 0 && (
            <div className={styles.paramGroup}>
              <span className={styles.paramLabel}>入 {node.inputParams.length}</span>
              <div className={styles.paramTags}>
                {node.inputParams.slice(0, 3).map((p: any, i: number) => (
                  <Tag key={i} color="blue" className={styles.paramTag}>{p.fieldName}</Tag>
                ))}
              </div>
            </div>
          )}
          {node.outputParams && node.outputParams.length > 0 && (
            <div className={styles.paramGroup}>
              <span className={styles.paramLabel}>出 {node.outputParams.length}</span>
              <div className={styles.paramTags}>
                {node.outputParams.slice(0, 3).map((p: any, i: number) => (
                  <Tag key={i} color="green" className={styles.paramTag}>{p.fieldName}</Tag>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染依赖视图内容
  const renderDependencyContent = (node: typeof nodes[0]) => {
    if (!node.dependencies || node.dependencies.length === 0) return null;

    const getDepIcon = (type: string) => {
      switch (type?.toUpperCase()) {
        case 'DB': return <DatabaseOutlined />;
        case 'RPC': return <ApiOutlined />;
        case 'REDIS':
        case 'CACHE': return <CloudServerOutlined />;
        default: return <ApiOutlined />;
      }
    };

    const getDepColor = (type: string) => {
      switch (type?.toUpperCase()) {
        case 'DB': return 'blue';
        case 'RPC': return 'green';
        case 'REDIS':
        case 'CACHE': return 'orange';
        default: return 'default';
      }
    };

    return (
      <div className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <DatabaseOutlined className={styles.sectionIcon} />
          <span>{node.dependencies.length} 依赖</span>
        </div>
        <div className={styles.depTags}>
          {node.dependencies.map((dep: any, i: number) => (
            <Tag key={i} color={getDepColor(dep.type)} className={styles.depTag}>
              {getDepIcon(dep.type)}
              <span>{dep.name}</span>
            </Tag>
          ))}
        </div>
      </div>
    );
  };

  // 根据视图模式渲染内容
  const renderContent = (node: typeof nodes[0]) => {
    switch (viewMode) {
      case 'summary':
        return renderSummaryContent(node);
      case 'logic':
        return renderLogicContent(node);
      case 'dataflow':
        return renderDataFlowContent(node);
      case 'dependency':
        return renderDependencyContent(node);
      default:
        return null;
    }
  };

  if (filteredNodes.length === 0) {
    return null;
  }

  // 分离接口信息节点和其他节点
  const interfaceInfoNode = filteredNodes.find(node => node.id === 'interface-info');
  const otherNodes = filteredNodes.filter(node => node.id !== 'interface-info');

  // 数据流视图使用新的矩阵视图
  if (viewMode === 'dataflow') {
    return (
      <div className={styles.contentPanelNode}>
        <div className={styles.panelTitle}>
          {getViewModeTitle()} · 上下文字段 {interfaceInfoNode?.inputParams?.length || 0} 个
        </div>
        <DataFlowView
          nodes={filteredNodes}
          onNodeClick={(nodeId) => onNodeHover?.(nodeId)}
        />
      </div>
    );
  }

  // 依赖视图使用新的矩阵视图
  if (viewMode === 'dependency') {
    // 统计依赖总数
    const totalDeps = new Set<string>();
    filteredNodes.forEach(node => {
      node.dependencies?.forEach((dep: any) => totalDeps.add(dep.name));
    });

    return (
      <div className={styles.contentPanelNode}>
        <div className={styles.panelTitle}>
          {getViewModeTitle()} · 依赖 {totalDeps.size} 个
        </div>
        <DependencyView
          nodes={filteredNodes}
          onNodeClick={(nodeId) => onNodeHover?.(nodeId)}
        />
      </div>
    );
  }

  return (
    <div className={styles.contentPanelNode}>
      <div className={styles.panelTitle}>
        {getViewModeTitle()} · {filteredNodes.length} 节点
      </div>
      <div className={styles.panelContent}>
        {/* 接口信息节点 - 独占第一行，不同背景色 */}
        {interfaceInfoNode && (
          <div
            className={`${styles.nodeCard} ${styles.interfaceCard} ${hoveredNodeId === interfaceInfoNode.id ? styles.hovered : ''}`}
            onMouseEnter={() => onNodeHover?.(interfaceInfoNode.id)}
            onMouseLeave={() => onNodeHover?.(null)}
          >
            <div className={styles.interfaceIcon}>
              <ApiOutlined />
            </div>
            <div className={styles.nodeInfo}>
              <div className={styles.nodeName}>{interfaceInfoNode.name}</div>
              {interfaceInfoNode.description && (
                <div className={styles.summaryText}>{interfaceInfoNode.description}</div>
              )}
            </div>
          </div>
        )}
        {/* 其他节点 */}
        {otherNodes.map((node) => {
          const nodeIndex = getNodeIndex(node.id);
          return (
            <div
              key={node.id}
              className={`${styles.nodeCard} ${hoveredNodeId === node.id ? styles.hovered : ''}`}
              onMouseEnter={() => onNodeHover?.(node.id)}
              onMouseLeave={() => onNodeHover?.(null)}
            >
              {nodeIndex && <div className={styles.nodeIndex}>{nodeIndex}</div>}
              <div className={styles.nodeInfo}>
                <div className={styles.nodeName}>{node.name}</div>
                {viewMode !== 'summary' && node.description && (
                  <div className={styles.nodeDesc}>{node.description}</div>
                )}
                {renderContent(node)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContentPanelNode;
