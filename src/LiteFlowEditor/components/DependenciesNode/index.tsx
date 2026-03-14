import React from 'react';
import { ClusterOutlined } from '@ant-design/icons';
import styles from './index.module.less';

interface IDependency {
  type: string;
  name: string;
  description: string;
}

interface IProps {
  nodeName: string;
  dependencies: IDependency[];
}

const DependenciesNode: React.FC<IProps> = ({ nodeName, dependencies }) => {
  const hasDependencies = dependencies?.length > 0;

  return (
    <div className={styles.dependenciesNode}>
      <div className={styles.panelHeader}>
        <ClusterOutlined className={styles.headerIcon} />
        <span className={styles.headerTitle}>依赖清单-{nodeName}</span>
      </div>
      
      {hasDependencies && (
        <div className={styles.panelContent}>
          <div className={styles.dependenciesTable}>
            {dependencies.map((dep, index) => (
              <div key={index} className={styles.dependencyRow}>
                <div className={styles.dependencyType}>
                  <span className={styles.typeTag}>{dep.type}</span>
                </div>
                <div className={styles.dependencyName}>{dep.name}</div>
                <div className={styles.dependencyDesc}>{dep.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!hasDependencies && (
        <div className={styles.panelContent}>
          <div className={styles.noDependencies}>该节点没有依赖</div>
        </div>
      )}
    </div>
  );
};

export default DependenciesNode;
