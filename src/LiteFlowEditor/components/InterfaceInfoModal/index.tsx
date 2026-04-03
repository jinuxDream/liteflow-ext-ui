import React, { useState, useEffect } from 'react';
import { Modal, Table, Tag, Descriptions, Empty } from 'antd';
import { ApiOutlined, ImportOutlined, ExportOutlined } from '@ant-design/icons';
import styles from './index.module.less';

const API_BASE_PATH = (window as any).LITEFLOW_CONFIG?.API_BASE_PATH || 'api';

interface NodeParameter {
  fieldName: string;
  fieldType: string;
  description: string;
  required: boolean;
}

interface InterfaceInfo {
  chainId: string;
  interfaceName: string;
  interfacePath: string;
  description: string;
  inputs: NodeParameter[];
  outputs: NodeParameter[];
}

interface IProps {
  visible: boolean;
  onClose: () => void;
  chainId: string | null;
}

const InterfaceInfoModal: React.FC<IProps> = ({ visible, onClose, chainId }) => {
  const [interfaceInfo, setInterfaceInfo] = useState<InterfaceInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && chainId) {
      setLoading(true);
      fetch(`${API_BASE_PATH}/getInterfaceList`, { method: 'GET' })
        .then((res) => res.json())
        .then((data: InterfaceInfo[]) => {
          const found = data.find((item) => item.chainId === chainId);
          setInterfaceInfo(found || null);
        })
        .catch((err) => {
          console.error('获取接口信息失败:', err);
          setInterfaceInfo(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setInterfaceInfo(null);
    }
  }, [visible, chainId]);

  // 参数表格列配置
  const paramColumns = [
    {
      title: '字段名',
      dataIndex: 'fieldName',
      key: 'fieldName',
      width: 120,
      render: (text: string) => <code style={{ color: '#1890ff' }}>{text}</code>,
    },
    {
      title: '类型',
      dataIndex: 'fieldType',
      key: 'fieldType',
      width: 100,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      width: 60,
      render: (required: boolean) => (
        <Tag color={required ? 'red' : 'default'}>{required ? '是' : '否'}</Tag>
      ),
    },
  ];

  // 获取 HTTP 方法
  const getHttpMethod = (path: string): string => {
    if (!path) return 'GET';
    const method = path.split(' ')[0].toUpperCase();
    return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method) ? method : 'GET';
  };

  // 获取方法对应的颜色
  const getMethodColor = (method: string): string => {
    const colors: Record<string, string> = {
      GET: 'green',
      POST: 'blue',
      PUT: 'orange',
      DELETE: 'red',
      PATCH: 'cyan',
    };
    return colors[method] || 'default';
  };

  const method = getHttpMethod(interfaceInfo?.interfacePath || '');

  return (
    <Modal
      className={styles.interfaceInfoModal}
      width={700}
      title={
        <div className={styles.modalTitle}>
          <ApiOutlined className={styles.titleIcon} />
          <span>接口属性信息</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      loading={loading}
    >
      {interfaceInfo ? (
        <div className={styles.modalContent}>
          <Descriptions bordered column={1} size="small" className={styles.basicInfo}>
            <Descriptions.Item label="接口名称">{interfaceInfo.interfaceName}</Descriptions.Item>
            <Descriptions.Item label="Chain ID">
              <code>{interfaceInfo.chainId}</code>
            </Descriptions.Item>
            <Descriptions.Item label="请求路径">
              <Tag color={getMethodColor(method)}>{method}</Tag>
              <code style={{ marginLeft: 8 }}>{interfaceInfo.interfacePath}</code>
            </Descriptions.Item>
            <Descriptions.Item label="描述">{interfaceInfo.description || '-'}</Descriptions.Item>
          </Descriptions>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <ImportOutlined className={styles.sectionIcon} />
              <span>输入参数 ({interfaceInfo.inputs?.length || 0})</span>
            </div>
            {interfaceInfo.inputs && interfaceInfo.inputs.length > 0 ? (
              <Table
                dataSource={interfaceInfo.inputs}
                columns={paramColumns}
                rowKey="fieldName"
                pagination={false}
                size="small"
                className={styles.paramTable}
              />
            ) : (
              <Empty description="暂无输入参数" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <ExportOutlined className={styles.sectionIcon} />
              <span>输出参数 ({interfaceInfo.outputs?.length || 0})</span>
            </div>
            {interfaceInfo.outputs && interfaceInfo.outputs.length > 0 ? (
              <Table
                dataSource={interfaceInfo.outputs}
                columns={paramColumns}
                rowKey="fieldName"
                pagination={false}
                size="small"
                className={styles.paramTable}
              />
            ) : (
              <Empty description="暂无输出参数" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        </div>
      ) : (
        <Empty description="未找到接口信息" />
      )}
    </Modal>
  );
};

export default InterfaceInfoModal;
