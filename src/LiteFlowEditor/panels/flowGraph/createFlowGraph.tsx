import React from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from 'antd';
import { Cell, Graph, NodeView } from '@antv/x6';
import { debounce } from 'lodash';
import { Clipboard } from '@antv/x6-plugin-clipboard'
import { Export } from '@antv/x6-plugin-export'
import { History } from '@antv/x6-plugin-history'
import { Keyboard } from '@antv/x6-plugin-keyboard'
import { MiniMap } from '@antv/x6-plugin-minimap'
import { Scroller } from '@antv/x6-plugin-scroller'
import { Selection } from '@antv/x6-plugin-selection'
import { Snapline } from '@antv/x6-plugin-snapline'
import { Transform } from '@antv/x6-plugin-transform'
import { MIN_ZOOM, MAX_ZOOM } from '../../constant';
// import MiniMapSimpleNode from './miniMapSimpleNode';

import {
  LITEFLOW_ANCHOR,
  LITEFLOW_ROUTER,
  registerEvents,
  registerShortcuts,
  LITEFLOW_EDGE,
} from '../../common';
import liteflowEdge from '../../common/edge';

const createFlowChart = (
  container: HTMLDivElement,
  miniMapContainer: HTMLDivElement,
  enableEdit: boolean = true,
  showEdgeAddButton: boolean = true,
): Graph => {
  Graph.unregisterEdge(LITEFLOW_EDGE);
  Graph.registerEdge(LITEFLOW_EDGE, {
    ...liteflowEdge,
    label: showEdgeAddButton ? '+' : '',
    defaultLabel: showEdgeAddButton ? liteflowEdge.defaultLabel : null,
    attrs: {
      ...liteflowEdge.attrs,
      label: {
        display: showEdgeAddButton ? 'block' : 'none',
        visibility: showEdgeAddButton ? 'visible' : 'hidden',
        opacity: showEdgeAddButton ? 1 : 0,
      },
    },
  });

  const flowGraph = new Graph({
    virtual: false,
    async: true,
    autoResize: true,
    container, // @ts-ignore
    edgeLabelMarkup: showEdgeAddButton ? undefined : [],
    onEdgeLabelRendered: (args) => {
      const { edge, selectors, label } = args;
      const content = selectors.foContent as HTMLElement;
      if (content) {
        if (!showEdgeAddButton) {
          content.style.display = 'none';
          content.style.visibility = 'hidden';
          content.style.pointerEvents = 'none';
          content.style.opacity = '0';
          edge.attr('label/display', 'none');
          return;
        }
        const labelText = label?.attrs?.label.text;
        if (labelText !== '+') {
          content.style.display = 'none';
          return;
        }
        content.style.display = 'flex';
        content.style.alignItems = 'center';
        content.style.justifyContent = 'center';
        content.style.overflow = 'hidden';
        if (enableEdit && showEdgeAddButton && labelText === '+') {
          const showContextPad = debounce((info: any) => {
            flowGraph.trigger('graph:showContextPad', info);
          }, 100);
          const handleOnClick = (event: any) => {
            showContextPad({
              x: event.clientX,
              y: event.clientY,
              edge,
            });
          };
          const root = createRoot(content);
          root.render(
            <Button
              size="small"
              onClick={handleOnClick}
              className="liteflow-edge-add-button"
            >
              +
            </Button>
          );
        }
      }
    },
    // https://x6.antv.vision/zh/docs/tutorial/intermediate/connector
    connecting: {
      snap: true,
      allowBlank: false,
      allowLoop: false,
      allowNode: false,
      allowEdge: false,
      highlight: true,
      anchor: LITEFLOW_ANCHOR, // LITEFLOW_ANCHOR, // 'center',
      connectionPoint: 'bbox',
      connector: {
        name: 'rounded', //两条线交叉时，出现线桥。
        args: {
          radius: 8,
        },
      },
      router: LITEFLOW_ROUTER, // LITEFLOW_ROUTER, // 'normal',
      validateEdge: (args) => {
        const { edge } = args;
        return !!(edge?.target as any)?.port;
      },
      validateConnection({
        sourceView,
        targetView,
        sourceMagnet,
        targetMagnet,
      }) {
        if (!sourceMagnet) {
          return false;
        } else if (!targetMagnet) {
          return false;
        } else {
          return sourceView !== targetView;
        }
      },
    },
    // https://x6.antv.vision/zh/docs/tutorial/basic/background
    background: {
      color: '#f4f7fc',
    },
    // https://x6.antv.vision/zh/docs/tutorial/basic/grid
    grid: {
      visible: true,
    },
    mousewheel: {
      enabled: true,
      minScale: MIN_ZOOM,
      maxScale: MAX_ZOOM,
      modifiers: ['ctrl', 'meta'],
    },
    interacting: {
      nodeMovable: enableEdit,
      edgeLabelMovable: false,
    },
  });
  // 图形变换：https://x6.antv.antgroup.com/tutorial/plugins/transform
  flowGraph.use(
    new Transform({
      rotating: false,
      resizing: false,
    }),
  );
  // 对齐线： https://x6.antv.antgroup.com/tutorial/plugins/snapline
  flowGraph.use(
    new Snapline({
      enabled: true,
      clean: 100,
    }),
  );
  // 复制粘贴：https://x6.antv.antgroup.com/tutorial/plugins/clipboard
  flowGraph.use(
    new Clipboard({
      enabled: true,
      useLocalStorage: true,
    }),
  );
  // 快捷键：https://x6.antv.antgroup.com/tutorial/plugins/keyboard
  flowGraph.use(
    new Keyboard({
      enabled: true,
      global: false,
    }),
  );
  // 撤销重做：https://x6.antv.antgroup.com/tutorial/plugins/history
  flowGraph.use(
    new History({
      enabled: true,
      beforeAddCommand(event, args: any) {
        if (args.options) {
          return args.options.ignore !== true;
        }
      },
    }),
  );
  // 框选：https://x6.antv.antgroup.com/tutorial/plugins/selection
  flowGraph.use(
    new Selection({
      enabled: true,
      rubberband: false, // 启用框选
      movable: true,
      multiple: true,
      strict: true,
      showNodeSelectionBox: true,
      selectNodeOnMoved: true,
      pointerEvents: 'none',
    }),
  );
  // 滚动画布：https://x6.antv.antgroup.com/tutorial/plugins/scroller
  flowGraph.use(
    new Scroller({
      enabled: true,
      pageVisible: false,
      pageBreak: false,
      pannable: true,
      padding: 100,
    }),
  );
  // 小地图：https://x6.antv.antgroup.com/tutorial/plugins/minimap
  flowGraph.use(
    new MiniMap({
      width: 150,
      height: 150,
      minScale: MIN_ZOOM,
      maxScale: MAX_ZOOM,
      scalable: false,
      container: miniMapContainer,
      graphOptions: {
        async: true,
        createCellView(cell: Cell) {
          if (cell.isEdge()) {
            return null;
          }
        },
      },
    }),
  );
  // 导出：https://x6.antv.antgroup.com/tutorial/plugins/export
  flowGraph.use(
    new Export()
  );
  registerEvents(flowGraph, showEdgeAddButton);
  if (enableEdit) {
    registerShortcuts(flowGraph);
  }
  
  if (!showEdgeAddButton) {
    flowGraph.getEdges().forEach((edge) => {
      edge.setLabel('');
    });
  }
  
  return flowGraph;
};

export default createFlowChart;

export { createFlowChart as createFlowGraph };
