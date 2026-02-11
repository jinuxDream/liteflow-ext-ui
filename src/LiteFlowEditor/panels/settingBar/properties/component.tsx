import React, { useEffect } from 'react';
import {Form, Input} from 'antd';
const { TextArea } = Input;
import {debounce} from 'lodash';
import {history} from '../../../hooks/useHistory';
import ELNode from '../../../model/node';
import styles from './index.module.less';

interface IProps {
  model: ELNode;
}

const ComponentPropertiesEditor: React.FC<IProps> = (props) => {
  const {model} = props;
  const properties = model.getProperties();

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
      // history.push();
      // 以下是对AntV X6视图层进行临时修改
      const modelNode = model.getStartNode();
      const originSize = modelNode.getSize();
      modelNode
        .updateAttrs({label: { text: id }})
        .setSize(originSize); // 解决由于文本修改导致的尺寸错误
    } catch (errorInfo) {
      console.log('Failed:', errorInfo);
    }
  }, 200);

  return (
    <div className={styles.liteflowEditorPropertiesEditorContainer}>
      <Form
        layout="vertical"
        form={form}
        initialValues={{...properties, id: model.id}}
        onValuesChange={handleOnChange}
        // onBlur={handleOnChange}
      >
        <Form.Item name="id" label="ID">
          <Input allowClear/>
        </Form.Item>
        <Form.Item name="data" label="参数（data）">
          <Input allowClear/>
        </Form.Item>
        <Form.Item name="tag" label="标签（tag）">
          <Input allowClear/>
        </Form.Item>
        <Form.Item name="maxWaitSeconds" label="超时(maxWaitSeconds)">
          <Input allowClear/>
        </Form.Item>
        <Form.Item name="properties" label="属性（properties）">
          <TextArea rows={8} />
        </Form.Item>
      </Form>
    </div>
  );
};

export default ComponentPropertiesEditor;
