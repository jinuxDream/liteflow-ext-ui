import React from 'react';
import { Button, Tooltip } from 'antd';
import { ClusterOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Graph } from '@antv/x6';
import { useShowDependencies } from '../../../context/ShowDependenciesContext';

interface IProps {
  flowGraph: Graph;
}

const ShowDependenciesWidget: React.FC<IProps> = ({ flowGraph }) => {
  const { showDependencies, toggleShowDependencies } = useShowDependencies();

  const handleClick = () => {
    const newShowDependencies = !showDependencies;
    console.log('Toggle showDependencies:', { current: showDependencies, new: newShowDependencies });
    toggleShowDependencies();
    
    flowGraph.trigger('node:showDependenciesChanged', { showDependencies: newShowDependencies });
  };

  return (
    <Tooltip title={showDependencies ? '隐藏依赖清单' : '显示依赖清单'}>
      <Button 
        type="text" 
        icon={showDependencies ? <ClusterOutlined style={{ color: '#389e0d' }} /> : <AppstoreOutlined style={{ color: '#8c8c8c' }} />}
        onClick={handleClick}
      />
    </Tooltip>
  );
};

export default ShowDependenciesWidget;
