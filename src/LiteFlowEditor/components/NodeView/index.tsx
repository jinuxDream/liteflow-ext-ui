import React from 'react';
import { Node } from '@antv/x6';
import { Tooltip, Tag, Empty } from 'antd';
import {
  OrderedListOutlined,
  SettingOutlined,
  DatabaseOutlined,
  ApiOutlined,
  CloudServerOutlined,
  SafetyOutlined,
  ClusterOutlined
} from '@ant-design/icons';
import classNames from 'classnames';
import styles from './index.module.less';
import { getGlobalViewMode, registerRefresh } from '../../context/ViewModeContext';
import { getNodeIndex } from '../../context/NodeIndexContext';
import { getGlobalHoverPanelEnabled } from '../../context/HoverPanelContext';

interface INodeViewProps {
  icon: string;
  node: Node;
  children: React.ReactNode;
  showParams: boolean;
}

// 节点类型对应的主题色
const NODE_TYPE_COLORS: Record<string, string> = {
  // 旧节点类型（LiteFlow组件类型）
  'NodeComponent': '#1890ff',
  'ScriptCommonComponent': '#1890ff',
  'NodeIfComponent': '#fa8c16',
  'ScriptIfComponent': '#fa8c16',
  'NodeBooleanComponent': '#fa8c16',
  'ScriptBooleanComponent': '#fa8c16',
  'NodeSwitchComponent': '#722ed1',
  'ScriptSwitchComponent': '#722ed1',
  'NodeForComponent': '#13c2c2',
  'ScriptForComponent': '#13c2c2',
  'NodeWhileComponent': '#eb2f96',
  'ScriptWhileComponent': '#eb2f96',
  'NodeIteratorComponent': '#faad14',
  'NodeBreakComponent': '#ff4d4f',
  'ScriptBreakComponent': '#ff4d4f',
  'THEN': '#52c41a',
  'WHEN': '#1890ff',
  'AND': '#52c41a',
  'OR': '#fa8c16',
  'NOT': '#ff4d4f',
  'CATCH': '#fa8c16',
  'CHAIN': '#722ed1',
  'LITEFLOW_START': '#52c41a',
  'LITEFLOW_END': '#ff4d4f',
  'LITEFLOW_INTERMEDIATE_END': '#faad14',
  'NodeVirtualComponent': '#d9d9d9',
  'fallback': '#8c8c8c',
  // 节点角色类型（@NodeDef.type）
  'INIT': '#faad14',
  'QUERY': '#13c2c2',
  'COMPUTE': '#1890ff',
  'AGGREGATE': '#722ed1',
  'COLLECT': '#52c41a',
};

// 节点角色中文名称
const NODE_TYPE_NAMES: Record<string, string> = {
  'INIT': '初始化',
  'QUERY': '查询',
  'COMPUTE': '计算',
  'AGGREGATE': '聚合',
  'COLLECT': '汇总',
};

const NodeView: React.FC<INodeViewProps> = (props) => {
  const { icon, children } = props;
  const { node } = props.node as any;

  // 强制刷新状态
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  React.useEffect(() => {
    return registerRefresh(() => forceUpdate());
  }, []);

  // 监听悬停开关变化，触发重新渲染
  React.useEffect(() => {
    const checkHoverEnabled = () => {
      forceUpdate();
    };
    const interval = setInterval(checkHoverEnabled, 200);
    return () => clearInterval(interval);
  }, []);

  // 获取当前视图模式
  const viewMode = getGlobalViewMode();

  let nodeId = null;
  let metadata = null;
  let nodeType = '';

  try {
    const data = node.getData();
    if (data && data.model) {
      nodeId = data.model.id;
      metadata = data.model.metadata;
      nodeType = data.model.type || '';
    }
  } catch (error) {
    console.error('NodeView - error:', error);
  }

  const displayName = metadata?.nodeName || nodeId;
  const nodeTypeName = metadata?.type || '';

  const steps = metadata?.steps || [];
  const inputParams = metadata?.inputParameters || [];
  const outputParams = metadata?.outputParameters || [];
  const dependencies = metadata?.dependencies || [];

  // 有 metadata 的节点都按有内容样式展示
  const hasDetail = metadata && metadata.nodeName;
  // 悬浮窗只在有额外详情时显示（steps/params/dependencies）
  const hasExtraDetail = steps.length > 0 || inputParams.length > 0 || outputParams.length > 0 || dependencies.length > 0;

  // 虚拟节点特殊处理
  const isVirtual = nodeType === 'NodeVirtualComponent';
  const nodeColor = NODE_TYPE_COLORS[nodeType] || '#1890ff';

  // 根据视图模式渲染节点内容
  const renderNodeContent = () => {
    if (!hasDetail) return null;

    switch (viewMode) {
      case 'logic':
        return renderLogicContent();
      case 'dataflow':
        return renderDataFlowContent();
      case 'dependency':
        return renderDependencyContent();
      default:
        return null;
    }
  };

  // 逻辑视图：显示执行步骤
  const renderLogicContent = () => {
    if (steps.length === 0) return null;
    const visibleSteps = steps.slice(0, 3);
    return (
      <div className={styles.viewContent}>
        <div className={styles.contentHeader}>
          <OrderedListOutlined className={styles.contentIcon} />
          <span>步骤 ({steps.length})</span>
        </div>
        <div className={styles.stepList}>
          {visibleSteps.map((step: any, index: number) => (
            <div key={index} className={styles.stepRow}>
              <span className={styles.stepNum}>{step.order || index + 1}.</span>
              <span className={styles.stepText}>{step.description || step}</span>
            </div>
          ))}
          {steps.length > 3 && <span className={styles.moreText}>+{steps.length - 3}</span>}
        </div>
      </div>
    );
  };

  // 数据流视图：显示输入输出参数
  const renderDataFlowContent = () => {
    if (inputParams.length === 0 && outputParams.length === 0) return null;
    return (
      <div className={styles.viewContent}>
        <div className={styles.contentHeader}>
          <SettingOutlined className={styles.contentIcon} />
          <span>参数</span>
        </div>
        <div className={styles.paramList}>
          {inputParams.length > 0 && (
            <div className={styles.paramRow}>
              <span className={styles.paramLabel}>📥</span>
              <div className={styles.paramTagGroup}>
                {inputParams.slice(0, 3).map((p: any, i: number) => (
                  <Tag key={i} color="blue" className={styles.smallTag}>{p.fieldName}</Tag>
                ))}
                {inputParams.length > 3 && <span className={styles.moreText}>+{inputParams.length - 3}</span>}
              </div>
            </div>
          )}
          {outputParams.length > 0 && (
            <div className={styles.paramRow}>
              <span className={styles.paramLabel}>📤</span>
              <div className={styles.paramTagGroup}>
                {outputParams.slice(0, 3).map((p: any, i: number) => (
                  <Tag key={i} color="green" className={styles.smallTag}>{p.fieldName}</Tag>
                ))}
                {outputParams.length > 3 && <span className={styles.moreText}>+{outputParams.length - 3}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 依赖视图：显示依赖
  const renderDependencyContent = () => {
    if (dependencies.length === 0) return null;
    return (
      <div className={styles.viewContent}>
        <div className={styles.contentHeader}>
          <DatabaseOutlined className={styles.contentIcon} />
          <span>依赖 ({dependencies.length})</span>
        </div>
        <div className={styles.depList}>
          {dependencies.slice(0, 3).map((dep: any, i: number) => (
            <Tag key={i} color={getDepColor(dep.type)} className={styles.depSmallTag}>
              {getDepIcon(dep.type)}
              <span>{dep.name}</span>
            </Tag>
          ))}
          {dependencies.length > 3 && <span className={styles.moreText}>+{dependencies.length - 3}</span>}
        </div>
      </div>
    );
  };

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

  // 完整详情弹窗 - 与属性面板完全一致
  const renderDetailPopup = () => {
    if (!metadata) {
      return (
        <div className={styles.detailPopup}>
          <Empty
            description="暂无节点元数据信息"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      );
    }

    return (
      <div className={styles.detailPopup}>
        {/* 基本信息 */}
        {metadata.nodeName && (
          <div className={styles.basicInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>名称:</span>
              <Tag color="green" className={styles.infoNameTag}>{metadata.nodeName}</Tag>
              <span className={styles.infoLabel}>ID:</span>
              <Tag color="blue" className={styles.infoTag}>{metadata.nodeId}</Tag>
            </div>
            {metadata.description && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>描述:</span>
                <span className={styles.infoDesc}>{metadata.description}</span>
              </div>
            )}
          </div>
        )}

        {/* 参数 */}
        {(inputParams.length > 0 || outputParams.length > 0) && (
          <div className={styles.section}>
            <div className={`${styles.sectionHeader} ${styles.sectionHeaderParams}`}>
              <SettingOutlined className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>参数</span>
              <span className={styles.sectionCount}>
                ({inputParams.length + outputParams.length})
              </span>
            </div>

            {inputParams.length > 0 && (
              <div className={styles.paramGroup}>
                <div className={styles.paramGroupHeader}>输入参数 ({inputParams.length})</div>
                <div className={styles.paramTable}>
                  {inputParams.map((param: any, index: number) => (
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

            {outputParams.length > 0 && (
              <div className={styles.paramGroup}>
                <div className={styles.paramGroupHeader}>输出参数 ({outputParams.length})</div>
                <div className={styles.paramTable}>
                  {outputParams.map((param: any, index: number) => (
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

        {/* 准入规则 */}
        {metadata.accessRule && (
          <div className={styles.section}>
            <div className={`${styles.sectionHeader} ${styles.sectionHeaderRule}`}>
              <SafetyOutlined className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>准入规则</span>
            </div>
            <div className={styles.accessRuleBox}>
              <span className={styles.accessRuleIcon}>ℹ</span>
              <span className={styles.accessRuleText}>{metadata.accessRule.description}</span>
            </div>
          </div>
        )}

        {/* 执行步骤 */}
        {steps.length > 0 && (
          <div className={styles.section}>
            <div className={`${styles.sectionHeader} ${styles.sectionHeaderSteps}`}>
              <OrderedListOutlined className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>执行步骤</span>
              <span className={styles.sectionCount}>({steps.length})</span>
            </div>
            <div className={styles.stepsCompact}>
              {steps.map((step: any, index: number) => (
                <div key={index} className={styles.stepCompactItem}>
                  <span className={styles.stepNum}>{step.order}.</span>
                  <span className={styles.stepText}>{step.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 依赖清单 */}
        {dependencies.length > 0 && (
          <div className={styles.section}>
            <div className={`${styles.sectionHeader} ${styles.sectionHeaderDeps}`}>
              <ClusterOutlined className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>依赖清单</span>
              <span className={styles.sectionCount}>({dependencies.length})</span>
            </div>
            <div className={styles.depsList}>
              {dependencies.map((dep: any, index: number) => (
                <div key={index} className={styles.depItem}>
                  <Tag color="purple" className={styles.depType}>{dep.type}</Tag>
                  <span className={styles.depName}>{dep.name}</span>
                  <span className={styles.depDesc}>{dep.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 悬浮窗只在有额外详情且开关启用时显示
  const hoverEnabled = getGlobalHoverPanelEnabled();
  const showTooltip = hasExtraDetail && hoverEnabled;

  const tooltipContent = showTooltip ? renderDetailPopup() : null;

  // 条件渲染 Tooltip 来确保开关关闭时立即生效
  const tooltipElement = showTooltip ? (
    <Tooltip
      title={tooltipContent}
      placement="rightTop"
      overlayClassName={styles.detailTooltip}
      overlayInnerStyle={{ width: 420, maxWidth: 420, maxHeight: '80vh' }}
      mouseEnterDelay={0.2}
    >
      <div
        className={classNames(styles.nodeContainer, {
          [styles.hasDetail]: hasDetail,
          [styles.isVirtual]: isVirtual,
        })}
        style={hasDetail && !isVirtual ? { borderColor: nodeColor } : undefined}
      >
        {getNodeIndex(node.id) && (
          <div className={styles.nodeIndex}>{getNodeIndex(node.id)}</div>
        )}
        {nodeTypeName && (
          <div
            className={styles.nodeTypeBadge}
            style={{ backgroundColor: NODE_TYPE_COLORS[nodeTypeName] || '#8c8c8c' }}
          >
            {NODE_TYPE_NAMES[nodeTypeName] || nodeTypeName}
          </div>
        )}
        <img className={styles.nodeIcon} src={icon} alt="" />
        {displayName && (
          <span className={styles.nodeName}>{displayName}</span>
        )}
        {children}
      </div>
    </Tooltip>
  ) : (
    <div
      className={classNames(styles.nodeContainer, {
        [styles.hasDetail]: hasDetail,
        [styles.isVirtual]: isVirtual,
      })}
      style={hasDetail && !isVirtual ? { borderColor: nodeColor } : undefined}
    >
      {getNodeIndex(node.id) && (
        <div className={styles.nodeIndex}>{getNodeIndex(node.id)}</div>
      )}
      {nodeTypeName && (
        <div
          className={styles.nodeTypeBadge}
          style={{ backgroundColor: NODE_TYPE_COLORS[nodeTypeName] || '#8c8c8c' }}
        >
          {NODE_TYPE_NAMES[nodeTypeName] || nodeTypeName}
        </div>
      )}
      <img className={styles.nodeIcon} src={icon} alt="" />
      {displayName && (
        <span className={styles.nodeName}>{displayName}</span>
      )}
      {children}
    </div>
  );

  return tooltipElement;
};

export default NodeView;
