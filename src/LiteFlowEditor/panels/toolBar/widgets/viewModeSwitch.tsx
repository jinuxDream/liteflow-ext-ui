import React, { useContext } from 'react';
import { Radio, Tooltip, Button } from 'antd';
import {
  ApartmentOutlined,
  SwapOutlined,
  ClusterOutlined,
  FileTextOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { Graph } from '@antv/x6';
import { useViewMode, ViewMode, setGlobalViewMode } from '../../../context/ViewModeContext';
import GraphContext from '../../../context/GraphContext';
import styles from './viewModeSwitch.module.less';

interface IProps {
  flowGraph?: Graph;
}

const ViewModeSwitch: React.FC<IProps> = ({ flowGraph }) => {
  const { viewMode, setViewMode } = useViewMode();
  // 优先使用 props 中的 flowGraph，如果没有则使用 context 中的
  const graph = flowGraph || useContext(GraphContext)?.graph;

  const options = [
    { value: 'summary', label: '摘要视图', icon: <FileTextOutlined /> },
    { value: 'logic', label: '逻辑视图', icon: <ApartmentOutlined /> },
    { value: 'dataflow', label: '数据流视图', icon: <SwapOutlined /> },
    { value: 'dependency', label: '依赖视图', icon: <ClusterOutlined /> },
  ];

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setGlobalViewMode(mode);
    // 触发节点重新渲染
    if (graph) {
      graph.getNodes().forEach((node: any) => {
        node.setProp('viewMode', mode);
      });
      // 触发内容面板更新
      graph.trigger('viewMode:changed', { viewMode: mode });
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className={styles.viewModeSwitch}>
      <span className={styles.viewLabel}>视图</span>
      <Radio.Group
        value={viewMode}
        onChange={(e) => handleViewModeChange(e.target.value)}
        size="small"
        optionType="button"
        buttonStyle="solid"
      >
        {options.map((option) => (
          <Radio.Button key={option.value} value={option.value}>
            <Tooltip title={option.label} placement="bottom">
              <span className={styles.optionContent}>
                {option.icon}
                <span className={styles.optionLabel}>{option.label}</span>
              </span>
            </Tooltip>
          </Radio.Button>
        ))}
      </Radio.Group>
      <Tooltip title="刷新" placement="bottom">
        <Button
          className={styles.refreshBtn}
          size="small"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
        />
      </Tooltip>
    </div>
  );
};

export default ViewModeSwitch;
