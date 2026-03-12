import React, { useEffect } from 'react';
import {Form, Input, Descriptions, Tag, Empty, Divider} from 'antd';
import {ArrowRightOutlined, ArrowLeftOutlined, CheckCircleOutlined, ApiOutlined, WarningOutlined} from '@ant-design/icons';
import {debounce} from 'lodash';
import {history} from '../../../hooks/useHistory';
import ELNode, {NodeMetadata} from '../../../model/node';
import styles from './index.module.less';

const { TextArea } = Input;

interface IProps {
  model: ELNode;
}

const ComponentPropertiesEditor: React.FC<IProps> = (props) => {
  const {model} = props;
  const properties = model.getProperties();
  const metadata = model.metadata;

  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue({...properties, id: model.id});
  }, [model]);

  const handleOnChange = debounce(async () => {
    try {
      const changedValues = await form.validateFields();
      const { id, ...rest } = changedValues
      model.id = id;
      model.setProperties({...properties, ...rest});
      history.push(undefined, {silent: true});
      const modelNode = model.getStartNode();
      const originSize = modelNode.getSize();
      modelNode
        .updateAttrs({label: { text: id }})
        .setSize(originSize);
    } catch (errorInfo) {
      console.log('Failed:', errorInfo);
    }
  }, 200);

  const renderMetadata = () => {
    if (!metadata) {
      return (
        <Empty 
          description="暂无节点元数据信息" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <div className={styles.metadataContainer}>
        {metadata.nodeName && (
          <div className={styles.basicInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>ID:</span>
              <Tag color="blue" className={styles.infoTag}>{metadata.nodeId}</Tag>
              <span className={styles.infoLabel}>名称:</span>
              <Tag color="green" className={styles.infoTag}>{metadata.nodeName}</Tag>
            </div>
            {metadata.description && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>描述:</span>
                <span className={styles.infoDesc}>{metadata.description}</span>
              </div>
            )}
          </div>
        )}

        {metadata.inputParameters && metadata.inputParameters.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <ArrowLeftOutlined className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>输入参数</span>
              <span className={styles.sectionCount}>({metadata.inputParameters.length})</span>
            </div>
            <div className={styles.paramTable}>
              {metadata.inputParameters.map((param, index) => (
                <div key={index} className={styles.paramRow}>
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

        {metadata.outputParameters && metadata.outputParameters.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <ArrowRightOutlined className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>输出参数</span>
              <span className={styles.sectionCount}>({metadata.outputParameters.length})</span>
            </div>
            <div className={styles.paramTable}>
              {metadata.outputParameters.map((param, index) => (
                <div key={index} className={styles.paramRow}>
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

        {metadata.accessRule && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <CheckCircleOutlined className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>准入规则</span>
            </div>
            <div className={styles.accessRuleBox}>
              <span className={styles.accessRuleIcon}>ℹ</span>
              <span className={styles.accessRuleText}>{metadata.accessRule.description}</span>
            </div>
          </div>
        )}

        {metadata.steps && metadata.steps.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <ApiOutlined className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>执行步骤</span>
              <span className={styles.sectionCount}>({metadata.steps.length})</span>
            </div>
            <div className={styles.stepsCompact}>
              {metadata.steps.map((step, index) => (
                <div key={index} className={styles.stepCompactItem}>
                  <span className={styles.stepNum}>{step.order}.</span>
                  <span className={styles.stepText}>{step.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {metadata.dependencies && metadata.dependencies.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <WarningOutlined className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>依赖清单</span>
              <span className={styles.sectionCount}>({metadata.dependencies.length})</span>
            </div>
            <div className={styles.depsList}>
              {metadata.dependencies.map((dep, index) => (
                <div key={index} className={styles.depItem}>
                  <Tag color="purple" className={styles.depType}>{dep.type}</Tag>
                  <span className={styles.depName}>{dep.name}</span>
                  <span className={styles.depDesc}>{dep.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.liteflowEditorPropertiesEditorContainer}>
      <Form
        layout="vertical"
        form={form}
        initialValues={{...properties, id: model.id}}
        onValuesChange={handleOnChange}
      >
        <Form.Item name="id" label="ID" className={styles.idFormItem}>
          <Input allowClear size="small"/>
        </Form.Item>
      </Form>
      
      <Divider className={styles.divider} />
      
      <div className={styles.metadataSection}>
        {renderMetadata()}
      </div>
    </div>
  );
};

export default ComponentPropertiesEditor;
