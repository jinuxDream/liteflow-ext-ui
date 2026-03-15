import React from 'react';
import { Button, Tooltip } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { Graph } from '@antv/x6';
import { useShowParams } from '../../../context/ShowParamsContext';
import { useShowSteps } from '../../../context/ShowStepsContext';
import { useShowDependencies } from '../../../context/ShowDependenciesContext';

interface IProps {
  flowGraph: Graph;
}

const ShowAllWidget: React.FC<IProps> = ({ flowGraph }) => {
  const { showParams, toggleShowParams } = useShowParams();
  const { showSteps, toggleShowSteps } = useShowSteps();
  const { showDependencies, toggleShowDependencies } = useShowDependencies();

  const allVisible = showParams && showSteps && showDependencies;

  const handleClick = () => {
    const newShowAll = !allVisible;
    
    if (newShowAll) {
      if (!showParams) toggleShowParams();
      if (!showSteps) toggleShowSteps();
      if (!showDependencies) toggleShowDependencies();
    } else {
      if (showParams) toggleShowParams();
      if (showSteps) toggleShowSteps();
      if (showDependencies) toggleShowDependencies();
    }
    
    flowGraph.trigger('node:showParamsChanged', { showParams: newShowAll });
    flowGraph.trigger('node:showStepsChanged', { showSteps: newShowAll });
    flowGraph.trigger('node:showDependenciesChanged', { showDependencies: newShowAll });
  };

  return (
    <Tooltip title={allVisible ? '全部隐藏' : '全部显示'}>
      <Button 
        type="text" 
        icon={allVisible ? <EyeOutlined style={{ color: '#096dd9' }} /> : <EyeInvisibleOutlined style={{ color: '#8c8c8c' }} />}
        onClick={handleClick}
      />
    </Tooltip>
  );
};

export default ShowAllWidget;
