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
   */
  private static collectNodeDataFlows(nodes: Array<{
    id: string;
    name: string;
    inputParams?: any[];
    outputParams?: any[];
  }>): NodeDataFlow[] {
    return nodes
      .filter(node => node.id !== 'interface-info') // 排除接口节点
      .map(node => {
        const nodeIndex = getNodeIndex(node.id) || 999;
        return {
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
        };
      })
      .sort((a, b) => a.nodeIndex - b.nodeIndex);
  }

  /**
   * 构建上下文字段集合（去重合并）
   * 排序规则：先按 入/出 分类（入在前），同类内按最先使用节点顺序
   */
  private static buildContextFields(nodeDataFlows: NodeDataFlow[]): ContextField[] {
    const fieldMap = new Map<string, ContextField>();
    // 记录字段首次使用的节点索引（用于排序）
    const fieldFirstUsed = new Map<string, number>();

    // 按节点顺序遍历
    nodeDataFlows.forEach(node => {
      // 处理输出参数（写入）
      node.writes.forEach(param => {
        const existing = fieldMap.get(param.fieldName);
        if (existing) {
          existing.sourceNodeIds.push(node.nodeId);
        } else {
          fieldMap.set(param.fieldName, {
            ...param,
            firstSourceNodeId: node.nodeId,
            sourceNodeIds: [node.nodeId],
            consumerNodeIds: [],
          });
          // 记录首次使用节点索引（写入即首次使用）
          fieldFirstUsed.set(param.fieldName, node.nodeIndex);
        }
      });

      // 处理输入参数（读取）
      node.reads.forEach(param => {
        const existing = fieldMap.get(param.fieldName);
        if (existing) {
          if (!existing.consumerNodeIds.includes(node.nodeId)) {
            existing.consumerNodeIds.push(node.nodeId);
          }
        } else {
          // 字段在读取之前没有被写入（可能是接口输入参数）
          fieldMap.set(param.fieldName, {
            ...param,
            firstSourceNodeId: null,
            sourceNodeIds: [],
            consumerNodeIds: [node.nodeId],
          });
          // 记录首次使用节点索引（读取即首次使用）
          fieldFirstUsed.set(param.fieldName, node.nodeIndex);
        }
      });
    });

    // 排序：先按 入/出 分类（入在前），同类内按最先使用节点顺序
    return Array.from(fieldMap.values()).sort((a, b) => {
      // 入/出 分类：入(firstSourceNodeId === null)在前，出在后
      if (a.firstSourceNodeId === null && b.firstSourceNodeId !== null) return -1;
      if (a.firstSourceNodeId !== null && b.firstSourceNodeId === null) return 1;

      // 同类内按首次使用节点顺序
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
