import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
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
import Layout from './panels/layout';
import SideBar from './panels/sideBar';
import ToolBar from './panels/toolBar';
import SettingBar from './panels/settingBar';
import Breadcrumb from './panels/breadcrumb';
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

const LiteFlowEditor = forwardRef<React.FC, ILiteFlowEditorProps>(function (props, ref) {
  const { className, onReady, widgets, children, showSideBar = true, enableEdit = true, showEdgeAddButton = true } = props;
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
  
  const paramNodesMapRef = useRef<Record<string, string>>({});
  const stepsNodesMapRef = useRef<Record<string, string>>({});
  const dependenciesNodesMapRef = useRef<Record<string, string>>({});

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
            interactive: false,
            zIndex: 1000
          });
          
          const edge = flowGraph.addEdge({
            id: `edge_${paramNodeId}`,
            source: nodeInfo.id,
            target: paramNodeId,
            attrs: {
              line: {
                stroke: '#40a9ff',
                strokeWidth: 2,
                strokeDasharray: '5 5',
                targetMarker: {
                  name: 'classic',
                  size: 12,
                  fill: '#40a9ff',
                  stroke: '#40a9ff'
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
            data: {
              isStepsNode: true,
              sourceNodeId: nodeInfo.id,
              nodeName: nodeInfo.nodeName,
              steps: nodeInfo.steps
            },
            attrs: {
              body: {
                refWidth: '100%',
                refHeight: '100%',
              }
            },
            interactive: false,
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
            interactive: false,
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
        flowGraph.off('node:showParamsChanged');
        flowGraph.off('node:showStepsChanged');
        flowGraph.off('node:showDependenciesChanged');
      }
    };
  }, [flowGraph]);

  return (
    // @ts-ignore
    <ShowParamsProvider>
      <ShowStepsProvider>
        <ShowDependenciesProvider>
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
            {children}
          </div>
        </Layout>
      </GraphContext.Provider>
      </ShowDependenciesProvider>
      </ShowStepsProvider>
    </ShowParamsProvider>
  );
});

export default LiteFlowEditor;
