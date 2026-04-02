import React, { useState, useEffect } from 'react';
import { Table, Tag, Spin } from 'antd';
import { ApiOutlined, ImportOutlined, ExportOutlined } from '@ant-design/icons';
import styles from './index.module.less';

const API_BASE_PATH = (window as any).LITEFLOW_CONFIG?.API_BASE_PATH || '/api';

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
  chainId: string | null;
  visible: boolean;
  position: { x: number; y: number } | null;
}

const InterfaceInfoPopover: React.FC<IProps> = ({ chainId, visible, position }) => {
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
      width: 150,
      render: (text: string) => (
        <code style={{ color: '#1890ff', fontSize: 12, wordBreak: 'break-all' }}>
          {text}
        </code>
      ),
    },
    {
      title: '类型',
      dataIndex: 'fieldType',
      key: 'fieldType',
      width: 80,
      render: (text: string) => <Tag color="blue" style={{ fontSize: 11 }}>{text}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: false,
      render: (text: string) => (
        <span style={{ wordBreak: 'break-all', fontSize: 12 }}>{text}</span>
      ),
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      width: 50,
      render: (required: boolean) => (
        <Tag color={required ? 'red' : 'default'} style={{ fontSize: 11 }}>{required ? '是' : '否'}</Tag>
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

  if (!visible || !position) {
    return null;
  }

  return (
    <div
      className={styles.interfaceInfoLayer}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {loading ? (
        <div className={styles.loadingWrapper}>
          <Spin size="small" />
        </div>
      ) : interfaceInfo ? (
        <>
          <div className={styles.infoHeader}>
            <div className={styles.infoTitle}>
              <ApiOutlined className={styles.titleIcon} />
              <span>{interfaceInfo.interfaceName}</span>
            </div>
            <div className={styles.infoPath}>
              <Tag color={getMethodColor(method)}>{method}</Tag>
              <code>{interfaceInfo.interfacePath}</code>
            </div>
            {interfaceInfo.description && (
              <div className={styles.infoDesc}>{interfaceInfo.description}</div>
            )}
          </div>

          <div className={styles.paramSection}>
            <div className={styles.paramHeader}>
              <ImportOutlined />
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
              <div className={styles.emptyText}>暂无输入参数</div>
            )}
          </div>

          <div className={styles.paramSection}>
            <div className={styles.paramHeader}>
              <ExportOutlined />
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
              <div className={styles.emptyText}>暂无输出参数</div>
            )}
          </div>
        </>
      ) : (
        <div className={styles.emptyText}>未找到接口信息</div>
      )}
    </div>
  );
};

export default InterfaceInfoPopover;
