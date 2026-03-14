import React from 'react';
import { OrderedListOutlined } from '@ant-design/icons';
import styles from './index.module.less';

interface IStep {
  order: number;
  description: string;
}

interface IProps {
  nodeName: string;
  steps: IStep[];
}

const StepsNode: React.FC<IProps> = ({ nodeName, steps }) => {
  const hasSteps = steps?.length > 0;

  return (
    <div className={styles.stepsNode}>
      <div className={styles.panelHeader}>
        <OrderedListOutlined className={styles.headerIcon} />
        <span className={styles.headerTitle}>执行步骤-{nodeName}</span>
      </div>
      
      {hasSteps && (
        <div className={styles.panelContent}>
          <div className={styles.stepsList}>
            {steps.map((step, index) => (
              <div key={index} className={styles.stepItem}>
                <span className={styles.stepNum}>{step.order}.</span>
                <span className={styles.stepText}>{step.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!hasSteps && (
        <div className={styles.panelContent}>
          <div className={styles.noSteps}>该节点没有执行步骤</div>
        </div>
      )}
    </div>
  );
};

export default StepsNode;
