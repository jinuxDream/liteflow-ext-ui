import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Select, Tag, Spin } from 'antd';
import GraphContext from '../../../context/GraphContext';
import { useInterface } from '../../../context/InterfaceContext';
import styles from './interfaceSelector.module.less';

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
  flowGraph?: any;
}

const InterfaceSelector: React.FC<IProps> = () => {
  const [interfaces, setInterfaces] = useState<InterfaceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentEditor } = useContext<any>(GraphContext);
  const { currentInterface, setCurrentInterface } = useInterface();

  // 加载流程详情
  const loadChainById = (chainId: string) => {
    fetch(`${API_BASE_PATH}/getChainById?chainId=${chainId}`, { method: 'GET' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.elJson && currentEditor) {
          currentEditor.fromJSON(data.elJson);
        }
      })
      .catch((err) => {
        console.error('加载流程失败:', err);
      });
  };

  // 选择接口
  const handleSelectInterface = (interfaceInfo: InterfaceInfo) => {
    setCurrentInterface(interfaceInfo);
    loadChainById(interfaceInfo.chainId);
  };

  // 加载接口列表
  const loadInterfaceList = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE_PATH}/getInterfaceList`, { method: 'GET' })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length) {
          setInterfaces(data);
          // 默认选中第一个接口
          if (data.length > 0 && !currentInterface) {
            handleSelectInterface(data[0]);
          }
        }
      })
      .catch((err) => {
        console.error('加载接口列表失败:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentInterface]);

  // Select change handler
  const handleSelectChange = (chainId: string) => {
    const selected = interfaces.find((item) => item.chainId === chainId);
    if (selected) {
      handleSelectInterface(selected);
    }
  };

  useEffect(() => {
    loadInterfaceList();
  }, []);

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

  // 格式化选项标签
  const formatOptionLabel = (item: InterfaceInfo) => {
    const method = getHttpMethod(item.interfacePath);
    return (
      <div className={styles.interfaceOption}>
        <Tag color={getMethodColor(method)} className={styles.methodTag}>
          {method}
        </Tag>
        <span className={styles.interfaceName}>
          {item.interfaceName || item.chainId}
        </span>
      </div>
    );
  };

  return (
    <div className={styles.interfaceSelector}>
      <span className={styles.selectorLabel}>选择接口</span>
      <Select
        showSearch
        value={currentInterface?.chainId}
        placeholder="选择接口查看流程"
        style={{ width: 240 }}
        loading={loading}
        onChange={handleSelectChange}
        filterOption={(input, option) => {
          const item = interfaces.find((i) => i.chainId === option?.value);
          if (!item) return false;
          const searchStr = `${item.interfaceName} ${item.interfacePath} ${item.description}`.toLowerCase();
          return searchStr.includes(input.toLowerCase());
        }}
        popupClassName={styles.interfaceDropdown}
        optionLabelProp="label"
        notFoundContent={loading ? <Spin size="small" /> : '暂无接口数据'}
      >
        {interfaces.map((item) => {
          const method = getHttpMethod(item.interfacePath);
          return (
            <Select.Option key={item.chainId} value={item.chainId} label={formatOptionLabel(item)}>
              <div className={styles.dropdownOption}>
                <div className={styles.optionHeader}>
                  <Tag color={getMethodColor(method)}>{method}</Tag>
                  <span className={styles.optionName}>{item.interfaceName || item.chainId}</span>
                </div>
                <div className={styles.optionPath}>{item.interfacePath}</div>
                {item.description && (
                  <div className={styles.optionDesc}>{item.description}</div>
                )}
              </div>
            </Select.Option>
          );
        })}
      </Select>
    </div>
  );
};

export default InterfaceSelector;
