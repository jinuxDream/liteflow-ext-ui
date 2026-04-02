// 全局节点序号管理

// 节点ID到序号的映射
let nodeIndexMap: Record<string, number> = {};
// 有内容的节点ID列表（按顺序）
let orderedNodeIds: string[] = [];

export interface NodeIndexItem {
  id: string;
  hasContent?: boolean;
}

// 更新节点序号映射
// 只给有内容的节点分配序号，接口节点（interface-info）始终分配序号1
export const updateNodeIndexMap = (nodes: NodeIndexItem[]) => {
  nodeIndexMap = {};
  orderedNodeIds = [];

  // 分离接口节点和其他节点
  const interfaceNode = nodes.find(n => n.id === 'interface-info');
  const otherNodes = nodes.filter(n => n.id !== 'interface-info');

  // 过滤出有内容的其他节点
  const contentNodes = otherNodes.filter(n => n.hasContent !== false);

  // 接口节点序号为1
  if (interfaceNode) {
    nodeIndexMap[interfaceNode.id] = 1;
    orderedNodeIds.push(interfaceNode.id);
  }

  // 有内容的节点从2开始分配序号
  contentNodes.forEach((node, index) => {
    nodeIndexMap[node.id] = (interfaceNode ? 2 : 1) + index;
    orderedNodeIds.push(node.id);
  });
};

// 获取节点的序号
export const getNodeIndex = (nodeId: string): number | null => {
  return nodeIndexMap[nodeId] || null;
};

// 获取有序节点列表
export const getOrderedNodeIds = (): string[] => {
  return orderedNodeIds;
};

// 清空序号映射
export const clearNodeIndexMap = () => {
  nodeIndexMap = {};
  orderedNodeIds = [];
};
