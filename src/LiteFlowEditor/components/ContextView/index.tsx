import React from 'react';
import { Tag, Empty } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import styles from './index.module.less';

interface ContextField {
  fieldName: string;
  fieldType: string;
  description: string;
  fromInput: boolean;
  fromOutput: boolean;
}

interface ContextInfo {
  name: string;
  description: string;
  fields: ContextField[];
}

interface IProps {
  contexts: Record<string, ContextInfo>;
}

const ContextView: React.FC<IProps> = ({ contexts }) => {
  const contextList = Object.values(contexts || {});

  if (contextList.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <DatabaseOutlined className={styles.headerIcon} />
          <span className={styles.headerTitle}>上下文视图</span>
        </div>
        <div className={styles.emptyWrapper}>
          <Empty description="暂无上下文数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <DatabaseOutlined className={styles.headerIcon} />
        <span className={styles.headerTitle}>上下文视图</span>
        <span className={styles.count}>({contextList.length})</span>
      </div>
      <div className={styles.contextList}>
        {contextList.map((ctx) => (
          <div key={ctx.name} className={styles.contextCard}>
            <div className={styles.contextHeader}>
              <Tag color="orange" className={styles.contextName}>{ctx.name}</Tag>
              {ctx.description && (
                <span className={styles.contextDesc}>{ctx.description}</span>
              )}
            </div>
            <div className={styles.fieldList}>
              {ctx.fields?.map((field, idx) => (
                <div key={idx} className={styles.fieldRow}>
                  <span className={styles.fieldName}>{field.fieldName}</span>
                  <Tag color="cyan" className={styles.fieldType}>{field.fieldType}</Tag>
                  {field.description && (
                    <span className={styles.fieldDesc}>{field.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContextView;