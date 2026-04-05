import React, { useEffect, useState } from 'react';
import { Graph } from '@antv/x6';
import { useModel } from '../../../hooks/useModel';
import styles from './elView.module.less';

interface IProps {
  flowGraph: Graph;
}

const ELView: React.FC<IProps> = (props) => {
  const { flowGraph } = props;
  const [elString, setELString] = useState<string>(useModel()?.toEL(' '));

  useEffect(() => {
    const handleModelChange = () => {
      setELString(useModel()?.toEL(' '));
    };
    flowGraph.on('model:change', handleModelChange);
    flowGraph.on('model:changed', handleModelChange);
    return () => {
      flowGraph.off('model:change', handleModelChange);
      flowGraph.off('model:changed', handleModelChange);
    };
  }, [flowGraph, setELString]);

  return (
    <div className={styles.elViewContainer}>
      <div className={styles.elContentWrapper}>
        <pre>{elString}</pre>
      </div>
    </div>
  );
};

export default ELView;