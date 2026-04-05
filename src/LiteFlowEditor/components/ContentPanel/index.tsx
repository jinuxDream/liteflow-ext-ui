import React, { useEffect, useState, useCallback } from 'react';
import { Graph } from '@antv/x6';
import { Tag, Empty } from 'antd';
import {
  OrderedListOutlined,
  SettingOutlined,
  DatabaseOutlined,
  ApiOutlined,
  CloudServerOutlined
} from '@ant-design/icons';
import { getGlobalViewMode, ViewMode } from '../../context/ViewModeContext';
import styles from './index.module.less';

const API_BASE_PATH = (window as any).LITEFLOW_CONFIG?.API_BASE_PATH || 'api';

interface ContentPanelProps {
  graph: Graph | undefined;
}

interface NodeContent {
  id: string;
  name: string;
  description?: string;
  steps?: any[];
  inputParams?: any[];
  outputParams?: any[];
  dependencies?: any[];
}

const ContentPanel: React.FC<ContentPanelProps> = ({ graph }) => {
  const [nodeContents, setNodeContents] = useState<NodeContent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // 收集节点内容数据
  const collectNodeContents = useCallback(() => {
    if (!graph) return [];

    try {
      const nodes = graph.getNodes();
      const contents: NodeContent[] = [];

      nodes.forEach(node => {
        try {
          const data = node.getData();
          if (data && data.model && data.model.metadata) {
            const metadata = data.model.metadata;
            const steps = metadata.steps || [];
            const inputParams = metadata.inputParameters || [];
            const outputParams = metadata.outputParameters || [];
            const dependencies = metadata.dependencies || [];

            const hasContent = steps.length > 0 ||
              inputParams.length > 0 ||
              outputParams.length > 0 ||
              dependencies.length > 0;

            if (hasContent) {
              contents.push({
                id: node.id,
                name: metadata.nodeName || data.model.id || node.id,
                description: metadata.description || '',
                steps,
                inputParams,
                outputParams,
                dependencies
              });
            }
          }
        } catch (nodeError) {
          // Skip nodes with errors
        }
      });

      return contents;
    } catch (error) {
      return [];
    }
  }, [graph]);

  // 初始化
  useEffect(() => {
    if (graph) {
      setIsReady(true);
      const timer = setTimeout(() => {
        setNodeContents(collectNodeContents());
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [graph, collectNodeContents]);

  // 监听模型变化
  useEffect(() => {
    if (!graph || !isReady) return;

    const handleModelChange = () => {
      setNodeContents(collectNodeContents());
    };

    graph.on('model:changed', handleModelChange);
    graph.on('model:change', handleModelChange);
    handleModelChange();

    return () => {
      graph.off('model:changed', handleModelChange);
      graph.off('model:change', handleModelChange);
    };
  }, [graph, isReady, collectNodeContents]);

  // 监听视图模式变化
  useEffect(() => {
    const checkViewMode = () => {
      const currentMode = getGlobalViewMode();
      setViewMode(prev => prev !== currentMode ? currentMode : prev);
    };

    checkViewMode();
    const interval = setInterval(checkViewMode, 200);
    return () => clearInterval(interval);
  }, []);

  // 高亮节点
  const handleMouseEnter = useCallback((nodeId: string) => {
    setHoveredNodeId(nodeId);
    if (graph) {
      try {
        const node = graph.getCellById(nodeId);
        if (node) {
          node.setAttrs({
            body: {
              strokeWidth: 3,
              stroke: '#1890ff',
            }
          });
        }
      } catch (e) {
        // ignore
      }
    }
  }, [graph]);

  // 取消高亮
  const handleMouseLeave = useCallback(() => {
    if (graph && hoveredNodeId) {
      try {
        const node = graph.getCellById(hoveredNodeId);
        if (node) {
          node.setAttrs({
            body: {
              strokeWidth: 2,
              stroke: 'transparent',
            }
          });
        }
      } catch (e) {
        // ignore
      }
    }
    setHoveredNodeId(null);
  }, [graph, hoveredNodeId]);

  // 过滤出当前视图有内容的节点
  const filteredContents = React.useMemo(() => {
    return nodeContents.filter(content => {
      switch (viewMode) {
        case 'summary':
          return content.description && content.description.length > 0;
        case 'logic':
          return content.steps && content.steps.length > 0;
        case 'dataflow':
          return (content.inputParams && content.inputParams.length > 0) ||
                 (content.outputParams && content.outputParams.length > 0);
        case 'dependency':
          return content.dependencies && content.dependencies.length > 0;
        default:
          return false;
      }
    });
  }, [nodeContents, viewMode]);

  // 渲染摘要视图内容
  const renderSummaryContent = (content: NodeContent) => {
    if (!content.description) return null;

    return (
      <div className={styles.summarySection}>
        <div className={styles.summaryText}>{content.description}</div>
      </div>
    );
  };

  // 渲染逻辑视图内容
  const renderLogicContent = (content: NodeContent) => {
    if (!content.steps || content.steps.length === 0) return null;

    const items = content.steps.slice(0, 5).map((step: any, index: number) => (
      <div key={index} className={styles.stepItem}>
        <span className={styles.stepNum}>{step.order || index + 1}.</span>
        <span className={styles.stepText}>{step.description || step}</span>
      </div>
    ));

    return (
      <div className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <OrderedListOutlined className={styles.sectionIcon} />
          <span>执行步骤 ({content.steps.length})</span>
        </div>
        <div className={styles.stepList}>
          {items}
          {content.steps.length > 5 && <span className={styles.moreText}>+{content.steps.length - 5} 更多</span>}
        </div>
      </div>
    );
  };

  // 渲染数据流视图内容
  const renderDataFlowContent = (content: NodeContent) => {
    if ((!content.inputParams || content.inputParams.length === 0) &&
        (!content.outputParams || content.outputParams.length === 0)) {
      return null;
    }

    return (
      <div className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <SettingOutlined className={styles.sectionIcon} />
          <span>参数</span>
        </div>
        <div className={styles.paramSection}>
          {content.inputParams && content.inputParams.length > 0 && (
            <div className={styles.paramGroup}>
              <span className={styles.paramLabel}>输入 ({content.inputParams.length})</span>
              <div className={styles.paramTags}>
                {content.inputParams.slice(0, 4).map((p: any, i: number) => (
                  <Tag key={i} color="blue" className={styles.paramTag}>{p.fieldName}</Tag>
                ))}
                {content.inputParams.length > 4 && <span className={styles.moreText}>+{content.inputParams.length - 4}</span>}
              </div>
            </div>
          )}
          {content.outputParams && content.outputParams.length > 0 && (
            <div className={styles.paramGroup}>
              <span className={styles.paramLabel}>输出 ({content.outputParams.length})</span>
              <div className={styles.paramTags}>
                {content.outputParams.slice(0, 4).map((p: any, i: number) => (
                  <Tag key={i} color="green" className={styles.paramTag}>{p.fieldName}</Tag>
                ))}
                {content.outputParams.length > 4 && <span className={styles.moreText}>+{content.outputParams.length - 4}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染依赖视图内容
  const renderDependencyContent = (content: NodeContent) => {
    if (!content.dependencies || content.dependencies.length === 0) return null;

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
          <span>依赖 ({content.dependencies.length})</span>
        </div>
        <div className={styles.depTags}>
          {content.dependencies.map((dep: any, i: number) => (
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
  const renderContent = (nodeContent: NodeContent) => {
    switch (viewMode) {
      case 'summary':
        return renderSummaryContent(nodeContent);
      case 'logic':
        return renderLogicContent(nodeContent);
      case 'dataflow':
        return renderDataFlowContent(nodeContent);
      case 'dependency':
        return renderDependencyContent(nodeContent);
      default:
        return null;
    }
  };

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

  // 不渲染的情况（非上下文视图且无内容时）
  if (!graph || !isReady || !viewMode) {
    return null;
  }

  if (filteredContents.length === 0) {
    return null;
  }

  return (
    <div className={styles.contentPanel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>{getViewModeTitle()}</span>
        <span className={styles.panelCount}>{filteredContents.length} 个节点</span>
      </div>
      <div className={styles.panelContent}>
        <div className={styles.contentFlow}>
          {filteredContents.map((content, index) => (
            <div
              key={content.id}
              className={styles.nodeContentCard}
              onMouseEnter={() => handleMouseEnter(content.id)}
              onMouseLeave={handleMouseLeave}
            >
              <div className={styles.nodeHeader}>
                <span className={styles.nodeIndex}>{index + 1}</span>
                <div className={styles.nodeTitleGroup}>
                  <span className={styles.nodeName}>{content.name}</span>
                  {viewMode !== 'summary' && content.description && (
                    <span className={styles.nodeDesc}>{content.description}</span>
                  )}
                </div>
              </div>
              {renderContent(content)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContentPanel;