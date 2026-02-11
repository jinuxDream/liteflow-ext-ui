import React, { useEffect, useReducer } from 'react';
import { Graph } from '@antv/x6';
import widgets from './widgets';
import { useGraph } from '../../hooks';
import styles from './index.module.less';

interface IProps {
  flowGraph: Graph;
  widgets?: React.FC<any>[];
}

const ToolBar: React.FC<IProps> = ({ widgets: customWidgets }) => {
  const flowGraph: Graph = useGraph();
  const forceUpdate = useReducer((n) => n + 1, 0)[1];

  useEffect(() => {
    flowGraph.on('toolBar:forceUpdate', forceUpdate);
    return () => {
      flowGraph.off('toolBar:forceUpdate');
    };
  }, [flowGraph]);

  let customWidgetsGroup = null
  if (customWidgets && customWidgets.length) {
    customWidgetsGroup = (
      <div className={styles.liteflowEditorToolBarGroup}>
        { customWidgets.map((WidgetItem, index) => <WidgetItem key={index} flowGraph={flowGraph} />) }
      </div>
    )
  }

  return (
    <div className={styles.liteflowEditorToolBarContainer}>
      {widgets.map((group, index) => (
        <div key={index} className={styles.liteflowEditorToolBarGroup}>
          {group.map((ToolItem, index) => {
            return <ToolItem key={index} flowGraph={flowGraph} />;
          })}
        </div>
      ))}
      { customWidgetsGroup }
    </div>
  );
};

export default ToolBar;
