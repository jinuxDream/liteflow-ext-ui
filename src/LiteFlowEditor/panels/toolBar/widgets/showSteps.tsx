import React from 'react';
import { Button, Tooltip } from 'antd';
import { OrderedListOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Graph } from '@antv/x6';
import { useShowSteps } from '../../../context/ShowStepsContext';

interface IProps {
  flowGraph: Graph;
}

const ShowStepsWidget: React.FC<IProps> = ({ flowGraph }) => {
  const { showSteps, toggleShowSteps } = useShowSteps();

  const handleClick = () => {
    const newShowSteps = !showSteps;
    toggleShowSteps();
    
    flowGraph.trigger('node:showStepsChanged', { showSteps: newShowSteps });
  };

  return (
    <Tooltip title={showSteps ? '隐藏执行步骤' : '显示执行步骤'}>
      <Button 
        type="text" 
        icon={showSteps ? <OrderedListOutlined style={{ color: '#d46b08' }} /> : <UnorderedListOutlined style={{ color: '#8c8c8c' }} />}
        onClick={handleClick}
      />
    </Tooltip>
  );
};

export default ShowStepsWidget;
