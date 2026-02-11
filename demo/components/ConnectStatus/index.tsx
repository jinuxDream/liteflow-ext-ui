import React, { useState, useCallback, useEffect } from 'react';
import { Tag } from 'antd'
import './index.less'

const API_BASE_PATH = (window as any).LITEFLOW_CONFIG?.API_BASE_PATH || '/api';

enum Status {
  connected = 'success',
  disconnected = 'error',
  pending = 'processing'
}

const ConnectStatus: React.FC = () => {
  const [status, setStatus] = useState<Status>(Status.pending);

  const syncServer = useCallback(() => {
    return fetch(`${API_BASE_PATH}/getChainList`, { method: 'GET' })
    .then((res) => res.json())
    .then((data) => {
      if (data && data.length) {
        setStatus(Status.connected);
      } else {
        setStatus(Status.disconnected);
      }
    }).catch(() => {
      setStatus(Status.disconnected);
    })
  }, [setStatus]);

  useEffect(() => {
    syncServer();
  }, []);

  let tagText = '服务器连接失败';
  if (status === Status.connected) {
    tagText = '服务器连接成功';
  }
  if (status === Status.pending) {
    tagText = '服务器连接中';
  }
  return (
    <span className='connect-status-container'>
      <Tag color={status}>{tagText}</Tag>
    </span>
  )
};

export default ConnectStatus;
