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
    toggleShowParams();
    flowGraph.trigger('node:showParamsChanged', { showParams: !showParams });
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
