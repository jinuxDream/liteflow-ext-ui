import React, { useState, useEffect, useCallback, useContext } from 'react';
import {Select, Button, Tooltip, Modal} from 'antd';
import { DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { GraphContext } from '@liteflow-editor';
import AddChain from './AddChain';
import './index.less';

const API_BASE_PATH = (window as any).LITEFLOW_CONFIG?.API_BASE_PATH || '/api';

type Chain = {
  chainId: string;
  elJson: any;
}

interface IProps {
  showActions?: boolean;
}

const ChainManager: React.FC<IProps> = ({ showActions = true }) => {
  const [chains, setChains] = useState<Array<Chain>>([]);
  const [currentChain, setCurrentChain] = useState<Chain>();

  const { currentEditor } = useContext<any>(GraphContext)

  const loadChainById = (chainId: string) => {
    fetch(`${API_BASE_PATH}/getChainById?chainId=${chainId}`, { method: 'GET' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.elJson) {
          currentEditor.fromJSON(data.elJson)
        }
      })
  };

  const getChainList = useCallback(() => {
    return fetch(`${API_BASE_PATH}/getChainList`, { method: 'GET' })
            .then((res) => res.json())
            .then((data) => {
              if (data && data.length) {
                setChains(data);
                if (!currentChain && data.length > 0) {
                  const firstChain = data[0];
                  setCurrentChain(firstChain);
                  loadChainById(firstChain.chainId);
                }
              }
            })
  }, [setChains]);

  useEffect(() => {
    getChainList();
  }, []);

  const handleOnChange = (chainId: string) => {
    setCurrentChain(chains.find(chain => chain.chainId === chainId))
    loadChainById(chainId);
  };

  const handleSave = () => {
    fetch(`${API_BASE_PATH}/updateChain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({...currentChain, elJson: currentEditor.toJSON()})
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 'S') {
          Modal.success({ title: '操作成功', content: data.message })
        } else {
          Modal.error({ title: '操作失败', content: data.message })
        }
      })
  }

  const handleDelete = () => {
    Modal.confirm({
      title: '操作确认',
      content: '请确认是否删除当前记录？',
      onOk() {
        return fetch(`${API_BASE_PATH}/deleteChain`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({...currentChain})
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.code === 'S') {
              Modal.success({ title: '操作成功', content: data.message })
              setCurrentChain(undefined)
              setChains(chains.filter(chain => chain !== currentChain))
            } else {
              Modal.error({ title: '操作失败', content: data.message })
            }
          })
      }
    })
  }

  const handleAddChain = (newChain) => {
    if (!newChain) {
       currentEditor.fromJSON({});
      return
    }
    currentEditor.fromJSON(newChain.elJson);
    fetch(`${API_BASE_PATH}/createChain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({...newChain})
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 'S') {
          Modal.success({ title: '操作成功', content: data.message })
          setChains([...chains, newChain]);
          setCurrentChain(newChain);
        } else {
          Modal.error({ title: '操作失败', content: data.message })
        }
      })
  }

  return (
    <div className='chain-manager-wrapper'>
      <span>选择chain：</span>
      <Select
        showSearch
        value={currentChain?.chainId}
        placeholder="请选择接口数据"
        style={{width: 300}}
        options={chains.map(({chainId}: Chain) => ({
          label: chainId,
          value: chainId,
        }))}
        onChange={handleOnChange}
        filterOption={(input, option) =>
          option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
        }
      />
      {showActions && (
        <>
          <Tooltip title='保存当前修改' placement='bottom'>
            <Button type='primary' className='chain-manager-save-btn' onClick={handleSave} disabled={!chains.length || !currentChain?.chainId}>
              <SaveOutlined /> 保存
            </Button>
          </Tooltip>
          <Tooltip title='删除当前记录' placement='bottom'>
            <Button type='primary' danger className='chain-manager-delete-btn' onClick={handleDelete} disabled={!chains.length || !currentChain?.chainId}>
              <DeleteOutlined /> 删除
            </Button>
          </Tooltip>
          <AddChain onChange={handleAddChain} chains={chains} />
        </>
      )}
    </div>
  );
}

export default ChainManager;
