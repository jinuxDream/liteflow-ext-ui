/**
 * 数据血缘分析器
 * 用于分析流程中字段血缘关系，字段带上下文归属信息
 */

import { getNodeIndex } from '../context/NodeIndexContext';

/**
 * 字段状态
 */
export type FieldStatus = 'normal' | 'missing' | 'unused' | 'required' | 'circular' | 'typeMismatch';

/**
 * 字段角色
 */
export type FieldRole = 'input' | 'process' | 'output';

/**
 * 字段节点（血缘图谱中的节点）
 */
export interface FieldNode {
  /** 字段名 */
  fieldName: string;
  /** 所属上下文 */
  contextName: string;
  /** 字段类型 */
  fieldType: string;
  /** 描述 */
  description: string;
  /** 是否必须 */
  required: boolean;
  /** 字段角色：入参/过程/出参 */
  fieldRole: FieldRole;
  /** 问题状态 */
  status: FieldStatus;
  /** 首次写入该字段的节点ID */
  firstSourceNodeId: string | null;
  /** 写入该字段的节点ID列表 */
  sourceNodeIds: string[];
  /** 读取该字段的节点ID列表 */
  consumerNodeIds: string[];
  /** 布局层级 */
  layer: number;
  /** 布局 X 坐标 */
  layoutX: number;
  /** 布局 Y 坐标 */
  layoutY: number;
}

/**
 * 流转边（血缘图谱中的边）
 */
export interface FlowEdge {
  /** 边ID */
  id: string;
  /** 源字段名 */
  fromField: string;
  /** 目标字段名 */
  toField: string;
  /** 经过哪个节点 */
  viaNode: {
    nodeId: string;
    nodeName: string;
    nodeIndex: number;
    operation: 'write' | 'read' | 'readWrite';
  };
  /** 边状态 */
  status: 'normal' | 'missing' | 'circular';
}

/**
 * 节点信息（用于分析）
 */
export interface NodeInfo {
  nodeId: string;
  nodeName: string;
  nodeIndex: number;
  /** 输入参数（读取的字段） */
  inputParams: ParameterData[];
  /** 输出参数（写入的字段） */
  outputParams: ParameterData[];
}

/**
 * 参数数据
 */
export interface ParameterData {
  /** 所属上下文 */
  context?: string;
  fieldName: string;
  fieldType: string;
  description: string;
  required: boolean;
}

/**
 * 血缘图谱分析结果
 */
export interface LineageGraph {
  /** 字段节点映射（字段名 -> FieldNode） */
  fieldNodes: Map<string, FieldNode>;
  /** 字段节点列表（按层级排序） */
  fieldNodeList: FieldNode[];
  /** 流转边列表 */
  edges: FlowEdge[];
  /** 涉及的所有上下文 */
  contexts: string[];
  /** 节点信息列表（按顺序） */
  nodeInfos: NodeInfo[];
  /** 问题统计 */
  issueStats: {
    missingCount: number;
    unusedCount: number;
    requiredCount: number;
    circularCount: number;
    typeMismatchCount: number;
  };
}

/**
 * 默认上下文名称（参数没有 context 字段时使用）
 */
const DEFAULT_CONTEXT = 'DataContext';

/**
 * 接口入参虚拟节点ID
 */
const INTERFACE_INPUT_ID = 'interface-input';

/**
 * 接口出参虚拟节点ID
 */
const INTERFACE_OUTPUT_ID = 'interface-output';

/**
 * 数据血缘分析器
 */
export class LineageAnalyzer {
  /**
   * 分析数据血缘
   * @param nodes 节点列表，包含 id, name, inputParams, outputParams
   */
  static analyze(nodes: Array<{
    id: string;
    name: string;
    inputParams?: any[];
    outputParams?: any[];
  }>): LineageGraph {
    // 1. 收集节点信息（包含接口虚拟节点）
    const nodeInfos = this.collectNodeInfos(nodes);

    // 2. 分析字段节点
    const fieldNodes = this.analyzeFields(nodeInfos);

    // 3. 构建流转边
    const edges = this.buildEdges(nodeInfos, fieldNodes);

    // 4. 检测问题
    this.detectIssues(fieldNodes, nodeInfos);

    // 5. 计算布局
    this.computeLayout(fieldNodes);

    // 6. 生成结果
    const fieldNodeList = Array.from(fieldNodes.values())
      .sort((a, b) => a.layer - b.layer || a.layoutX - b.layoutX);

    const contexts = Array.from(new Set(fieldNodeList.map(f => f.contextName))).sort();

    const issueStats = this.calculateIssueStats(fieldNodeList);

    return {
      fieldNodes,
      fieldNodeList,
      edges,
      contexts,
      nodeInfos,
      issueStats,
    };
  }

  /**
   * 收集节点信息
   * 包含接口入参/出参虚拟节点
   */
  private static collectNodeInfos(nodes: Array<{
    id: string;
    name: string;
    inputParams?: any[];
    outputParams?: any[];
  }>): NodeInfo[] {
    const nodeInfos: NodeInfo[] = [];
    let interfaceInputNode: NodeInfo | null = null;
    let interfaceOutputNode: NodeInfo | null = null;

    nodes.forEach(node => {
      const nodeIndex = getNodeIndex(node.id) || 999;

      // 处理接口节点
      if (node.id === 'interface-info') {
        const inputs = (node.inputParams || []).map(p => ({
          context: p.context || DEFAULT_CONTEXT,
          fieldName: p.fieldName,
          fieldType: p.fieldType || 'Object',
          description: p.description || '',
          required: p.required || false,
        }));
        const outputs = (node.outputParams || []).map(p => ({
          context: p.context || DEFAULT_CONTEXT,
          fieldName: p.fieldName,
          fieldType: p.fieldType || 'Object',
          description: p.description || '',
          required: p.required || false,
        }));

        // 接口入参虚拟节点：写入入参到上下文
        if (inputs.length > 0) {
          interfaceInputNode = {
            nodeId: INTERFACE_INPUT_ID,
            nodeName: '接口入参',
            nodeIndex: 0,
            inputParams: [],
            outputParams: inputs,
          };
        }

        // 接口出参虚拟节点：读取出参作为最终输出
        if (outputs.length > 0) {
          interfaceOutputNode = {
            nodeId: INTERFACE_OUTPUT_ID,
            nodeName: '接口出参',
            nodeIndex: 999,
            inputParams: outputs,
            outputParams: [],
          };
        }
      } else {
        // 普通节点
        nodeInfos.push({
          nodeId: node.id,
          nodeName: node.name,
          nodeIndex,
          inputParams: (node.inputParams || []).map(p => ({
            context: p.context || DEFAULT_CONTEXT,
            fieldName: p.fieldName,
            fieldType: p.fieldType || 'Object',
            description: p.description || '',
            required: p.required || false,
          })),
          outputParams: (node.outputParams || []).map(p => ({
            context: p.context || DEFAULT_CONTEXT,
            fieldName: p.fieldName,
            fieldType: p.fieldType || 'Object',
            description: p.description || '',
            required: p.required || false,
          })),
        });
      }
    });

    // 插入虚拟节点
    if (interfaceInputNode) {
      nodeInfos.unshift(interfaceInputNode);
    }
    if (interfaceOutputNode) {
      nodeInfos.push(interfaceOutputNode);
    }

    return nodeInfos.sort((a, b) => a.nodeIndex - b.nodeIndex);
  }

  /**
   * 分析字段节点
   * 确定字段的上下文归属、角色、来源和消费者
   */
  private static analyzeFields(nodeInfos: NodeInfo[]): Map<string, FieldNode> {
    const fieldMap = new Map<string, FieldNode>();
    const fieldFirstUsed = new Map<string, number>();

    // 识别接口入参和出参
    const interfaceInputNode = nodeInfos.find(n => n.nodeId === INTERFACE_INPUT_ID);
    const interfaceOutputNode = nodeInfos.find(n => n.nodeId === INTERFACE_OUTPUT_ID);

    const interfaceInputFields = new Map<string, ParameterData>();
    const interfaceOutputFields = new Map<string, ParameterData>();

    // 记录接口入参
    interfaceInputNode?.outputParams.forEach(p => {
      interfaceInputFields.set(p.fieldName, p);
    });

    // 记录接口出参
    interfaceOutputNode?.inputParams.forEach(p => {
      interfaceOutputFields.set(p.fieldName, p);
    });

    // 先添加接口入参字段
    interfaceInputFields.forEach((param, fieldName) => {
      fieldMap.set(fieldName, {
        fieldName,
        contextName: param.context || DEFAULT_CONTEXT,
        fieldType: param.fieldType,
        description: param.description,
        required: param.required,
        fieldRole: 'input',
        status: 'normal',
        firstSourceNodeId: INTERFACE_INPUT_ID,
        sourceNodeIds: [INTERFACE_INPUT_ID],
        consumerNodeIds: [],
        layer: 0,
        layoutX: 0,
        layoutY: 0,
      });
      fieldFirstUsed.set(fieldName, 0);
    });

    // 添加接口出参字段（如果不是入参）
    interfaceOutputFields.forEach((param, fieldName) => {
      if (!fieldMap.has(fieldName)) {
        fieldMap.set(fieldName, {
          fieldName,
          contextName: param.context || DEFAULT_CONTEXT,
          fieldType: param.fieldType,
          description: param.description,
          required: param.required,
          fieldRole: 'output',
          status: 'normal',
          firstSourceNodeId: null,
          sourceNodeIds: [],
          consumerNodeIds: [INTERFACE_OUTPUT_ID],
          layer: 999,
          layoutX: 0,
          layoutY: 0,
        });
        fieldFirstUsed.set(fieldName, 999);
      } else {
        // 既是入参又是出参
        const existing = fieldMap.get(fieldName)!;
        existing.consumerNodeIds.push(INTERFACE_OUTPUT_ID);
      }
    });

    // 按节点顺序处理普通节点
    nodeInfos.forEach(node => {
      if (node.nodeId === INTERFACE_INPUT_ID || node.nodeId === INTERFACE_OUTPUT_ID) {
        return;
      }

      // 处理输入参数（读取）
      node.inputParams.forEach(param => {
        if (!fieldMap.has(param.fieldName)) {
          // 不是接口入参也不是接口出参 -> 过程变量
          fieldMap.set(param.fieldName, {
            fieldName: param.fieldName,
            contextName: param.context || DEFAULT_CONTEXT,
            fieldType: param.fieldType,
            description: param.description,
            required: param.required,
            fieldRole: 'process',
            status: 'normal',
            firstSourceNodeId: null,
            sourceNodeIds: [],
            consumerNodeIds: [node.nodeId],
            layer: 0,
            layoutX: 0,
            layoutY: 0,
          });
          if (!fieldFirstUsed.has(param.fieldName)) {
            fieldFirstUsed.set(param.fieldName, node.nodeIndex);
          }
        } else {
          const existing = fieldMap.get(param.fieldName)!;
          if (!existing.consumerNodeIds.includes(node.nodeId)) {
            existing.consumerNodeIds.push(node.nodeId);
          }
        }
      });

      // 处理输出参数（写入）
      node.outputParams.forEach(param => {
        const existing = fieldMap.get(param.fieldName);
        if (existing) {
          if (!existing.sourceNodeIds.includes(node.nodeId)) {
            existing.sourceNodeIds.push(node.nodeId);
          }
          if (existing.firstSourceNodeId === null) {
            existing.firstSourceNodeId = node.nodeId;
          }
          // 更新上下文信息（如果节点有更详细的描述）
          if (!existing.description && param.description) {
            existing.description = param.description;
          }
        } else {
          // 过程变量
          fieldMap.set(param.fieldName, {
            fieldName: param.fieldName,
            contextName: param.context || DEFAULT_CONTEXT,
            fieldType: param.fieldType,
            description: param.description,
            required: param.required,
            fieldRole: 'process',
            status: 'normal',
            firstSourceNodeId: node.nodeId,
            sourceNodeIds: [node.nodeId],
            consumerNodeIds: [],
            layer: 0,
            layoutX: 0,
            layoutY: 0,
          });
          if (!fieldFirstUsed.has(param.fieldName)) {
            fieldFirstUsed.set(param.fieldName, node.nodeIndex);
          }
        }
      });
    });

    return fieldMap;
  }

  /**
   * 构建流转边
   * 表示字段之间的流转关系，标注经过的节点
   */
  private static buildEdges(nodeInfos: NodeInfo[], fieldNodes: Map<string, FieldNode>): FlowEdge[] {
    const edges: FlowEdge[] = [];
    const fieldLastWriter = new Map<string, { nodeId: string; nodeName: string; nodeIndex: number }>();

    nodeInfos.forEach(node => {
      // 处理读取：找到最近的上游写入节点
      node.inputParams.forEach(param => {
        const lastWriter = fieldLastWriter.get(param.fieldName);
        if (lastWriter) {
          // 创建边：从源字段 -> 经过节点 -> 当前字段
          edges.push({
            id: `${param.fieldName}:${lastWriter.nodeId}:${node.nodeId}:read`,
            fromField: param.fieldName,
            toField: param.fieldName,
            viaNode: {
              nodeId: lastWriter.nodeId,
              nodeName: lastWriter.nodeName,
              nodeIndex: lastWriter.nodeIndex,
              operation: 'read',
            },
            status: 'normal',
          });
        }
      });

      // 处理写入：更新字段的最新写入者
      node.outputParams.forEach(param => {
        fieldLastWriter.set(param.fieldName, {
          nodeId: node.nodeId,
          nodeName: node.nodeName,
          nodeIndex: node.nodeIndex,
        });

        // 如果这个字段之前有消费者，创建写入边
        const field = fieldNodes.get(param.fieldName);
        if (field && field.consumerNodeIds.length > 0) {
          // 写入边：字段被写入后流向消费者
          field.consumerNodeIds.forEach(consumerId => {
            const consumerNode = nodeInfos.find(n => n.nodeId === consumerId);
            if (consumerNode && consumerId !== node.nodeId) {
              edges.push({
                id: `${param.fieldName}:${node.nodeId}:${consumerId}:write`,
                fromField: param.fieldName,
                toField: param.fieldName,
                viaNode: {
                  nodeId: node.nodeId,
                  nodeName: node.nodeName,
                  nodeIndex: node.nodeIndex,
                  operation: 'write',
                },
                status: 'normal',
              });
            }
          });
        }
      });
    });

    return edges;
  }

  /**
   * 检测问题状态
   */
  private static detectIssues(fieldNodes: Map<string, FieldNode>, nodeInfos: NodeInfo[]): void {
    // 统计每个字段被实际消费的次数（排除接口出参）
    const fieldConsumedByNodes = new Map<string, string[]>();
    nodeInfos.forEach(node => {
      if (node.nodeId === INTERFACE_OUTPUT_ID) return;
      node.inputParams.forEach(p => {
        if (!fieldConsumedByNodes.has(p.fieldName)) {
          fieldConsumedByNodes.set(p.fieldName, []);
        }
        const consumers = fieldConsumedByNodes.get(p.fieldName)!;
        if (!consumers.includes(node.nodeId)) {
          consumers.push(node.nodeId);
        }
      });
    });

    // 检测循环依赖
    const circularFields = this.detectCircularDependency(nodeInfos);

    // 检测类型不匹配
    const typeMismatchFields = this.detectTypeMismatch(nodeInfos);

    // 更新字段状态
    fieldNodes.forEach(field => {
      const consumers = fieldConsumedByNodes.get(field.fieldName) || [];
      const hasRealConsumers = consumers.length > 0;
      const hasProvider = field.firstSourceNodeId !== null;

      // 缺失：被读取但没有提供者（不是接口入参）
      if (!hasProvider && hasRealConsumers && field.firstSourceNodeId === null) {
        field.status = 'missing';
      }
      // 未消费：有提供者但没有实际消费者（不是接口入参）
      else if (hasProvider && field.firstSourceNodeId !== INTERFACE_INPUT_ID && !hasRealConsumers) {
        field.status = 'unused';
      }
      // 必须入参：接口入参但必须
      else if (field.fieldRole === 'input' && field.required) {
        field.status = 'required';
      }

      // 循环依赖
      if (circularFields.has(field.fieldName)) {
        field.status = 'circular';
      }

      // 类型不匹配
      if (typeMismatchFields.has(field.fieldName)) {
        field.status = 'typeMismatch';
      }
    });
  }

  /**
   * 检测循环依赖
   */
  private static detectCircularDependency(nodeInfos: NodeInfo[]): Set<string> {
    const circularFields = new Set<string>();

    // 构建节点依赖图
    const nodeDependencies = new Map<string, Set<string>>();
    const fieldWriters = new Map<string, string[]>();

    nodeInfos.forEach(node => {
      if (node.nodeId === INTERFACE_INPUT_ID || node.nodeId === INTERFACE_OUTPUT_ID) return;

      node.outputParams.forEach(p => {
        if (!fieldWriters.has(p.fieldName)) {
          fieldWriters.set(p.fieldName, []);
        }
        fieldWriters.get(p.fieldName)!.push(node.nodeId);
      });
    });

    nodeInfos.forEach(node => {
      if (node.nodeId === INTERFACE_INPUT_ID || node.nodeId === INTERFACE_OUTPUT_ID) return;

      node.inputParams.forEach(p => {
        const writers = fieldWriters.get(p.fieldName) || [];
        writers.forEach(writerId => {
          if (writerId !== node.nodeId) {
            if (!nodeDependencies.has(node.nodeId)) {
              nodeDependencies.set(node.nodeId, new Set());
            }
            nodeDependencies.get(node.nodeId)!.add(writerId);
          }
        });
      });
    });

    // DFS 检测循环
    const detectCycle = (startNodeId: string, currentPath: string[]): string[] | null => {
      const deps = nodeDependencies.get(currentPath[currentPath.length - 1]);
      if (!deps) return null;

      for (const depId of deps) {
        if (depId === startNodeId) {
          return [...currentPath, depId];
        }
        if (!currentPath.includes(depId)) {
          const result = detectCycle(startNodeId, [...currentPath, depId]);
          if (result) return result;
        }
      }
      return null;
    };

    const nodesWithCycles = new Set<string>();
    nodeInfos.forEach(node => {
      if (node.nodeId === INTERFACE_INPUT_ID || node.nodeId === INTERFACE_OUTPUT_ID) return;

      const cycle = detectCycle(node.nodeId, [node.nodeId]);
      if (cycle) {
        cycle.forEach(n => nodesWithCycles.add(n));
      }
    });

    // 标记涉及循环的字段
    nodeInfos.forEach(node => {
      if (nodesWithCycles.has(node.nodeId)) {
        node.outputParams.forEach(p => {
          circularFields.add(p.fieldName);
        });
      }
    });

    return circularFields;
  }

  /**
   * 检测类型不匹配
   */
  private static detectTypeMismatch(nodeInfos: NodeInfo[]): Set<string> {
    const typeMismatchFields = new Set<string>();
    const fieldTypeMap = new Map<string, { nodeId: string; type: string; isWrite: boolean }[]>();

    nodeInfos.forEach(node => {
      node.outputParams.forEach(p => {
        if (!fieldTypeMap.has(p.fieldName)) {
          fieldTypeMap.set(p.fieldName, []);
        }
        fieldTypeMap.get(p.fieldName)!.push({
          nodeId: node.nodeId,
          type: p.fieldType,
          isWrite: true,
        });
      });
      node.inputParams.forEach(p => {
        if (!fieldTypeMap.has(p.fieldName)) {
          fieldTypeMap.set(p.fieldName, []);
        }
        fieldTypeMap.get(p.fieldName)!.push({
          nodeId: node.nodeId,
          type: p.fieldType,
          isWrite: false,
        });
      });
    });

    fieldTypeMap.forEach((entries, fieldName) => {
      const writeEntries = entries.filter(e => e.isWrite);
      const readEntries = entries.filter(e => !e.isWrite);

      writeEntries.forEach(writeEntry => {
        readEntries.forEach(readEntry => {
          if (writeEntry.type !== readEntry.type &&
              writeEntry.type !== 'Object' &&
              readEntry.type !== 'Object') {
            typeMismatchFields.add(fieldName);
          }
        });
      });
    });

    return typeMismatchFields;
  }

  /**
   * 计算分层布局
   */
  private static computeLayout(fieldNodes: Map<string, FieldNode>): void {
    // 分层策略：
    // 层 0: 接口入参
    // 层 1-999: 按首次写入节点的顺序
    // 层 1000: 接口出参

    const layerFields = new Map<number, string[]>();

    fieldNodes.forEach(field => {
      let layer: number;

      if (field.fieldRole === 'input') {
        layer = 0;
      } else if (field.fieldRole === 'output') {
        layer = 1000;
      } else {
        // 过程变量：按首次写入节点序号
        const sourceNodeIndex = field.firstSourceNodeId ?
          getNodeIndex(field.firstSourceNodeId) || 1 : 1;
        layer = sourceNodeIndex;
      }

      field.layer = layer;

      if (!layerFields.has(layer)) {
        layerFields.set(layer, []);
      }
      layerFields.get(layer)!.push(field.fieldName);
    });

    // 同层内按上下文分组排列
    const sortedLayers = Array.from(layerFields.keys()).sort((a, b) => a - b);

    sortedLayers.forEach(layer => {
      const fields = layerFields.get(layer)!;

      // 按上下文分组
      const contextGroups = new Map<string, string[]>();
      fields.forEach(fieldName => {
        const field = fieldNodes.get(fieldName)!;
        const context = field.contextName;
        if (!contextGroups.has(context)) {
          contextGroups.set(context, []);
        }
        contextGroups.get(context)!.push(fieldName);
      });

      // 计算同层内的 X 坐标
      let x = 0;
      const contextsSorted = Array.from(contextGroups.keys()).sort();

      contextsSorted.forEach(context => {
        const contextFields = contextGroups.get(context)!;
        contextFields.forEach(fieldName => {
          const field = fieldNodes.get(fieldName)!;
          field.layoutX = x;
          field.layoutY = layer;
          x++;
        });
        // 上下文之间间隔
        x += 0.5;
      });
    });
  }

  /**
   * 计算问题统计
   */
  private static calculateIssueStats(fieldNodeList: FieldNode[]): LineageGraph['issueStats'] {
    return {
      missingCount: fieldNodeList.filter(f => f.status === 'missing').length,
      unusedCount: fieldNodeList.filter(f => f.status === 'unused').length,
      requiredCount: fieldNodeList.filter(f => f.status === 'required').length,
      circularCount: fieldNodeList.filter(f => f.status === 'circular').length,
      typeMismatchCount: fieldNodeList.filter(f => f.status === 'typeMismatch').length,
    };
  }
}