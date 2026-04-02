/**
 * 数据流分析工具
 * 用于分析流程中上下文字段的流转关系
 */

import { getNodeIndex } from '../context/NodeIndexContext';

/**
 * 字段信息
 */
export interface FieldInfo {
  fieldName: string;
  fieldType: string;
  description: string;
  required: boolean;
}

/**
 * 上下文字段（增强版）
 */
export interface ContextField extends FieldInfo {
  /** 是否是入参（第一个节点接收的参数） */
  isInput: boolean;
  /** 是否是出参（最后一个节点产出且没有被后续消费） */
  isOutput: boolean;
  /** 是否是过程变量（中间流转） */
  isProcess: boolean;
  /** 首次写入该字段的节点ID */
  firstSourceNodeId: string | null;
  /** 写入该字段的节点ID列表 */
  sourceNodeIds: string[];
  /** 读取该字段的节点ID列表 */
  consumerNodeIds: string[];
}

/**
 * 节点的数据流信息
 */
export interface NodeDataFlow {
  nodeId: string;
  nodeName: string;
  nodeIndex: number;
  /** 读取的字段 */
  reads: FieldInfo[];
  /** 写入的字段 */
  writes: FieldInfo[];
}

/**
 * 字段流转关系
 */
export interface FieldFlow {
  fieldName: string;
  fromNodeId: string;
  toNodeId: string;
}

/**
 * 矩阵单元格
 */
export interface MatrixCell {
  fieldName: string;
  nodeId: string;
  isRead: boolean;
  isWrite: boolean;
  isFirstWrite: boolean;
}

/**
 * 数据流分析结果
 */
export interface DataFlowAnalysis {
  /** 完整的上下文字段集合 */
  contextFields: ContextField[];
  /** 按执行顺序排列的节点数据流 */
  nodeDataFlows: NodeDataFlow[];
  /** 字段流转关系列表 */
  fieldFlows: FieldFlow[];
  /** 字段-节点矩阵 */
  matrix: {
    fields: ContextField[];
    nodes: NodeDataFlow[];
    cells: Map<string, MatrixCell>;
  };
}

/**
 * 数据流分析器
 */
export class DataFlowAnalyzer {
  /**
   * 分析数据流
   * @param nodes 节点列表，包含 id, name, inputParams, outputParams
   */
  static analyze(nodes: Array<{
    id: string;
    name: string;
    inputParams?: any[];
    outputParams?: any[];
  }>): DataFlowAnalysis {
    // 1. 收集节点数据流
    const nodeDataFlows = this.collectNodeDataFlows(nodes);

    // 2. 构建上下文字段集合
    const contextFields = this.buildContextFields(nodeDataFlows);

    // 3. 分析字段流转关系
    const fieldFlows = this.analyzeFieldFlows(nodeDataFlows);

    // 4. 构建矩阵
    const matrix = this.buildMatrix(contextFields, nodeDataFlows);

    return {
      contextFields,
      nodeDataFlows,
      fieldFlows,
      matrix,
    };
  }

  /**
   * 收集节点数据流
   * 包含接口节点的输入输出参数
   */
  private static collectNodeDataFlows(nodes: Array<{
    id: string;
    name: string;
    inputParams?: any[];
    outputParams?: any[];
  }>): NodeDataFlow[] {
    const nodeDataFlows: NodeDataFlow[] = [];
    // 记录接口节点（用于添加虚拟的接口节点）
    let interfaceInputNode: NodeDataFlow | null = null;
    let interfaceOutputNode: NodeDataFlow | null = null;

    // 按节点顺序遍历
    nodes.forEach(node => {
      const nodeIndex = getNodeIndex(node.id) || 999;

      if (node.id === 'interface-info') {
        // 接口信息节点：提取接口的输入输出作为独立的"接口节点"
        const inputs = (node.inputParams || []).map(p => ({
          fieldName: p.fieldName,
          fieldType: p.fieldType || 'Object',
          description: p.description || '',
          required: p.required || false,
        }));
        const outputs = (node.outputParams || []).map(p => ({
          fieldName: p.fieldName,
          fieldType: p.fieldType || 'Object',
          description: p.description || '',
          required: p.required || false,
        }));

        if (inputs.length > 0) {
          // 接口入参节点：写入入参字段到上下文
          interfaceInputNode = {
            nodeId: 'interface-input',
            nodeName: '接口入参',
            nodeIndex: -2,  // 最前面
            reads: [],
            writes: inputs,
          };
        }

        if (outputs.length > 0) {
          // 接口出参节点：读取出参字段（作为最终输出）
          interfaceOutputNode = {
            nodeId: 'interface-output',
            nodeName: '接口出参',
            nodeIndex: 999,  // 最后面
            reads: outputs,
            writes: [],
          };
        }
      } else {
        nodeDataFlows.push({
          nodeId: node.id,
          nodeName: node.name,
          nodeIndex,
          reads: (node.inputParams || []).map(p => ({
            fieldName: p.fieldName,
            fieldType: p.fieldType || 'Object',
            description: p.description || '',
            required: p.required || false,
          })),
          writes: (node.outputParams || []).map(p => ({
            fieldName: p.fieldName,
            fieldType: p.fieldType || 'Object',
            description: p.description || '',
            required: p.required || false,
          })),
        });
      }
    });

    // 将接口节点插入到适当位置
    if (interfaceInputNode) {
      nodeDataFlows.unshift(interfaceInputNode);
    }
    if (interfaceOutputNode) {
      nodeDataFlows.push(interfaceOutputNode);
    }

    return nodeDataFlows.sort((a, b) => a.nodeIndex - b.nodeIndex);
  }

  /**
   * 构建上下文字段集合（去重合并）
   * 入参：接口入参节点写入的字段
   * 出参：接口出参节点读取的字段
   * 过程：只在节点间流转的中间变量（不是接口入参也不是接口出参）
   */
  private static buildContextFields(nodeDataFlows: NodeDataFlow[]): ContextField[] {
    const fieldMap = new Map<string, ContextField>();
    // 记录字段首次出现的节点索引（用于排序）
    const fieldFirstUsed = new Map<string, number>();

    // 提取接口入参和出参
    const interfaceInputNode = nodeDataFlows.find(n => n.nodeId === 'interface-input');
    const interfaceOutputNode = nodeDataFlows.find(n => n.nodeId === 'interface-output');
    const interfaceInputFields = new Map<string, FieldInfo>();
    const interfaceOutputFields = new Map<string, FieldInfo>();

    // 记录接口入参（虚拟节点写入的字段，代表外部传入）
    interfaceInputNode?.writes.forEach(w => {
      interfaceInputFields.set(w.fieldName, w);
    });
    // 记录接口出参（虚拟节点读取的字段，代表返回给外部）
    interfaceOutputNode?.reads.forEach(r => {
      interfaceOutputFields.set(r.fieldName, r);
    });

    // 先添加接口入参到字段列表
    interfaceInputFields.forEach((param, fieldName) => {
      fieldMap.set(fieldName, {
        ...param,
        isInput: true,
        isOutput: false,
        isProcess: false,
        firstSourceNodeId: 'interface-input',
        sourceNodeIds: ['interface-input'],
        consumerNodeIds: [],
      });
      fieldFirstUsed.set(fieldName, -2);
    });

    // 添加接口出参到字段列表
    interfaceOutputFields.forEach((param, fieldName) => {
      if (!fieldMap.has(fieldName)) {
        // 只是出参（不是入参）
        fieldMap.set(fieldName, {
          ...param,
          isInput: false,
          isOutput: true,
          isProcess: false,
          firstSourceNodeId: null,
          sourceNodeIds: [],
          consumerNodeIds: ['interface-output'],
        });
        fieldFirstUsed.set(fieldName, 999);
      } else {
        // 既是入参又是出参 -> 保持入参标记（因为它确实是接口入参）
        const existing = fieldMap.get(fieldName)!;
        existing.consumerNodeIds.push('interface-output');
      }
    });

    // 按节点顺序遍历（排除接口虚拟节点）
    nodeDataFlows.forEach(node => {
      if (node.nodeId === 'interface-input' || node.nodeId === 'interface-output') {
        return;
      }

      // 处理输入参数（读取）
      node.reads.forEach(param => {
        if (!fieldMap.has(param.fieldName)) {
          // 不是接口入参也不是接口出参 -> 过程变量
          fieldMap.set(param.fieldName, {
            ...param,
            isInput: false,
            isOutput: false,
            isProcess: true,
            firstSourceNodeId: null,
            sourceNodeIds: [],
            consumerNodeIds: [node.nodeId],
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
      node.writes.forEach(param => {
        const existing = fieldMap.get(param.fieldName);
        if (existing) {
          if (!existing.sourceNodeIds.includes(node.nodeId)) {
            existing.sourceNodeIds.push(node.nodeId);
          }
          if (existing.firstSourceNodeId === null) {
            existing.firstSourceNodeId = node.nodeId;
          }
        } else {
          // 不是接口入参也不是接口出参 -> 过程变量
          fieldMap.set(param.fieldName, {
            ...param,
            isInput: false,
            isOutput: false,
            isProcess: true,
            firstSourceNodeId: node.nodeId,
            sourceNodeIds: [node.nodeId],
            consumerNodeIds: [],
          });
          if (!fieldFirstUsed.has(param.fieldName)) {
            fieldFirstUsed.set(param.fieldName, node.nodeIndex);
          }
        }
      });
    });

    // 排序：入参 > 过程 > 出参，同类内按首次使用节点顺序
    return Array.from(fieldMap.values()).sort((a, b) => {
      if (a.isInput !== b.isInput) return a.isInput ? -1 : 1;
      if (a.isProcess !== b.isProcess) return a.isProcess ? -1 : 1;
      if (a.isOutput !== b.isOutput) return a.isOutput ? -1 : 1;
      const indexA = fieldFirstUsed.get(a.fieldName) || 999;
      const indexB = fieldFirstUsed.get(b.fieldName) || 999;
      return indexA - indexB;
    });
  }

  /**
   * 分析字段流转关系
   */
  private static analyzeFieldFlows(nodeDataFlows: NodeDataFlow[]): FieldFlow[] {
    const flows: FieldFlow[] = [];
    const fieldLastWriter = new Map<string, string>();

    // 按节点顺序遍历
    nodeDataFlows.forEach(node => {
      // 分析读取：找到最近的上游写入节点
      node.reads.forEach(param => {
        const lastWriter = fieldLastWriter.get(param.fieldName);
        if (lastWriter) {
          flows.push({
            fieldName: param.fieldName,
            fromNodeId: lastWriter,
            toNodeId: node.nodeId,
          });
        }
      });

      // 更新字段的最新写入者
      node.writes.forEach(param => {
        fieldLastWriter.set(param.fieldName, node.nodeId);
      });
    });

    return flows;
  }

  /**
   * 构建字段-节点矩阵
   */
  private static buildMatrix(
    contextFields: ContextField[],
    nodeDataFlows: NodeDataFlow[]
  ): DataFlowAnalysis['matrix'] {
    const cells = new Map<string, MatrixCell>();

    // 记录每个字段的首次写入节点
    const firstWriteMap = new Map<string, string>();
    nodeDataFlows.forEach(node => {
      node.writes.forEach(param => {
        if (!firstWriteMap.has(param.fieldName)) {
          firstWriteMap.set(param.fieldName, node.nodeId);
        }
      });
    });

    contextFields.forEach(field => {
      nodeDataFlows.forEach(node => {
        const isRead = node.reads.some(r => r.fieldName === field.fieldName);
        const isWrite = node.writes.some(w => w.fieldName === field.fieldName);
        const isFirstWrite = firstWriteMap.get(field.fieldName) === node.nodeId;

        cells.set(`${field.fieldName}:${node.nodeId}`, {
          fieldName: field.fieldName,
          nodeId: node.nodeId,
          isRead,
          isWrite,
          isFirstWrite,
        });
      });
    });

    return {
      fields: contextFields,
      nodes: nodeDataFlows,
      cells,
    };
  }
}
