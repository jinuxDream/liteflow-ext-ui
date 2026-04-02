import React, { useMemo, useState } from 'react';
import { Table, Tag, Tooltip } from 'antd';
import { DatabaseOutlined, ApiOutlined, CloudServerOutlined } from '@ant-design/icons';
import { getNodeIndex } from '../../context/NodeIndexContext';
import styles from './index.module.less';

/**
 * 依赖信息
 */
export interface DependencyInfo {
  name: string;
  type: string;
  description?: string;
}

/**
 * 依赖视图组件
 * 以矩阵形式展示节点与依赖的关系
 */
interface DependencyViewProps {
  nodes: Array<{
    id: string;
    name: string;
    dependencies?: DependencyInfo[];
  }>;
  onNodeClick?: (nodeId: string) => void;
  onDependencyClick?: (depName: string) => void;
}

const DependencyView: React.FC<DependencyViewProps> = ({
  nodes,
  onNodeClick,
  onDependencyClick
}) => {
  const [selectedDep, setSelectedDep] = useState<string | null>(null);

  // 按节点顺序过滤和排序节点
  const sortedNodes = useMemo(() => {
    return nodes
      .filter(node => node.id !== 'interface-info') // 排除接口节点
      .filter(node => node.dependencies && node.dependencies.length > 0) // 只保留有依赖的节点
      .sort((a, b) => {
        const indexA = getNodeIndex(a.id) || 999;
        const indexB = getNodeIndex(b.id) || 999;
        return indexA - indexB;
      });
  }, [nodes]);

  // 收集所有依赖并去重
  const allDependencies = useMemo(() => {
    const depMap = new Map<string, { name: string; type: string; description: string }>();

    sortedNodes.forEach(node => {
      node.dependencies?.forEach(dep => {
        if (!depMap.has(dep.name)) {
          depMap.set(dep.name, {
            name: dep.name,
            type: dep.type || 'UNKNOWN',
            description: dep.description || '',
          });
        }
      });
    });

    // 按类型排序：DB > RPC > REDIS/CACHE > 其他
    const typeOrder: Record<string, number> = {
      'DB': 1,
      'RPC': 2,
      'REDIS': 3,
      'CACHE': 3,
      'UNKNOWN': 99,
    };

    return Array.from(depMap.values()).sort((a, b) => {
      const orderA = typeOrder[a.type?.toUpperCase()] || 99;
      const orderB = typeOrder[b.type?.toUpperCase()] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }, [sortedNodes]);

  // 获取依赖图标
  const getDepIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'DB': return <DatabaseOutlined />;
      case 'RPC': return <ApiOutlined />;
      case 'REDIS':
      case 'CACHE': return <CloudServerOutlined />;
      default: return <ApiOutlined />;
    }
  };

  // 获取依赖颜色
  const getDepColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'DB': return 'blue';
      case 'RPC': return 'green';
      case 'REDIS':
      case 'CACHE': return 'orange';
      default: return 'default';
    }
  };

  // 渲染依赖单元格
  const renderDependencyCell = (depName: string, node: typeof sortedNodes[0]) => {
    const hasDep = node.dependencies?.some(d => d.name === depName);

    if (!hasDep) {
      return <span className={styles.cellEmpty}>-</span>;
    }

    const dep = node.dependencies?.find(d => d.name === depName);

    return (
      <Tooltip title={dep?.description || depName}>
        <Tag color={getDepColor(dep?.type || '')} className={styles.depTag}>
          {getDepIcon(dep?.type || '')}
        </Tag>
      </Tooltip>
    );
  };

  // 渲染矩阵视图
  const renderMatrix = () => {
    if (allDependencies.length === 0 || sortedNodes.length === 0) {
      return <div className={styles.emptyText}>暂无依赖数据</div>;
    }

    // 生成表头
    const columns = [
      {
        title: '依赖',
        dataIndex: 'name',
        key: 'name',
        fixed: 'left' as const,
        width: 150,
        render: (text: string, record: typeof allDependencies[0]) => (
          <div
            className={`${styles.depNameCell} ${selectedDep === text ? styles.selected : ''}`}
            onClick={() => {
              setSelectedDep(prev => prev === text ? null : text);
              onDependencyClick?.(text);
            }}
          >
            <Tag color={getDepColor(record.type)} style={{ marginRight: 6 }}>
              {getDepIcon(record.type)}
            </Tag>
            <span>{text}</span>
          </div>
        ),
      },
      ...sortedNodes.map(node => ({
        title: (
          <div
            className={styles.nodeHeader}
            onClick={() => onNodeClick?.(node.id)}
          >
            <span className={styles.nodeIndex}>{getNodeIndex(node.id)}</span>
            <span className={styles.nodeName}>{node.name}</span>
          </div>
        ),
        dataIndex: node.id,
        key: node.id,
        width: 80,
        align: 'center' as const,
        render: () => {
          const depName = selectedDep;
          if (!depName) {
            // 如果没有选中依赖，显示该节点的所有依赖
            const deps = node.dependencies || [];
            if (deps.length === 0) return <span className={styles.cellEmpty}>-</span>;
            return (
              <div className={styles.depTags}>
                {deps.map((dep, i) => (
                  <Tag key={i} color={getDepColor(dep.type)} className={styles.depTag}>
                    {getDepIcon(dep.type)}
                  </Tag>
                ))}
              </div>
            );
          }
          // 如果选中了依赖，显示该节点是否使用此依赖
          return renderDependencyCell(depName, node);
        },
      })),
    ];

    return (
      <div className={styles.matrixContainer}>
        <Table
          dataSource={allDependencies}
          columns={columns}
          rowKey="name"
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          className={styles.matrixTable}
          rowClassName={(record) => selectedDep === record.name ? styles.highlightRow : ''}
        />
      </div>
    );
  };

  // 渲染图例
  const renderLegend = () => (
    <div className={styles.legend}>
      <span className={styles.legendItem}>
        <Tag color="blue"><DatabaseOutlined /></Tag>
        <span>DB</span>
      </span>
      <span className={styles.legendItem}>
        <Tag color="green"><ApiOutlined /></Tag>
        <span>RPC</span>
      </span>
      <span className={styles.legendItem}>
        <Tag color="orange"><CloudServerOutlined /></Tag>
        <span>Redis/Cache</span>
      </span>
    </div>
  );

  return (
    <div className={styles.dependencyView}>
      <div className={styles.mainContent}>
        {renderMatrix()}
      </div>
      <div className={styles.legend}>
        {renderLegend()}
      </div>
    </div>
  );
};

export default DependencyView;
