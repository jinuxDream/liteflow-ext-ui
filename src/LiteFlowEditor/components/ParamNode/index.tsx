import React from 'react';
import { Tag } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import styles from './index.module.less';

interface IParam {
  fieldName: string;
  fieldType: string;
  required: boolean;
  description: string;
}

interface IProps {
  nodeName: string;
  inputParameters: IParam[];
  outputParameters: IParam[];
}

const ParamNode: React.FC<IProps> = ({ nodeName, inputParameters, outputParameters }) => {
  const hasParams = (inputParameters?.length > 0 || outputParameters?.length > 0);

  return (
    <div className={styles.paramNode}>
      <div className={styles.panelHeader}>
        <SettingOutlined className={styles.headerIcon} />
        <span className={styles.headerTitle}>参数-{nodeName}</span>
      </div>
      
      {hasParams && (
        <div className={styles.panelContent}>
          {inputParameters?.length > 0 && (
            <div className={styles.paramGroup}>
              <div className={styles.paramGroupHeader}>输入参数 ({inputParameters.length})</div>
              <div className={styles.paramTable}>
                {inputParameters.map((param, index) => (
                  <div key={`input-${index}`} className={styles.paramRow}>
                    <div className={styles.paramDirection}>
                      <Tag color="blue" className={styles.directionTag}>输入</Tag>
                    </div>
                    <div className={styles.paramName}>{param.fieldName}</div>
                    <div className={styles.paramType}>
                      <Tag color="cyan" className={styles.typeTag}>{param.fieldType}</Tag>
                    </div>
                    <div className={styles.paramRequired}>
                      <Tag color={param.required ? 'red' : 'default'} className={styles.reqTag}>
                        {param.required ? '必填' : '可选'}
                      </Tag>
                    </div>
                    <div className={styles.paramDesc}>{param.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {outputParameters?.length > 0 && (
            <div className={styles.paramGroup}>
              <div className={styles.paramGroupHeader}>输出参数 ({outputParameters.length})</div>
              <div className={styles.paramTable}>
                {outputParameters.map((param, index) => (
                  <div key={`output-${index}`} className={styles.paramRow}>
                    <div className={styles.paramDirection}>
                      <Tag color="green" className={styles.directionTag}>输出</Tag>
                    </div>
                    <div className={styles.paramName}>{param.fieldName}</div>
                    <div className={styles.paramType}>
                      <Tag color="cyan" className={styles.typeTag}>{param.fieldType}</Tag>
                    </div>
                    <div className={styles.paramRequired}>
                      <Tag color={param.required ? 'red' : 'default'} className={styles.reqTag}>
                        {param.required ? '必填' : '可选'}
                      </Tag>
                    </div>
                    <div className={styles.paramDesc}>{param.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {!hasParams && (
        <div className={styles.panelContent}>
          <div className={styles.noParams}>该节点没有参数</div>
        </div>
      )}
    </div>
  );
};

export default ParamNode;