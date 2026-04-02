import React, { useState, useEffect, useReducer } from 'react';
import { Graph } from '@antv/x6';
import { Tabs } from 'antd';
import Basic from './basic';
import {
  ComponentPropertiesEditor,
  ConditionPropertiesEditor,
} from './properties';
import Outline from './outline';
import ELNode from '../../model/node';
import NodeOperator from '../../model/el/node-operator';
import styles from './index.module.less';

interface IProps {
  flowGraph: Graph;
}

const SettingBar: React.FC<IProps> = (props) => {
  const { flowGraph } = props;

  const [selectedModel, setSelectedModel] = useState<ELNode | null>(null);
  const [updateKey, setUpdateKey] = useState(0);
  const [activeKey, setActiveKey] = useState('properties');

  const forceUpdate = useReducer((n) => n + 1, 0)[1];

  useEffect(() => {
    forceUpdate();
  }, [selectedModel, updateKey]);

  useEffect(() => {
    const handler = () => {
      forceUpdate();
    };
    const handleSelect = (component: ELNode | null) => {
      setSelectedModel(component);
      setUpdateKey(prev => prev + 1);
      setActiveKey('properties');
    };
    flowGraph.on('settingBar:forceUpdate', handler);
    flowGraph.on('model:select', handleSelect);
    return () => {
      flowGraph.off('settingBar:forceUpdate', handler);
      flowGraph.off('model:select', handleSelect);
    };
  }, [flowGraph]);

  const nodes = flowGraph.getSelectedCells().filter((v) => !v.isEdge());
  let currentModel;
  if (selectedModel || nodes.length === 1) {
    currentModel = selectedModel || (nodes[0]?.getData()?.model);
    if (currentModel) {
      currentModel = currentModel.proxy || currentModel;
    }
  }

  let propertiesPanel = <Basic flowGraph={flowGraph} />;

  if (currentModel?.parent) {
    if (Object.getPrototypeOf(currentModel) === NodeOperator.prototype) {
      propertiesPanel = <ComponentPropertiesEditor model={currentModel} />;
    } else {
      propertiesPanel = <ConditionPropertiesEditor model={currentModel} />;
    }
  }

  const items = [
    {
      key: 'properties',
      label: '属性',
      children: propertiesPanel,
    },
    {
      key: 'outline',
      label: '结构树',
      children: <Outline flowGraph={flowGraph} />,
    },
  ];

  return (
    <div className={styles.liteflowEditorSettingBarContainer}>
      <Tabs activeKey={activeKey} onChange={setActiveKey} items={items} />
    </div>
  );
};

export default SettingBar;
