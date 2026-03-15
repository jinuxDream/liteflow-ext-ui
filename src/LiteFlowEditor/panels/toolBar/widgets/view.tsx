import { ApiOutlined } from '@ant-design/icons';
import { Graph } from '@antv/x6';
import React from 'react';
import { Modal } from 'antd';
import JsonView from 'react-json-view';

import makeBtnWidget from './common/makeBtnWidget';
import { useModel } from '../../../hooks';

interface IProps {
  flowGraph: Graph;
}

const View: React.FC<IProps> = makeBtnWidget({
  tooltip: '查看DSL',
  handler() {
    const model = useModel();
    Modal.info({
      title: '查看DSL',
      width: 1000,
      maskClosable: true,
      closable: true,
      content: (
        // @ts-ignore
        <JsonView
          name={null}
          collapsed={false}
          enableClipboard={false}
          displayDataTypes={false}
          displayObjectSize={false}
          indentWidth={2}
          groupArraysAfterLength={10}
          style={{
            fontSize: '12px',
            lineHeight: '1.4',
            padding: '8px'
          }}
          src={JSON.parse(JSON.stringify(model.toJSON()))}
        />
      ),
    });
  },
  getIcon() {
    return <ApiOutlined />;
  },
  disabled(flowGraph: Graph) {
    return false;
  },
});

export default View;
