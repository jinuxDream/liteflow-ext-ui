import React from 'react';
import { Button, Tooltip } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { Graph } from '@antv/x6';
import { useShowParams } from '../../../context/ShowParamsContext';

interface IProps {
  flowGraph: Graph;
}

const ShowParamsWidget: React.FC<IProps> = ({ flowGraph }) => {
  const { showParams, toggleShowParams } = useShowParams();

  const handleClick = () => {
    const newShowParams = !showParams;
    console.log('Toggle showParams:', { current: showParams, new: newShowParams });
    toggleShowParams();
    flowGraph.trigger('node:showParamsChanged', { showParams: newShowParams });
    console.log('Triggered event with:', newShowParams);
  };

  return (
    <Tooltip title={showParams ? '隐藏参数' : '显示参数'}>
      <Button 
        type="text" 
        icon={showParams ? <EyeOutlined /> : <EyeInvisibleOutlined />}
        onClick={handleClick}
      />
    </Tooltip>
  );
};

export default ShowParamsWidget;
