import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useContext,
} from 'react';
import { Graph, Edge, Cell, Node } from '@antv/x6';
import classNames from 'classnames'
import createFlowGraph from './panels/flowGraph/createFlowGraph';
// import NodeEditorModal from './panels/flowGraph/nodeEditorModal';
import FlowGraphContextMenu from './panels/flowGraph/contextMenu';
import FlowGraphContextPad from './panels/flowGraph/contextPad';
import GraphContext from './context/GraphContext';
import { ShowParamsProvider } from './context/ShowParamsContext';
import { ShowStepsProvider } from './context/ShowStepsContext';
import { ShowDependenciesProvider } from './context/ShowDependenciesContext';
import { ViewModeProvider, getGlobalViewMode } from './context/ViewModeContext';
import { updateNodeIndexMap, clearNodeIndexMap, getNodeIndex } from './context/NodeIndexContext';
import { triggerRefresh } from './context/ViewModeContext';
import { PanelProvider, usePanel } from './context/PanelContext';
import { InterfaceProvider, useInterface, InterfaceInfo } from './context/InterfaceContext';
import Layout from './panels/layout';
import SideBar from './panels/sideBar';
import ToolBar from './panels/toolBar';
import SettingBar from './panels/settingBar';
import Breadcrumb from './panels/breadcrumb';
import ContentPanel from './components/ContentPanel';
import InterfaceInfoPopover from './components/InterfaceInfoPopover';
import styles from './index.module.less';
import '@antv/x6/dist/index.css';
import { forceLayout } from './common/layout';
import { useModel } from './hooks';
import { history } from './hooks/useHistory';
import ELBuilder from './model/builder';
import { setModel } from './hooks/useModel';
import { MIN_ZOOM } from './constant';

interface ILiteFlowEditorProps {
  /**
   * 样式类
   */
  className?: string;
  /**
   * 生成图示例事件
   * @param graph 图实例
   * @returns
   */
  onReady?: (graph: Graph) => void;
  /**
   * 工具栏组件
   */
  widgets?: React.FC<any>[];
  /**
   * 更多子节点
   */
  children?: React.ReactNode;
  /**
   * 是否显示左侧面板
   */
  showSideBar?: boolean;
  /**
   * 是否启用编辑功能
   */
  enableEdit?: boolean;
  /**
   * 是否显示连线添加节点按钮
   */
  showEdgeAddButton?: boolean;
  /**
   * 其他可扩展属性
   */
  [key: string]: any;
}

const defaultMenuInfo: IMenuInfo = {
  x: 0,
  y: 0,
  scene: 'blank',
  visible: false,
};

interface IPadInfo {
  x: number;
  y: number;
  edge?: Edge;
  node?: Node;
  scene?: IContextPadScene;
  visible: boolean;
}

const defaultPadInfo: IPadInfo = {
  x: 0,
  y: 0,
  scene: 'append',
  visible: false,
};

const LiteFlowEditorInner = forwardRef<React.FC, ILiteFlowEditorProps>(function (props, ref) {
  const { className, onReady, widgets, children, showSideBar = true, enableEdit = true, showEdgeAddButton = true } = props;
  const { showPanel } = usePanel();
  const { currentInterface } = useInterface();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const miniMapRef = useRef<HTMLDivElement>(null);
  const [flowGraph, setFlowGraph] = useState<Graph>();
  const [contextMenuInfo, setContextMenuInfo] =
    useState<IMenuInfo>(defaultMenuInfo);
  const [contextPadInfo, setContextPadInfo] =
    useState<IPadInfo>(defaultPadInfo);
  const [paramNodesMap, setParamNodesMap] = useState<Record<string, string>>({});
  const [stepsNodesMap, setStepsNodesMap] = useState<Record<string, string>>({});
  const [dependenciesNodesMap, setDependenciesNodesMap] = useState<Record<string, string>>({});
  const [contentPanelNodeId, setContentPanelNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  // 开始节点悬停状态（替代原来的点击弹窗）
  const [startNodeHovered, setStartNodeHovered] = useState(false);
  // 开始节点位置
  const [startNodePosition, setStartNodePosition] = useState<{ x: number; y: number } | null>(null);

  const paramNodesMapRef = useRef<Record<string, string>>({});
  const stepsNodesMapRef = useRef<Record<string, string>>({});
  const dependenciesNodesMapRef = useRef<Record<string, string>>({});
  const contentPanelNodeIdRef = useRef<string | null>(null);
  const hasZoomedToFitRef = useRef<boolean>(false);
  const hasInitializedIndexesRef = useRef<boolean>(false);
  const currentInterfaceRef = useRef<InterfaceInfo | null>(null);
  // 悬停计时器
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 保持 currentInterfaceRef 与 currentInterface 同步
  useEffect(() => {
    currentInterfaceRef.current = currentInterface;
  }, [currentInterface]);

  const currentEditor = {
    getGraphInstance() {
      return flowGraph;
    },
    toJSON() {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useModel().toJSON();
    },
    fromJSON(data: Record<string, any>) {
      const model = ELBuilder.build(data || {});
      setModel(model);
      history.cleanHistory();
      flowGraph?.zoomToFit({minScale: MIN_ZOOM, maxScale: 1});
    }
  }
  useImperativeHandle(ref, () => currentEditor as any);

  useEffect(() => {
    if (graphRef.current && miniMapRef.current) {
      const flowGraph = createFlowGraph(graphRef.current, miniMapRef.current, enableEdit, showEdgeAddButton);
      onReady?.(flowGraph);
      setFlowGraph(flowGraph);
      history.init(flowGraph);

      // 初始化节点序号（按位置排序：从左到右，从上到下）
      // 只给有内容的节点分配序号
      const initNodeIndexes = (force: boolean = false) => {
        // 如果已经初始化过且不是强制刷新，则跳过
        if (hasInitializedIndexesRef.current && !force) return;

        const nodes = flowGraph.getNodes();
        const nodesWithContent: Array<{ id: string; hasContent: boolean; x: number; y: number }> = [];

        nodes.forEach(node => {
          const data = node.getData();
          if (data && data.model) {
            const bbox = node.getBBox();
            const metadata = data.model.metadata || {};
            const steps = metadata.steps || [];
            const inputParams = metadata.inputParameters || [];
            const outputParams = metadata.outputParameters || [];
            const dependencies = metadata.dependencies || [];
            const hasContent = steps.length > 0 || inputParams.length > 0 || outputParams.length > 0 || dependencies.length > 0;

            nodesWithContent.push({
              id: node.id,
              hasContent,
              x: bbox.x,
              y: bbox.y
            });
          }
        });

        // 按 x 坐标（从左到右），如果 x 差距小于 100（同一列），则按 y 排序
        nodesWithContent.sort((a, b) => {
          if (Math.abs(a.x - b.x) < 100) {
            return a.y - b.y;
          }
          return a.x - b.x;
        });

        updateNodeIndexMap(nodesWithContent);
        hasInitializedIndexesRef.current = true;
        // 触发所有节点重新渲染以显示序号
        setTimeout(() => triggerRefresh(), 100);
      };

      // 延迟初始化，等待节点数据加载
      setTimeout(() => initNodeIndexes(), 500);

      // 监听节点添加事件（强制重新计算序号）
      flowGraph.on('cell:added', () => {
        setTimeout(() => initNodeIndexes(true), 100);
      });
    }
  }, [enableEdit, showEdgeAddButton]);

  // resize flowGraph's size when window size changes
  useEffect(() => {
    const handler = () => {
      requestAnimationFrame(() => {
        if (flowGraph && wrapperRef && wrapperRef.current) {
          const width = wrapperRef.current.clientWidth;
          const height = wrapperRef.current.clientHeight;
          flowGraph.resize(width, height);
        }
      });
    };
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
    };
  }, [flowGraph, wrapperRef]);

  // NOTE: listen toggling context menu event
  useEffect(() => {
    const showHandler = (info: IMenuInfo) => {
      flowGraph?.lockScroller();
      setContextMenuInfo({ ...info, visible: true });
    };
    const hideHandler = () => {
      flowGraph?.unlockScroller();
      setContextMenuInfo({ ...contextMenuInfo, visible: false });
    };
    const showContextPad = (info: IPadInfo) => {
      flowGraph?.lockScroller();
      setContextPadInfo({ ...info, visible: true });
    };
    const hideContextPad = () => {
      flowGraph?.unlockScroller();
      setContextPadInfo({ ...contextPadInfo, visible: false });
    };
    const handleModelChange = () => {
      if (flowGraph) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const model = useModel();
        const modelJSON = model.toCells() as Cell[];
        flowGraph.lockScroller();
        flowGraph.startBatch('update');
        flowGraph.resetCells(modelJSON);
        forceLayout(flowGraph);
        flowGraph.stopBatch('update');
        flowGraph.unlockScroller();
        flowGraph.trigger('model:changed');
        // 初始化节点序号（流程图加载时就显示序号）
        initNodeIndexes();
        // 更新内容面板
        updateContentPanel();
      }
    };

    // 初始化所有节点的序号（按位置排序：从左到右，从上到下）
    // 接口节点序号为1，其他有内容的节点按顺序排列
    const initNodeIndexes = () => {
      if (!flowGraph) return;

      const nodes = flowGraph.getNodes();
      const nodesWithContent: Array<{ id: string; hasContent: boolean; x: number; y: number }> = [];

      // 先添加接口节点
      if (currentInterfaceRef.current) {
        // 接口节点默认放在最前面
        nodesWithContent.push({
          id: 'interface-info',
          hasContent: true,
          x: -Infinity, // 确保排在最前面
          y: 0
        });
      }

      nodes.forEach(node => {
        const data = node.getData();
        if (data && data.model && data.model.metadata) {
          const metadata = data.model.metadata;
          const steps = metadata.steps || [];
          const inputParams = metadata.inputParameters || [];
          const outputParams = metadata.outputParameters || [];
          const dependencies = metadata.dependencies || [];

          if (steps.length > 0 || inputParams.length > 0 || outputParams.length > 0 || dependencies.length > 0) {
            const bbox = node.getBBox();
            nodesWithContent.push({
              id: node.id,
              hasContent: true,
              x: bbox.x,
              y: bbox.y
            });
          }
        }
      });

      // 按 x 坐标（从左到右），如果 x 差距小于 100（同一列），则按 y 排序
      // 接口节点由于 x 是 -Infinity，会排在最前面
      nodesWithContent.sort((a, b) => {
        if (Math.abs(a.x - b.x) < 100) {
          return a.y - b.y;
        }
        return a.x - b.x;
      });

      updateNodeIndexMap(nodesWithContent);
      // 触发节点重新渲染以显示序号
      triggerRefresh();
    };

    // 更新内容面板节点
    const updateContentPanel = () => {
      if (!flowGraph) return;

      const nodes = flowGraph.getNodes();
      const contents: Array<{
        id: string;
        name: string;
        hasContent: boolean;
        description?: string;
        steps?: any[];
        inputParams?: any[];
        outputParams?: any[];
        dependencies?: any[];
      }> = [];

      // 先添加接口节点
      if (currentInterfaceRef.current) {
        contents.push({
          id: 'interface-info',
          name: currentInterfaceRef.current.interfaceName || currentInterfaceRef.current.chainId,
          hasContent: true,
          description: currentInterfaceRef.current.description || '',
          steps: [],
          inputParams: currentInterfaceRef.current.inputs || [],
          outputParams: currentInterfaceRef.current.outputs || [],
          dependencies: []
        });
      }

      nodes.forEach(node => {
        const data = node.getData();
        if (data && data.model && data.model.metadata) {
          const metadata = data.model.metadata;
          const steps = metadata.steps || [];
          const inputParams = metadata.inputParameters || [];
          const outputParams = metadata.outputParameters || [];
          const dependencies = metadata.dependencies || [];

          if (steps.length > 0 || inputParams.length > 0 || outputParams.length > 0 || dependencies.length > 0) {
            contents.push({
              id: node.id,
              name: metadata.nodeName || data.model.id || node.id,
              hasContent: true,
              description: metadata.description || '',
              steps,
              inputParams,
              outputParams,
              dependencies
            });
          }
        }
      });

      // 计算流程图边界
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      nodes.forEach(node => {
        const bbox = node.getBBox();
        minX = Math.min(minX, bbox.x);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        minY = Math.min(minY, bbox.y);
        maxY = Math.max(maxY, bbox.y + bbox.height);
      });

      const graphWidth = maxX - minX;

      // 根据节点数量计算面板宽度，每个节点卡片约220px，最多6列
      const cardWidth = 220;
      const cardGap = 16;
      const padding = 32;
      const maxCols = 6;
      const cols = Math.min(Math.ceil(contents.length / 2), maxCols);
      const panelWidth = Math.max(700, cols * cardWidth + (cols - 1) * cardGap + padding);

      const panelX = minX + graphWidth / 2 - panelWidth / 2;

      // 计算每个节点的实际高度（根据步骤数量和描述长度）
      let maxNodeHeight = 0;
      contents.forEach(node => {
        const stepCount = node.steps?.length || 0;
        const paramCount = Math.max(
          node.inputParams?.length || 0,
          node.outputParams?.length || 0
        );
        const depCount = node.dependencies?.length || 0;
        const contentLines = Math.max(stepCount, paramCount, depCount);
        // 描述高度（每行约14px，假设描述最多2行）
        const descHeight = node.description ? 28 : 0;
        // 基础高度40px + 描述高度 + 每行内容约18px
        const nodeHeight = 40 + descHeight + contentLines * 18;
        maxNodeHeight = Math.max(maxNodeHeight, nodeHeight);
      });

      // 计算行数
      const rows = Math.ceil(contents.length / cols);
      // 面板高度自适应内容
      const estimatedPanelHeight = 50 + rows * (maxNodeHeight + 12) + 20;

      // 面板放在流程图上方（顶部位置）
      const panelY = minY - estimatedPanelHeight - 20;

      // 移除旧的内容面板节点和连线
      if (contentPanelNodeIdRef.current) {
        const oldNode = flowGraph.getCellById(contentPanelNodeIdRef.current);
        if (oldNode) oldNode.remove();
        // 移除旧的连线
        const oldEdges = flowGraph.getEdges().filter(edge => edge.id.startsWith('content-edge-'));
        oldEdges.forEach(edge => edge.remove());
      }

      // 更新全局节点序号映射
      updateNodeIndexMap(contents);

      // 如果 viewMode 为空，不创建内容面板
      const currentViewMode = getGlobalViewMode();
      if (!currentViewMode) {
        clearNodeIndexMap();
        return;
      }

      // 创建新的内容面板节点
      if (contents.length > 0) {
        const panelId = `content-panel-${Date.now()}`;
        flowGraph.addNode({
          id: panelId,
          shape: 'content-panel-node',
          x: panelX,
          y: panelY,
          width: panelWidth,
          data: {
            nodes: contents,
            viewMode: getGlobalViewMode(),
            hoveredNodeId,
            onNodeHover: (nodeId: string | null) => {
              if (nodeId && flowGraph) {
                // 跳过虚拟节点（interface-input, interface-output, interface-info）
                if (nodeId === 'interface-input' || nodeId === 'interface-output' || nodeId === 'interface-info') {
                  return;
                }

                const targetNode = flowGraph.getCellById(nodeId);
                if (targetNode) {
                  // 只高亮节点，不移动视图和触发侧边栏
                  targetNode.setAttrs({
                    body: { strokeWidth: 3, stroke: '#1890ff' }
                  });
                }
              }
              if (!nodeId && flowGraph) {
                flowGraph.getNodes().forEach(n => {
                  n.setAttrs({
                    body: { strokeWidth: 2, stroke: 'transparent' }
                  });
                });
              }
            }
          },
          zIndex: 0
        });
        setContentPanelNodeId(panelId);
        contentPanelNodeIdRef.current = panelId;

        // 创建连线：从面板底部到对应节点
        contents.forEach((content, index) => {
          const targetNode = flowGraph.getCellById(content.id);
          if (targetNode) {
            const targetBbox = targetNode.getBBox();
            // 计算卡片在面板内的位置
            const cardCol = index % cols;
            const cardRow = Math.floor(index / cols);
            const cardWidth = 200;
            const cardGap = 12;
            const cardX = panelX + 16 + cardCol * (cardWidth + cardGap) + cardWidth / 2;
            const cardY = panelY + 50 + cardRow * (maxNodeHeight + 12) + maxNodeHeight;

            // 创建直线连接（无折角）
            flowGraph.addEdge({
              id: `content-edge-${content.id}`,
              source: { x: cardX, y: cardY },
              target: { x: targetBbox.center.x, y: targetBbox.y },
              attrs: {
                line: {
                  stroke: '#faad14',
                  strokeWidth: 1.5,
                  targetMarker: null
                }
              },
              connector: 'straight',
              zIndex: -1
            });
          }
        });

        // 更新画布内容区域，让面板和流程图都可见
        // 只在首次创建面板时调整，后续切换不再调整以保持一致的缩放
        if (!hasZoomedToFitRef.current) {
          setTimeout(() => {
            if (flowGraph) {
              // 获取所有节点的边界（包括面板）
              const allNodes = flowGraph.getNodes();
              let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

              allNodes.forEach(node => {
                const bbox = node.getBBox();
                minX = Math.min(minX, bbox.x);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                minY = Math.min(minY, bbox.y);
                maxY = Math.max(maxY, bbox.y + bbox.height);
              });

              // 获取面板节点
              const panelNode = allNodes.find(n => n.id && n.id.startsWith('content-panel-'));
              const panelBbox = panelNode ? panelNode.getBBox() : null;
              const panelY = panelBbox ? panelBbox.y : minY;

              // 计算内容的宽高（包含面板）
              const contentWidth = maxX - minX;
              const contentHeight = maxY - panelY;

              // 获取画布尺寸
              const graphContainer = flowGraph.container;
              const viewWidth = graphContainer.clientWidth;
              const viewHeight = graphContainer.clientHeight;

              // 计算合适的缩放比例，确保所有内容可见，使用固定的最大缩放值
              const scaleX = viewWidth / (contentWidth + 100);
              const scaleY = viewHeight / (contentHeight + 100);
              const scale = Math.min(scaleX, scaleY, 0.8);
              const clampedScale = Math.max(scale, 0.1);

              // 设置缩放
              flowGraph.zoomTo(clampedScale);

              // 计算中心点：面板顶部到流程图底部的中间位置
              const centerX = minX + contentWidth / 2;
              const centerY = (panelY + maxY) / 2;

              // 将视图中心点放在内容中间
              flowGraph.centerPoint(centerX, centerY);
            }
          }, 200);
        }
      }
    };
    
    const handleShowParams = () => {
      if (flowGraph) {
        const nodes = flowGraph.getNodes();

        const newParamNodesMap: Record<string, string> = {};
        const PANEL_WIDTH = 300;
        const PANEL_HEADER_HEIGHT = 24;
        const PANEL_PADDING = 4;
        const PARAM_GROUP_PADDING = 2;
        const PARAM_GROUP_MARGIN = 2;
        const PARAM_GROUP_HEADER_HEIGHT = 18;
        const PARAM_ROW_HEIGHT = 18;
        const MIN_HEIGHT = 80;

        const nodesWithParams: Array<{
          id: string;
          x: number;
          y: number;
          height: number;
          nodeName: string;
          inputParameters: any[];
          outputParameters: any[];
        }> = [];

        nodes.forEach(node => {
          const data = node.getData();
          if (data && data.model && data.model.metadata) {
            const hasParams =
              (data.model.metadata.inputParameters && data.model.metadata.inputParameters.length > 0) ||
              (data.model.metadata.outputParameters && data.model.metadata.outputParameters.length > 0);
            if (hasParams) {
              const bbox = node.getBBox();
              const nodeCenter = bbox.center;

              const inputParams = data.model.metadata.inputParameters || [];
              const outputParams = data.model.metadata.outputParameters || [];

              let contentHeight = PANEL_PADDING;

              if (inputParams.length > 0) {
                contentHeight += PARAM_GROUP_PADDING;
                contentHeight += PARAM_GROUP_HEADER_HEIGHT;
                contentHeight += inputParams.length * PARAM_ROW_HEIGHT;
                contentHeight += PARAM_GROUP_MARGIN;
              }

              if (outputParams.length > 0) {
                contentHeight += PARAM_GROUP_PADDING;
                contentHeight += PARAM_GROUP_HEADER_HEIGHT;
                contentHeight += outputParams.length * PARAM_ROW_HEIGHT;
                contentHeight += PARAM_GROUP_MARGIN;
              }

              const totalHeight = Math.max(PANEL_HEADER_HEIGHT + contentHeight + PANEL_PADDING, MIN_HEIGHT);

              nodesWithParams.push({
                id: node.id,
                x: nodeCenter.x,
                y: nodeCenter.y,
                height: totalHeight,
                nodeName: data.model.metadata.nodeName,
                inputParameters: inputParams,
                outputParameters: outputParams
              });
            }
          }
        });

        nodesWithParams.sort((a, b) => a.x - b.x);

        const occupied: Array<{ x: number; y: number; width: number; height: number }> = [];

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        nodes.forEach(node => {
          const bbox = node.getBBox();
          minX = Math.min(minX, bbox.x);
          maxX = Math.max(maxX, bbox.x + bbox.width);
          minY = Math.min(minY, bbox.y);
          maxY = Math.max(maxY, bbox.y + bbox.height);
        });

        const graphCenterX = minX + (maxX - minX) / 2;
        const graphCenterY = minY + (maxY - minY) / 2;
        const baseRadius = Math.max(maxX - minX, maxY - minY) / 2;
        const RADIUS = baseRadius + 10 + nodesWithParams.length * 5;
        const NODE_GAP = 10;

        nodesWithParams.forEach((nodeInfo, index) => {
          const paramNodeId = `param_${nodeInfo.id}`;
          newParamNodesMap[nodeInfo.id] = paramNodeId;

          let currentAngle = Math.PI * 1.25;

          let position = {
            x: graphCenterX + RADIUS * Math.cos(currentAngle) - PANEL_WIDTH / 2,
            y: graphCenterY + RADIUS * Math.sin(currentAngle) - nodeInfo.height
          };

          let hasOverlap = true;
          let attempts = 0;
          const maxAttempts = 360;

          while (hasOverlap && attempts < maxAttempts) {
            hasOverlap = false;

            for (const rect of occupied) {
              if (
                position.x < rect.x + rect.width + NODE_GAP &&
                position.x + PANEL_WIDTH + NODE_GAP > rect.x &&
                position.y < rect.y + rect.height + NODE_GAP &&
                position.y + nodeInfo.height + NODE_GAP > rect.y
              ) {
                hasOverlap = true;
                currentAngle += 0.017;
                position = {
                  x: graphCenterX + RADIUS * Math.cos(currentAngle) - PANEL_WIDTH / 2,
                  y: graphCenterY + RADIUS * Math.sin(currentAngle) - nodeInfo.height
                };
                break;
              }
            }

            attempts++;
          }

          occupied.push({
            x: position.x,
            y: position.y,
            width: PANEL_WIDTH,
            height: nodeInfo.height
          });

          const paramNode = flowGraph.addNode({
            id: paramNodeId,
            shape: 'param-node',
            x: position.x,
            y: position.y,
            width: PANEL_WIDTH,
            height: nodeInfo.height,
            data: {
              isParamNode: true,
              sourceNodeId: nodeInfo.id,
              nodeName: nodeInfo.nodeName,
              inputParameters: nodeInfo.inputParameters,
              outputParameters: nodeInfo.outputParameters
            },
            attrs: {
              body: {
                refWidth: '100%',
                refHeight: '100%',
              }
            },
            interactive: true,
            zIndex: 1000
          });

          const edge = flowGraph.addEdge({
            id: `edge_${paramNodeId}`,
            source: nodeInfo.id,
            target: paramNodeId,
            attrs: {
              line: {
                stroke: '#ffa940',
                strokeWidth: 2,
                strokeDasharray: '5 5',
                targetMarker: {
                  name: 'classic',
                  size: 12,
                  fill: '#ffa940',
                  stroke: '#ffa940'
                }
              }
            },
            connector: 'normal',
            router: 'normal',
            zIndex: 999
          });

          edge.setData({ isParamEdge: true });
        });

        setParamNodesMap(newParamNodesMap);
        paramNodesMapRef.current = newParamNodesMap;
      }
    };
    
    const handleHideParams = () => {
      if (flowGraph) {
        Object.values(paramNodesMapRef.current).forEach(paramNodeId => {
          const paramNode = flowGraph.getCellById(paramNodeId);
          if (paramNode) {
            const connectedEdges = flowGraph.getConnectedEdges(paramNode);
            connectedEdges.forEach(edge => edge.remove());
            paramNode.remove();
          }
        });
        setParamNodesMap({});
        paramNodesMapRef.current = {};
      }
    };
    
    const handleShowSteps = () => {
      if (flowGraph) {
        const nodes = flowGraph.getNodes();
        
        const newStepsNodesMap: Record<string, string> = {};
        const PANEL_WIDTH = 300;
        const PANEL_HEADER_HEIGHT = 24;
        const PANEL_PADDING = 4;
        const STEPS_ITEM_HEIGHT = 18;
        const MIN_HEIGHT = 80;
        
        const nodesWithSteps: Array<{
          id: string;
          x: number;
          y: number;
          height: number;
          nodeName: string;
          nodeDescription: string;
          steps: any[];
        }> = [];
        
        nodes.forEach(node => {
          const data = node.getData();
          if (data && data.model && data.model.metadata) {
            const hasSteps = data.model.metadata.steps && data.model.metadata.steps.length > 0;
            if (hasSteps) {
              const bbox = node.getBBox();
              const nodeCenter = bbox.center;
              
              const steps = data.model.metadata.steps || [];
              
              let contentHeight = PANEL_PADDING;
              contentHeight += steps.length * STEPS_ITEM_HEIGHT;
              
              const totalHeight = Math.max(PANEL_HEADER_HEIGHT + contentHeight + PANEL_PADDING, MIN_HEIGHT);
              
              nodesWithSteps.push({
                id: node.id,
                x: nodeCenter.x,
                y: nodeCenter.y,
                height: totalHeight,
                nodeName: data.model.metadata.nodeName,
                nodeDescription: data.model.metadata.description || '',
                steps: steps
              });
            }
          }
        });
        
        nodesWithSteps.sort((a, b) => a.x - b.x);
        
        const occupied: Array<{ x: number; y: number; width: number; height: number }> = [];
        
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        
        nodes.forEach(node => {
          const bbox = node.getBBox();
          minX = Math.min(minX, bbox.x);
          maxX = Math.max(maxX, bbox.x + bbox.width);
          minY = Math.min(minY, bbox.y);
          maxY = Math.max(maxY, bbox.y + bbox.height);
        });
        
        const graphCenterX = minX + (maxX - minX) / 2;
        const graphCenterY = minY + (maxY - minY) / 2;
        const baseRadius = Math.max(maxX - minX, maxY - minY) / 2;
        const RADIUS = baseRadius + 10 + nodesWithSteps.length * 5;
        const NODE_GAP = 10;
        
        nodesWithSteps.forEach((nodeInfo, index) => {
          const stepsNodeId = `steps_${nodeInfo.id}`;
          newStepsNodesMap[nodeInfo.id] = stepsNodeId;
          
          let currentAngle = Math.PI * 1.25;
          
          let position = {
            x: graphCenterX + RADIUS * Math.cos(currentAngle) - PANEL_WIDTH / 2,
            y: graphCenterY + RADIUS * Math.sin(currentAngle) - nodeInfo.height
          };
          
          let hasOverlap = true;
          let attempts = 0;
          const maxAttempts = 360;
          
          while (hasOverlap && attempts < maxAttempts) {
            hasOverlap = false;
            
            for (const rect of occupied) {
              if (
                position.x < rect.x + rect.width + NODE_GAP &&
                position.x + PANEL_WIDTH + NODE_GAP > rect.x &&
                position.y < rect.y + rect.height + NODE_GAP &&
                position.y + nodeInfo.height + NODE_GAP > rect.y
              ) {
                hasOverlap = true;
                currentAngle += 0.017;
                position = {
                  x: graphCenterX + RADIUS * Math.cos(currentAngle) - PANEL_WIDTH / 2,
                  y: graphCenterY + RADIUS * Math.sin(currentAngle) - nodeInfo.height
                };
                break;
              }
            }
            
            attempts++;
          }
          
          occupied.push({
            x: position.x,
            y: position.y,
            width: PANEL_WIDTH,
            height: nodeInfo.height
          });
          
          const stepsNode = flowGraph.addNode({
            id: stepsNodeId,
            shape: 'steps-node',
            x: position.x,
            y: position.y,
            width: PANEL_WIDTH,
            height: nodeInfo.height,
            data: {
              isStepsNode: true,
              sourceNodeId: nodeInfo.id,
              nodeName: nodeInfo.nodeName,
              nodeDescription: nodeInfo.nodeDescription,
              steps: nodeInfo.steps
            },
            attrs: {
              body: {
                refWidth: '100%',
                refHeight: '100%',
              }
            },
            interactive: true,
            zIndex: 1000
          });
          
          const edge = flowGraph.addEdge({
            id: `edge_${stepsNodeId}`,
            source: nodeInfo.id,
            target: stepsNodeId,
            attrs: {
              line: {
                stroke: '#ffa940',
                strokeWidth: 2,
                strokeDasharray: '5 5',
                targetMarker: {
                  name: 'classic',
                  size: 12,
                  fill: '#ffa940',
                  stroke: '#ffa940'
                }
              }
            },
            connector: 'normal',
            router: 'normal',
            zIndex: 999
          });
          
          edge.setData({ isStepsEdge: true });
        });
        
        setStepsNodesMap(newStepsNodesMap);
        stepsNodesMapRef.current = newStepsNodesMap;
      }
    };
    
    const handleHideSteps = () => {
      if (flowGraph) {
        Object.values(stepsNodesMapRef.current).forEach(stepsNodeId => {
          const stepsNode = flowGraph.getCellById(stepsNodeId);
          if (stepsNode) {
            const connectedEdges = flowGraph.getConnectedEdges(stepsNode);
            connectedEdges.forEach(edge => edge.remove());
            stepsNode.remove();
          }
        });
        setStepsNodesMap({});
        stepsNodesMapRef.current = {};
      }
    };
    
    const handleShowDependencies = () => {
      if (flowGraph) {
        const nodes = flowGraph.getNodes();
        
        const newDependenciesNodesMap: Record<string, string> = {};
        const PANEL_WIDTH = 300;
        const PANEL_HEADER_HEIGHT = 24;
        const PANEL_PADDING = 4;
        const DEPENDENCY_ITEM_HEIGHT = 18;
        const MIN_HEIGHT = 80;
        
        const nodesWithDependencies: Array<{
          id: string;
          x: number;
          y: number;
          height: number;
          nodeName: string;
          dependencies: any[];
        }> = [];
        
        nodes.forEach(node => {
          const data = node.getData();
          if (data && data.model && data.model.metadata) {
            const hasDependencies = data.model.metadata.dependencies && data.model.metadata.dependencies.length > 0;
            if (hasDependencies) {
              const bbox = node.getBBox();
              const nodeCenter = bbox.center;
              
              const dependencies = data.model.metadata.dependencies || [];
              
              let contentHeight = PANEL_PADDING;
              contentHeight += dependencies.length * DEPENDENCY_ITEM_HEIGHT;
              
              const totalHeight = Math.max(PANEL_HEADER_HEIGHT + contentHeight + PANEL_PADDING, MIN_HEIGHT);
              
              nodesWithDependencies.push({
                id: node.id,
                x: nodeCenter.x,
                y: nodeCenter.y,
                height: totalHeight,
                nodeName: data.model.metadata.nodeName,
                dependencies: dependencies
              });
            }
          }
        });
        
        nodesWithDependencies.sort((a, b) => a.x - b.x);
        
        const occupied: Array<{ x: number; y: number; width: number; height: number }> = [];
        
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        
        nodes.forEach(node => {
          const bbox = node.getBBox();
          minX = Math.min(minX, bbox.x);
          maxX = Math.max(maxX, bbox.x + bbox.width);
          minY = Math.min(minY, bbox.y);
          maxY = Math.max(maxY, bbox.y + bbox.height);
        });
        
        const graphCenterX = minX + (maxX - minX) / 2;
        const graphCenterY = minY + (maxY - minY) / 2;
        const baseRadius = Math.max(maxX - minX, maxY - minY) / 2;
        const RADIUS = baseRadius + 10 + nodesWithDependencies.length * 5;
        const NODE_GAP = 10;
        
        nodesWithDependencies.forEach((nodeInfo, index) => {
          const dependenciesNodeId = `dependencies_${nodeInfo.id}`;
          newDependenciesNodesMap[nodeInfo.id] = dependenciesNodeId;
          
          let currentAngle = Math.PI * 1.25;
          
          let position = {
            x: graphCenterX + RADIUS * Math.cos(currentAngle) - PANEL_WIDTH / 2,
            y: graphCenterY + RADIUS * Math.sin(currentAngle) - nodeInfo.height
          };
          
          let hasOverlap = true;
          let attempts = 0;
          const maxAttempts = 360;
          
          while (hasOverlap && attempts < maxAttempts) {
            hasOverlap = false;
            
            for (const rect of occupied) {
              if (
                position.x < rect.x + rect.width + NODE_GAP &&
                position.x + PANEL_WIDTH + NODE_GAP > rect.x &&
                position.y < rect.y + rect.height + NODE_GAP &&
                position.y + nodeInfo.height + NODE_GAP > rect.y
              ) {
                hasOverlap = true;
                currentAngle += 0.017;
                position = {
                  x: graphCenterX + RADIUS * Math.cos(currentAngle) - PANEL_WIDTH / 2,
                  y: graphCenterY + RADIUS * Math.sin(currentAngle) - nodeInfo.height
                };
                break;
              }
            }
            
            attempts++;
          }
          
          occupied.push({
            x: position.x,
            y: position.y,
            width: PANEL_WIDTH,
            height: nodeInfo.height
          });
          
          const dependenciesNode = flowGraph.addNode({
            id: dependenciesNodeId,
            shape: 'dependencies-node',
            x: position.x,
            y: position.y,
            width: PANEL_WIDTH,
            height: nodeInfo.height,
            data: {
              isDependenciesNode: true,
              sourceNodeId: nodeInfo.id,
              nodeName: nodeInfo.nodeName,
              dependencies: nodeInfo.dependencies
            },
            attrs: {
              body: {
                refWidth: '100%',
                refHeight: '100%',
              }
            },
            interactive: true,
            zIndex: 1000
          });
          
          const edge = flowGraph.addEdge({
            id: `edge_${dependenciesNodeId}`,
            source: nodeInfo.id,
            target: dependenciesNodeId,
            attrs: {
              line: {
                stroke: '#ffadd2',
                strokeWidth: 2,
                strokeDasharray: '5 5',
                targetMarker: {
                  name: 'classic',
                  size: 12,
                  fill: '#ffadd2',
                  stroke: '#ffadd2'
                }
              }
            },
            connector: 'normal',
            router: 'normal',
            zIndex: 999
          });
          
          edge.setData({ isDependenciesEdge: true });
        });
        
        setDependenciesNodesMap(newDependenciesNodesMap);
        dependenciesNodesMapRef.current = newDependenciesNodesMap;
      }
    };
    
    const handleHideDependencies = () => {
      if (flowGraph) {
        Object.values(dependenciesNodesMapRef.current).forEach(dependenciesNodeId => {
          const dependenciesNode = flowGraph.getCellById(dependenciesNodeId);
          if (dependenciesNode) {
            const connectedEdges = flowGraph.getConnectedEdges(dependenciesNode);
            connectedEdges.forEach(edge => edge.remove());
            dependenciesNode.remove();
          }
        });
        setDependenciesNodesMap({});
        dependenciesNodesMapRef.current = {};
      }
    };
    
    if (flowGraph) {
      flowGraph.on('graph:showContextMenu', showHandler);
      flowGraph.on('graph:hideContextMenu', hideHandler);
      flowGraph.on('graph:showContextPad', showContextPad);
      flowGraph.on('graph:hideContextPad', hideContextPad);
      flowGraph.on('model:change', handleModelChange);
      flowGraph.on('panel:show', showPanel);

      // 鼠标进入节点时检测是否是开始节点
      flowGraph.on('node:mouseenter', (args: any) => {
        const { node } = args;
        // 获取节点 shape，判断是否是开始节点
        const shape = node.shape;
        // 开始节点的 shape 是 'LITEFLOW_START'
        if (shape === 'LITEFLOW_START') {
          // 清除之前的计时器
          if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
          }
          // 延迟 300ms 显示，避免鼠标快速划过
          hoverTimerRef.current = setTimeout(() => {
            const bbox = node.getBBox();
            // 将 graph 坐标转换为视口坐标
            const clientPoint = flowGraph.localToClient(bbox.x + bbox.width + 10, bbox.y);
            setStartNodePosition({
              x: clientPoint.x,
              y: clientPoint.y
            });
            setStartNodeHovered(true);
          }, 300);
        }
      });

      flowGraph.on('node:mouseleave', (args: any) => {
        const { node } = args;
        const shape = node.shape;
        if (shape === 'LITEFLOW_START') {
          // 清除计时器
          if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
          }
          // 延迟隐藏，给用户时间移动到浮层上
          hoverTimerRef.current = setTimeout(() => {
            setStartNodeHovered(false);
          }, 200);
        }
      });

      flowGraph.on('viewMode:changed', () => {
        // 直接使用闭包中的 flowGraph
        if (!flowGraph) return;

        const nodes = flowGraph.getNodes();
        const contents: Array<{
          id: string;
          name: string;
          hasContent: boolean;
          description?: string;
          steps?: any[];
          inputParams?: any[];
          outputParams?: any[];
          dependencies?: any[];
        }> = [];

        // 先添加接口信息作为序号为1的节点内容
        if (currentInterfaceRef.current) {
          contents.push({
            id: 'interface-info',
            name: currentInterfaceRef.current.interfaceName || currentInterfaceRef.current.chainId,
            hasContent: true, // 接口节点始终有内容
            description: currentInterfaceRef.current.description || '',
            steps: [],
            inputParams: currentInterfaceRef.current.inputs || [],
            outputParams: currentInterfaceRef.current.outputs || [],
            dependencies: []
          });
        }

        nodes.forEach(node => {
          const data = node.getData();
          if (data && data.model && data.model.metadata) {
            const metadata = data.model.metadata;
            const steps = metadata.steps || [];
            const inputParams = metadata.inputParameters || [];
            const outputParams = metadata.outputParameters || [];
            const dependencies = metadata.dependencies || [];

            if (steps.length > 0 || inputParams.length > 0 || outputParams.length > 0 || dependencies.length > 0) {
              contents.push({
                id: node.id,
                name: metadata.nodeName || data.model.id || node.id,
                hasContent: true,
                description: metadata.description || '',
                steps,
                inputParams,
                outputParams,
                dependencies
              });
            }
          }
        });

        // 移除旧的内容面板节点和连线
        if (contentPanelNodeIdRef.current) {
          const oldNode = flowGraph.getCellById(contentPanelNodeIdRef.current);
          if (oldNode) oldNode.remove();
          const oldEdges = flowGraph.getEdges().filter(edge => edge.id.startsWith('content-edge-'));
          oldEdges.forEach(edge => edge.remove());
        }

        // 分离接口信息节点和其他节点
        const interfaceInfo = contents.find(c => c.id === 'interface-info');
        const otherNodes = contents.filter(c => c.id !== 'interface-info');

        // 对其他节点按序号排序
        otherNodes.sort((a, b) => {
          const indexA = getNodeIndex(a.id) || 0;
          const indexB = getNodeIndex(b.id) || 0;
          return indexA - indexB;
        });

        // 接口信息节点排在最前面（序号1），其他节点按序号排列
        const sortedContents = interfaceInfo ? [interfaceInfo, ...otherNodes] : otherNodes;

        // 如果 viewMode 为空，移除面板并返回
        const currentViewMode = getGlobalViewMode();
        if (!currentViewMode) {
          // 移除旧的内容面板节点和连线
          if (contentPanelNodeIdRef.current) {
            const oldNode = flowGraph.getCellById(contentPanelNodeIdRef.current);
            if (oldNode) oldNode.remove();
            const oldEdges = flowGraph.getEdges().filter(edge => edge.id.startsWith('content-edge-'));
            oldEdges.forEach(edge => edge.remove());
            contentPanelNodeIdRef.current = null;
          }
          // 重置缩放标记，以便下次切换视图时重新调整
          hasZoomedToFitRef.current = false;
          clearNodeIndexMap();
          return;
        }

        if (sortedContents.length > 0) {
          // 计算流程图边界
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          nodes.forEach(node => {
            const bbox = node.getBBox();
            minX = Math.min(minX, bbox.x);
            maxX = Math.max(maxX, bbox.x + bbox.width);
            minY = Math.min(minY, bbox.y);
            maxY = Math.max(maxY, bbox.y + bbox.height);
          });

          const graphWidth = maxX - minX;
          const graphHeight = maxY - minY;
          const cardWidth = 220;
          const cardGap = 16;
          const padding = 32;
          const maxCols = 6;
          const cols = Math.min(Math.ceil(sortedContents.length / 2), maxCols);
          const panelWidth = Math.max(700, cols * cardWidth + (cols - 1) * cardGap + padding);
          const panelX = minX + graphWidth / 2 - panelWidth / 2;

          // 计算节点高度
          let maxNodeHeight = 0;
          sortedContents.forEach(node => {
            const stepCount = node.steps?.length || 0;
            const paramCount = Math.max(node.inputParams?.length || 0, node.outputParams?.length || 0);
            const depCount = node.dependencies?.length || 0;
            const contentLines = Math.max(stepCount, paramCount, depCount);
            const descHeight = node.description ? 28 : 0;
            const nodeHeight = 40 + descHeight + contentLines * 18;
            maxNodeHeight = Math.max(maxNodeHeight, nodeHeight);
          });

          const rows = Math.ceil(sortedContents.length / cols);
          const estimatedPanelHeight = 50 + rows * (maxNodeHeight + 12) + 20;

          // 将面板放在流程图上方，间距10px
          const panelY = minY - estimatedPanelHeight - 10;

          const panelId = `content-panel-${Date.now()}`;
          flowGraph.addNode({
            id: panelId,
            shape: 'content-panel-node',
            x: panelX,
            y: panelY,
            width: panelWidth,
            data: {
              nodes: sortedContents,
              viewMode: currentViewMode,
              hoveredNodeId: null,
              onNodeHover: (nodeId: string | null) => {
                if (nodeId && flowGraph) {
                  // 跳过虚拟节点（interface-input, interface-output, interface-info）
                  if (nodeId === 'interface-input' || nodeId === 'interface-output' || nodeId === 'interface-info') {
                    return;
                  }

                  const targetNode = flowGraph.getCellById(nodeId);
                  if (targetNode) {
                    // 只高亮节点，不移动视图和触发侧边栏
                    targetNode.setAttrs({ body: { strokeWidth: 3, stroke: '#1890ff' } });
                  }
                }
                if (!nodeId && flowGraph) {
                  flowGraph.getNodes().forEach(n => {
                    n.setAttrs({ body: { strokeWidth: 2, stroke: 'transparent' } });
                  });
                }
              }
            },
            zIndex: 0
          });
          contentPanelNodeIdRef.current = panelId;

          // 创建连线：从节点底部到面板顶部（接口信息节点不需要连线）
          sortedContents.forEach((content, index) => {
            // 接口信息节点没有对应的流程图节点，跳过连线
            if (content.id === 'interface-info') return;

            const targetNode = flowGraph.getCellById(content.id);
            if (targetNode) {
              const targetBbox = targetNode.getBBox();
              const cardCol = index % cols;
              const cardRow = Math.floor(index / cols);
              // 卡片在面板内的位置
              const cardX = panelX + 16 + cardCol * (200 + 12) + 200 / 2;
              const cardY = panelY + 50 + cardRow * (maxNodeHeight + 12);

              // 连线从节点底部到面板顶部
              flowGraph.addEdge({
                id: `content-edge-${content.id}`,
                source: { x: targetBbox.center.x, y: targetBbox.y + targetBbox.height },
                target: { x: cardX, y: cardY },
                attrs: { line: { stroke: '#faad14', strokeWidth: 1.5, targetMarker: null } },
                connector: 'straight',
                zIndex: -1
              });
            }
          });

          // 调整画布视口，让面板和流程图都可见
          // 只在首次创建面板时调整，后续切换不再调整以保持一致的缩放
          if (!hasZoomedToFitRef.current) {
            setTimeout(() => {
              if (flowGraph) {
                flowGraph.zoomToFit({
                  minScale: 0.1,
                  maxScale: 0.8
                });
                hasZoomedToFitRef.current = true;
              }
            }, 150);
          }
        }
      });
      flowGraph.on('node:showParamsChanged', (args: any) => {
        if (args.showParams) {
          handleShowParams();
        } else {
          handleHideParams();
        }
      });
      flowGraph.on('node:showStepsChanged', (args: any) => {
        if (args.showSteps) {
          handleShowSteps();
        } else {
          handleHideSteps();
        }
      });
      flowGraph.on('node:showDependenciesChanged', (args: any) => {
        if (args.showDependencies) {
          handleShowDependencies();
        } else {
          handleHideDependencies();
        }
      });
    }
    return () => {
      if (flowGraph) {
        flowGraph.off('graph:showContextMenu', showHandler);
        flowGraph.off('graph:hideContextMenu', hideHandler);
        flowGraph.off('graph:showContextPad', showContextPad);
        flowGraph.off('graph:hideContextPad', hideContextPad);
        flowGraph.off('model:change', handleModelChange);
        flowGraph.off('panel:show', showPanel);
        flowGraph.off('viewMode:changed');
        flowGraph.off('node:showParamsChanged');
        flowGraph.off('node:showStepsChanged');
        flowGraph.off('node:showDependenciesChanged');
        flowGraph.off('node:mouseenter');
        flowGraph.off('node:mouseleave');
      }
    };
  }, [flowGraph, showPanel]);

  return (
    <ShowParamsProvider>
      <ShowStepsProvider>
        <ShowDependenciesProvider>
          <ViewModeProvider>
            <GraphContext.Provider // @ts-ignore
              value={{ graph: flowGraph, graphWrapper: wrapperRef, model: null, currentEditor, enableEdit }}
            >
            <Layout
              flowGraph={flowGraph}
              SideBar={showSideBar && enableEdit ? SideBar : null}
              ToolBar={enableEdit ? ToolBar : null}
              SettingBar={SettingBar}
              widgets={widgets}
            >
              <div className={classNames(styles.liteflowEditorContainer, className)} ref={wrapperRef}>
                <div className={styles.liteflowEditorGraph} ref={graphRef} />
                <div className={styles.liteflowEditorMiniMap} ref={miniMapRef} />
                {flowGraph && <Breadcrumb flowGraph={flowGraph} />}
                {/* {flowGraph && <NodeEditorModal flowGraph={flowGraph} />} */}
                {flowGraph && (
                  <FlowGraphContextMenu {...contextMenuInfo} flowGraph={flowGraph} enableEdit={enableEdit} />
                )}
                {flowGraph && (
                  <FlowGraphContextPad {...contextPadInfo} flowGraph={flowGraph} enableEdit={enableEdit} />
                )}
                {/* 鼠标悬停在开始节点时显示接口信息浮层 */}
                <InterfaceInfoPopover
                  chainId={currentInterface?.chainId || null}
                  visible={startNodeHovered}
                  position={startNodePosition}
                />
              {children}
            </div>
          </Layout>
        </GraphContext.Provider>
          </ViewModeProvider>
        </ShowDependenciesProvider>
      </ShowStepsProvider>
    </ShowParamsProvider>
  );
});

const LiteFlowEditor = forwardRef<React.FC, ILiteFlowEditorProps>(function (props, ref) {
  return (
    <PanelProvider>
      <InterfaceProvider>
        <LiteFlowEditorInner {...props} ref={ref} />
      </InterfaceProvider>
    </PanelProvider>
  );
});

export default LiteFlowEditor;
