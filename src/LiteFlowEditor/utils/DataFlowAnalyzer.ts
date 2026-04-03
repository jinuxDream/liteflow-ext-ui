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
  /** 行状态映射（字段名 -> 行状态） */
  rowStatusMap: Map<string, RowStatus>;
}

/**
 * 行状态（用于标记行的特殊状态）
 */
export interface RowStatus {
  /** 是否依赖入参（首次写入但实际上是接口入参） */
  isDependsOnInput: boolean;
  /** 依赖的入参是否必须（仅当 isDependsOnInput 为 true 时有效） */
  isInputRequired: boolean;
  /** 是否未被消费（首次写入但没有被任何节点读取） */
  isUnused: boolean;
  /** 是否存在循环依赖 */
  hasCircularDependency: boolean;
  /** 循环依赖涉及的节点 */
  circularDependencyNodes: string[];
  /** 是否缺失（被读取但没有任何节点提供） */
  isMissing: boolean;
  /** 缺失该字段的节点（读取但未找到提供者） */
  missingInNodes: string[];
  /** 是否存在类型不匹配 */
  hasTypeMismatch: boolean;
  /** 类型不匹配详情 */
  typeMismatchDetails: TypeMismatchInfo[];
}

/**
 * 类型不匹配信息
 */
export interface TypeMismatchInfo {
  fieldName: string;
  writeNodeId: string;
  writeNodeType: string;
  readNodeId: string;
  readNodeType: string;
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

    // 5. 分析行状态
    const rowStatusMap = this.analyzeRowStatus(contextFields, nodeDataFlows);

    return {
      contextFields,
      nodeDataFlows,
      fieldFlows,
      matrix,
      rowStatusMap,
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

  /**
   * 分析节点影响范围
   * @param nodeId 要分析的节点ID
   * @param nodeDataFlows 节点数据流列表
   * @param contextFields 上下文字段列表
   * @returns 节点影响分析结果
   */
  static analyzeNodeImpact(
    nodeId: string,
    nodeDataFlows: NodeDataFlow[],
    contextFields: ContextField[]
  ): {
    // 节点的输入参数及其来源
    inputs: Array<{
      fieldName: string;
      fieldType: string;
      description: string;
      // 字段的来源节点（上游）
      sourceNodes: Array<{
        nodeId: string;
        nodeName: string;
        nodeIndex: number;
      }>;
    }>;
    // 节点的输出参数及其去向
    outputs: Array<{
      fieldName: string;
      fieldType: string;
      description: string;
      // 字段的消费节点（下游）
      consumerNodes: Array<{
        nodeId: string;
        nodeName: string;
        nodeIndex: number;
      }>;
    }>;
    // 上游影响节点（提供输入的节点）
    upstreamNodes: Array<{
      nodeId: string;
      nodeName: string;
      nodeIndex: number;
      providedFields: string[];
    }>;
    // 下游影响节点（消费输出的节点）
    downstreamNodes: Array<{
      nodeId: string;
      nodeName: string;
      nodeIndex: number;
      consumedFields: string[];
    }>;
    // 影响摘要
    summary: {
      inputCount: number;
      outputCount: number;
      upstreamNodeCount: number;
      downstreamNodeCount: number;
    };
  } {
    const targetNode = nodeDataFlows.find(n => n.nodeId === nodeId);
    if (!targetNode) {
      return {
        inputs: [],
        outputs: [],
        upstreamNodes: [],
        downstreamNodes: [],
        summary: { inputCount: 0, outputCount: 0, upstreamNodeCount: 0, downstreamNodeCount: 0 },
      };
    }

    // 分析输入参数
    const inputs: typeof impactResult.inputs = [];
    const upstreamNodeMap = new Map<string, { nodeName: string; nodeIndex: number; fields: string[] }>();

    targetNode.reads.forEach(param => {
      const field = contextFields.find(f => f.fieldName === param.fieldName);
      const sourceNodes: typeof inputs[0]['sourceNodes'] = [];

      // 找到这个字段的来源节点
      if (field) {
        field.sourceNodeIds.forEach(srcNodeId => {
          if (srcNodeId !== nodeId && srcNodeId !== 'interface-input') {
            const srcNode = nodeDataFlows.find(n => n.nodeId === srcNodeId);
            if (srcNode) {
              sourceNodes.push({
                nodeId: srcNode.nodeId,
                nodeName: srcNode.nodeName,
                nodeIndex: srcNode.nodeIndex,
              });
              // 记录上游节点
              if (!upstreamNodeMap.has(srcNodeId)) {
                upstreamNodeMap.set(srcNodeId, {
                  nodeName: srcNode.nodeName,
                  nodeIndex: srcNode.nodeIndex,
                  fields: [],
                });
              }
              upstreamNodeMap.get(srcNodeId)!.fields.push(param.fieldName);
            }
          } else if (srcNodeId === 'interface-input') {
            // 接口入参
            sourceNodes.push({
              nodeId: 'interface-input',
              nodeName: '接口入参',
              nodeIndex: -2,
            });
          }
        });
      }

      inputs.push({
        fieldName: param.fieldName,
        fieldType: param.fieldType,
        description: param.description || field?.description || '',
        sourceNodes,
      });
    });

    // 分析输出参数
    const outputs: typeof impactResult.outputs = [];
    const downstreamNodeMap = new Map<string, { nodeName: string; nodeIndex: number; fields: string[] }>();

    targetNode.writes.forEach(param => {
      const field = contextFields.find(f => f.fieldName === param.fieldName);
      const consumerNodes: typeof outputs[0]['consumerNodes'] = [];

      // 找到这个字段的消费节点
      if (field) {
        field.consumerNodeIds.forEach(consumerId => {
          if (consumerId !== nodeId && consumerId !== 'interface-output') {
            const consumerNode = nodeDataFlows.find(n => n.nodeId === consumerId);
            if (consumerNode) {
              consumerNodes.push({
                nodeId: consumerNode.nodeId,
                nodeName: consumerNode.nodeName,
                nodeIndex: consumerNode.nodeIndex,
              });
              // 记录下游节点
              if (!downstreamNodeMap.has(consumerId)) {
                downstreamNodeMap.set(consumerId, {
                  nodeName: consumerNode.nodeName,
                  nodeIndex: consumerNode.nodeIndex,
                  fields: [],
                });
              }
              downstreamNodeMap.get(consumerId)!.fields.push(param.fieldName);
            }
          } else if (consumerId === 'interface-output') {
            // 接口出参
            consumerNodes.push({
              nodeId: 'interface-output',
              nodeName: '接口出参',
              nodeIndex: 999,
            });
          }
        });
      }

      outputs.push({
        fieldName: param.fieldName,
        fieldType: param.fieldType,
        description: param.description || field?.description || '',
        consumerNodes,
      });
    });

    // 构建上游节点列表
    const upstreamNodes = Array.from(upstreamNodeMap.entries()).map(([nodeId, data]) => ({
      nodeId,
      nodeName: data.nodeName,
      nodeIndex: data.nodeIndex,
      providedFields: data.fields,
    })).sort((a, b) => a.nodeIndex - b.nodeIndex);

    // 构建下游节点列表
    const downstreamNodes = Array.from(downstreamNodeMap.entries()).map(([nodeId, data]) => ({
      nodeId,
      nodeName: data.nodeName,
      nodeIndex: data.nodeIndex,
      consumedFields: data.fields,
    })).sort((a, b) => a.nodeIndex - b.nodeIndex);

    const impactResult = {
      inputs,
      outputs,
      upstreamNodes,
      downstreamNodes,
      summary: {
        inputCount: inputs.length,
        outputCount: outputs.length,
        upstreamNodeCount: upstreamNodes.length,
        downstreamNodeCount: downstreamNodes.length,
      },
    };

    return impactResult;
  }

  /**
   * 分析行状态
   * 判断每行（每个字段）的特殊状态：
   * 1. 没有节点提供，直接读取 -> 根据 required 标记黄色或红色
   * 2. 有节点提供，没节点消费 -> 标记黄色并加删除线
   * 3. 循环依赖检测
   * 4. 缺失字段检测
   * 5. 类型不匹配检测
   */
  private static analyzeRowStatus(
    contextFields: ContextField[],
    nodeDataFlows: NodeDataFlow[]
  ): Map<string, RowStatus> {
    const rowStatusMap = new Map<string, RowStatus>();

    // 找出接口入参节点
    const interfaceInputNode = nodeDataFlows.find(n => n.nodeId === 'interface-input');
    const interfaceInputFields = new Map<string, FieldInfo>();
    interfaceInputNode?.writes.forEach(w => {
      interfaceInputFields.set(w.fieldName, w);
    });

    // 找出接口出参节点
    const interfaceOutputNode = nodeDataFlows.find(n => n.nodeId === 'interface-output');

    // 统计每个字段被实际消费（被非接口出参节点读取）的次数
    const fieldConsumedByNodes = new Map<string, string[]>();
    nodeDataFlows.forEach(node => {
      // 排除接口出参节点（它只是标记最终输出，不算实际消费）
      if (node.nodeId === 'interface-output') return;

      node.reads.forEach(r => {
        if (!fieldConsumedByNodes.has(r.fieldName)) {
          fieldConsumedByNodes.set(r.fieldName, []);
        }
        const consumers = fieldConsumedByNodes.get(r.fieldName)!;
        if (!consumers.includes(node.nodeId)) {
          consumers.push(node.nodeId);
        }
      });
    });

    // 统计每个字段被哪个节点写入，以及写入时字段的 required 属性
    const fieldWrittenByNodes = new Map<string, { nodeId: string; required: boolean }[]>();
    nodeDataFlows.forEach(node => {
      // 排除接口入参节点
      if (node.nodeId === 'interface-input') return;

      node.writes.forEach(w => {
        if (!fieldWrittenByNodes.has(w.fieldName)) {
          fieldWrittenByNodes.set(w.fieldName, []);
        }
        fieldWrittenByNodes.get(w.fieldName)!.push({
          nodeId: node.nodeId,
          required: w.required,
        });
      });
    });

    // ========== 缺失字段检测 ==========
    // 检测读取了但不存在的字段
    const missingFieldsMap = new Map<string, string[]>();
    const allFieldNames = new Set(contextFields.map(f => f.fieldName));

    nodeDataFlows.forEach(node => {
      if (node.nodeId === 'interface-input' || node.nodeId === 'interface-output') return;

      node.reads.forEach(r => {
        // 字段不存在（既不是入参，也没有被任何节点写入）
        if (!allFieldNames.has(r.fieldName)) {
          if (!missingFieldsMap.has(r.fieldName)) {
            missingFieldsMap.set(r.fieldName, []);
          }
          missingFieldsMap.get(r.fieldName)!.push(node.nodeId);
        }
      });
    });

    // ========== 类型不匹配检测 ==========
    // 检测同一字段在不同节点中读写类型不一致
    const typeMismatchMap = new Map<string, TypeMismatchInfo[]>();
    const fieldTypeMap = new Map<string, { nodeId: string; type: string; isWrite: boolean }[]>();

    nodeDataFlows.forEach(node => {
      node.writes.forEach(w => {
        if (!fieldTypeMap.has(w.fieldName)) {
          fieldTypeMap.set(w.fieldName, []);
        }
        fieldTypeMap.get(w.fieldName)!.push({
          nodeId: node.nodeId,
          type: w.fieldType,
          isWrite: true,
        });
      });
      node.reads.forEach(r => {
        if (!fieldTypeMap.has(r.fieldName)) {
          fieldTypeMap.set(r.fieldName, []);
        }
        fieldTypeMap.get(r.fieldName)!.push({
          nodeId: node.nodeId,
          type: r.fieldType,
          isWrite: false,
        });
      });
    });

    fieldTypeMap.forEach((entries, fieldName) => {
      const mismatches: TypeMismatchInfo[] = [];
      const writeEntries = entries.filter(e => e.isWrite);
      const readEntries = entries.filter(e => !e.isWrite);

      // 比较写入和读取的类型
      writeEntries.forEach(writeEntry => {
        readEntries.forEach(readEntry => {
          // 类型不同且不是通用的 Object 类型
          if (writeEntry.type !== readEntry.type &&
              writeEntry.type !== 'Object' &&
              readEntry.type !== 'Object') {
            mismatches.push({
              fieldName,
              writeNodeId: writeEntry.nodeId,
              writeNodeType: writeEntry.type,
              readNodeId: readEntry.nodeId,
              readNodeType: readEntry.type,
            });
          }
        });
      });

      if (mismatches.length > 0) {
        typeMismatchMap.set(fieldName, mismatches);
      }
    });

    // ========== 循环依赖检测 ==========
    // 检测字段流转形成环：节点A写字段X -> 节点B读字段X写字段Y -> 节点A读字段Y
    const circularDependencyMap = new Map<string, string[]>();

    // 构建节点间的依赖关系：nodeId -> 依赖的nodeId列表
    const nodeDependencies = new Map<string, Set<string>>();

    nodeDataFlows.forEach(node => {
      if (node.nodeId === 'interface-input' || node.nodeId === 'interface-output') return;

      node.reads.forEach(r => {
        // 找到该字段的写入节点
        const writerNodes = fieldWrittenByNodes.get(r.fieldName) || [];
        writerNodes.forEach(writer => {
          if (writer.nodeId !== node.nodeId) {
            if (!nodeDependencies.has(node.nodeId)) {
              nodeDependencies.set(node.nodeId, new Set());
            }
            nodeDependencies.get(node.nodeId)!.add(writer.nodeId);
          }
        });
      });
    });

    // 检测循环依赖（深度优先搜索）
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

    // 对每个节点检测是否存在循环
    const nodesWithCycles = new Set<string>();
    nodeDataFlows.forEach(node => {
      if (node.nodeId === 'interface-input' || node.nodeId === 'interface-output') return;

      const cycle = detectCycle(node.nodeId, [node.nodeId]);
      if (cycle) {
        cycle.forEach(n => nodesWithCycles.add(n));
      }
    });

    // 标记涉及循环依赖的字段
    nodeDataFlows.forEach(node => {
      if (nodesWithCycles.has(node.nodeId)) {
        node.writes.forEach(w => {
          if (!circularDependencyMap.has(w.fieldName)) {
            circularDependencyMap.set(w.fieldName, []);
          }
          const nodes = circularDependencyMap.get(w.fieldName)!;
          if (!nodes.includes(node.nodeName)) {
            nodes.push(node.nodeName);
          }
        });
      }
    });

    // ========== 分析每个字段的状态 ==========
    contextFields.forEach(field => {
      const status: RowStatus = {
        isDependsOnInput: false,
        isInputRequired: false,
        isUnused: false,
        hasCircularDependency: false,
        circularDependencyNodes: [],
        isMissing: false,
        missingInNodes: [],
        hasTypeMismatch: false,
        typeMismatchDetails: [],
      };

      // 获取实际消费者（排除接口出参节点）
      const consumers = fieldConsumedByNodes.get(field.fieldName) || [];
      const hasRealConsumers = consumers.length > 0;

      // 判断是否有节点提供（写入）
      // firstSourceNodeId 为 null 表示没有节点写入
      // firstSourceNodeId 为 'interface-input' 表示是接口入参
      const hasProvider = field.firstSourceNodeId !== null;

      // 场景1: 没有节点提供，直接读取
      // 字段被读取但没有被任何节点写入（不是接口入参，也不是过程变量）
      if (!hasProvider && hasRealConsumers) {
        // 找到读取这个字段的节点，获取 required 属性
        // 从 consumerNodeIds 中找到第一个消费者
        const firstConsumerId = consumers[0];
        const consumerNode = nodeDataFlows.find(n => n.nodeId === firstConsumerId);
        const readField = consumerNode?.reads.find(r => r.fieldName === field.fieldName);

        status.isDependsOnInput = true;
        status.isInputRequired = readField?.required || false;
      }
      // 场景2: 有节点提供，没节点消费
      // 字段被写入但没有被任何节点读取
      else if (hasProvider && field.firstSourceNodeId !== 'interface-input' && !hasRealConsumers) {
        status.isUnused = true;
      }

      // 循环依赖检测
      if (circularDependencyMap.has(field.fieldName)) {
        status.hasCircularDependency = true;
        status.circularDependencyNodes = circularDependencyMap.get(field.fieldName)!;
      }

      // 缺失字段检测
      if (missingFieldsMap.has(field.fieldName)) {
        status.isMissing = true;
        status.missingInNodes = missingFieldsMap.get(field.fieldName)!;
      }

      // 类型不匹配检测
      if (typeMismatchMap.has(field.fieldName)) {
        status.hasTypeMismatch = true;
        status.typeMismatchDetails = typeMismatchMap.get(field.fieldName)!;
      }

      rowStatusMap.set(field.fieldName, status);
    });

    // 为缺失的字段也创建状态（这些字段不在 contextFields 中）
    missingFieldsMap.forEach((nodeIds, fieldName) => {
      if (!rowStatusMap.has(fieldName)) {
        rowStatusMap.set(fieldName, {
          isDependsOnInput: false,
          isInputRequired: false,
          isUnused: false,
          hasCircularDependency: false,
          circularDependencyNodes: [],
          isMissing: true,
          missingInNodes: nodeIds,
          hasTypeMismatch: false,
          typeMismatchDetails: [],
        });
      }
    });

    return rowStatusMap;
  }
}
