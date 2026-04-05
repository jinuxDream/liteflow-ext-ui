import React from 'react';
import { Tooltip, Switch } from 'antd';
import { Graph } from '@antv/x6';
import { setGlobalHoverPanelEnabled, getGlobalHoverPanelEnabled } from '../../../context/HoverPanelContext';
import styles from './hoverPanel.module.less';

interface IProps {
  flowGraph?: Graph;
}

const HoverPanelToggle: React.FC<IProps> = () => {
  const [enabled, setEnabled] = React.useState(getGlobalHoverPanelEnabled());

  const handleToggle = (checked: boolean) => {
    setGlobalHoverPanelEnabled(checked);
    setEnabled(checked);
  };

  return (
    <div className={styles.hoverPanelToggle}>
      <Tooltip title="悬停高亮" placement="bottom">
        <div className={styles.toggleContent}>
          <Switch
            size="small"
            checked={enabled}
            onChange={handleToggle}
          />
          <span className={styles.toggleLabel}>悬停</span>
        </div>
      </Tooltip>
    </div>
  );
};

export default HoverPanelToggle;