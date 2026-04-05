import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button, Badge, Tooltip, Spin, Empty, Tag, Descriptions, message, Modal, Input, Select } from 'antd';
import {
  FileTextOutlined,
  ReloadOutlined,
  ClearOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RightOutlined,
  DownOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  CloseOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { Graph } from '@antv/x6';
import styles from './executionTrace.module.less';

interface FieldChange {
  field: string;
  from: string;
  to: string;
}

interface NodeRecord {
  id: string;
  name: string;
  success: boolean;
  skipped: boolean;
  costMs: number;
  changes?: FieldChange[];
}

interface TraceRecord {
  chainId: string;
  bizId: string;
  success: boolean;
  costMs: number;
  startTime: number;
  endTime: number;
  nodes: NodeRecord[];
}

interface TraceRecordsResponse {
  success: boolean;
  total: number;
  records: TraceRecord[];
}

const TRACE_API_BASE = 'http://localhost:10005';

interface IProps {
  flowGraph?: Graph;
}

const ExecutionTraceWidget: React.FC<IProps> = () => {
  const [visible, setVisible] = useState(false);
  const [records, setRecords] = useState<TraceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TraceRecord | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchChainId, setSearchChainId] = useState<string>('');

  // 筛选后的记录
  const filteredRecords = useMemo(() => {
    if (!searchChainId) return records;
    return records.filter(r => r.chainId.includes(searchChainId));
  }, [records, searchChainId]);

  // 获取所有唯一的 chainId
  const uniqueChainIds = useMemo(() => {
    const chainIds = new Set(records.map(r => r.chainId));
    return Array.from(chainIds);
  }, [records]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${TRACE_API_BASE}/trace/records`);
      const data: TraceRecordsResponse = await response.json();
      if (data.success) {
        setRecords(data.records);
        if (data.records.length > 0 && !selectedRecord) {
          setSelectedRecord(data.records[0]);
        }
      }
    } catch (error) {
      console.error('加载追踪记录失败:', error);
      message.error('加载追踪记录失败');
    } finally {
      setLoading(false);
    }
  }, [selectedRecord]);

  const clearRecords = async () => {
    try {
      const response = await fetch(`${TRACE_API_BASE}/trace/records`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setRecords([]);
        setSelectedRecord(null);
        message.success('追踪记录已清空');
      }
    } catch (error) {
      console.error('清空追踪记录失败:', error);
      message.error('清空追踪记录失败');
    }
  };

  const toggleModal = () => {
    setVisible(prev => !prev);
  };

  useEffect(() => {
    if (visible) {
      loadRecords();
    }
  }, [visible, loadRecords]);

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const parseFieldPath = (field: string) => {
    const parts = field.split('.');
    if (parts.length >= 2) {
      return { context: parts[0], fieldPath: parts.slice(1).join('.') };
    }
    return { context: '', fieldPath: field };
  };

  const renderFieldChange = (change: FieldChange, index: number) => {
    const { context, fieldPath } = parseFieldPath(change.field);
    const isNew = change.from === 'null';
    const isDeleted = change.to === 'null';

    let changeType = '变更';
    let changeColor = '#1890ff';
    if (isNew) {
      changeType = '新增';
      changeColor = '#52c41a';
    } else if (isDeleted) {
      changeType = '删除';
      changeColor = '#ff4d4f';
    }

    return (
      <div key={index} className={styles.fieldChangeItem}>
        <Tag color={changeColor} className={styles.changeTypeTag}>{changeType}</Tag>
        {context && <Tag color="purple" className={styles.contextTag}>{context}</Tag>}
        <span className={styles.fieldName}>{fieldPath}</span>
        {!isNew && !isDeleted && (
          <div className={styles.changeDetail}>
            <span className={styles.oldValue}>{change.from}</span>
            <RightOutlined className={styles.arrowIcon} />
            <span className={styles.newValue}>{change.to}</span>
          </div>
        )}
        {isNew && <span className={styles.newValue}> = {change.to}</span>}
        {isDeleted && <span className={styles.oldValue}> = {change.from}</span>}
      </div>
    );
  };

  const renderNodeRecord = (node: NodeRecord) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChanges = node.changes && node.changes.length > 0;

    return (
      <div key={node.id} className={styles.nodeRecord}>
        <div className={styles.nodeHeader} onClick={() => hasChanges && toggleNodeExpand(node.id)}>
          <div className={styles.nodeStatus}>
            {node.success ? (
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            ) : (
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            )}
            {node.skipped && <Tag color="default">跳过</Tag>}
          </div>
          <span className={styles.nodeId}>{node.id}</span>
          <Tag color="blue">{node.costMs}ms</Tag>
          {hasChanges && (
            <>
              <Badge count={node.changes!.length} size="small" />
              {isExpanded ? <DownOutlined /> : <RightOutlined />}
            </>
          )}
        </div>
        {isExpanded && hasChanges && (
          <div className={styles.nodeChanges}>
            {node.changes!.map((change, index) => renderFieldChange(change, index))}
          </div>
        )}
      </div>
    );
  };

  const renderRecordDetail = () => {
    if (!selectedRecord) {
      return <Empty description="请选择一条追踪记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    return (
      <div className={styles.recordDetail}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="流程ID">{selectedRecord.chainId}</Descriptions.Item>
          <Descriptions.Item label="业务ID">{selectedRecord.bizId}</Descriptions.Item>
          <Descriptions.Item label="状态">
            {selectedRecord.success ? <Tag color="success">成功</Tag> : <Tag color="error">失败</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="耗时">{selectedRecord.costMs}ms</Descriptions.Item>
          <Descriptions.Item label="开始时间">{formatTime(selectedRecord.startTime)}</Descriptions.Item>
          <Descriptions.Item label="结束时间">{formatTime(selectedRecord.endTime)}</Descriptions.Item>
        </Descriptions>

        <div className={styles.nodesSection}>
          <div className={styles.sectionTitle}>节点执行记录 ({selectedRecord.nodes.length})</div>
          <div className={styles.nodesList}>
            {selectedRecord.nodes.map(node => renderNodeRecord(node))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Tooltip title="执行追踪" placement="bottom">
        <Badge count={records.length} size="small" offset={[-5, 5]}>
          <Button
            type={visible ? 'primary' : 'default'}
            icon={<FileTextOutlined />}
            onClick={toggleModal}
            size="small"
          >
            追踪
          </Button>
        </Badge>
      </Tooltip>

      <Modal
        title={
          <div className={styles.modalTitle}>
            <span>执行追踪</span>
            <div className={styles.modalActions}>
              <Button size="small" icon={<ReloadOutlined />} onClick={loadRecords} loading={loading}>
                刷新
              </Button>
              <Button size="small" icon={<ClearOutlined />} onClick={clearRecords} danger>
                清空
              </Button>
            </div>
          </div>
        }
        open={visible}
        onCancel={toggleModal}
        footer={null}
        width="100%"
        style={{ top: 48, paddingBottom: 0, maxWidth: '100vw' }}
        styles={{ body: { height: 'calc(100vh - 110px)', padding: 0, overflow: 'hidden' } }}
        closeIcon={<CloseOutlined />}
        destroyOnClose
      >
        {loading ? (
          <div className={styles.loading}>
            <Spin />
          </div>
        ) : records.length === 0 ? (
          <Empty description="暂无追踪记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className={styles.modalContent}>
            <div className={styles.leftPanel}>
              <div className={styles.searchBox}>
                <Select
                  allowClear
                  showSearch
                  placeholder="按接口筛选"
                  value={searchChainId || undefined}
                  onChange={setSearchChainId}
                  style={{ width: '100%' }}
                  suffixIcon={<SearchOutlined />}
                  options={uniqueChainIds.map(id => ({ label: id, value: id }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </div>
              <div className={styles.recordListHeader}>
                <span>共 {filteredRecords.length} 条记录</span>
              </div>
              <div className={styles.recordList}>
                {filteredRecords.length === 0 ? (
                  <Empty description="无匹配记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  filteredRecords.map((record) => (
                    <div
                      key={record.bizId}
                      className={`${styles.recordItem} ${selectedRecord?.bizId === record.bizId ? styles.selected : ''}`}
                      onClick={() => setSelectedRecord(record)}
                    >
                      <div className={styles.recordHeader}>
                        <span className={styles.chainId}>{record.chainId}</span>
                        {record.success ? (
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        ) : (
                          <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                        )}
                      </div>
                      <div className={styles.recordMeta}>
                        <span><ClockCircleOutlined /> {record.costMs}ms</span>
                        <span><FieldTimeOutlined /> {formatTime(record.startTime)}</span>
                      </div>
                      <div className={styles.recordNodes}>{record.nodes.length} 节点</div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className={styles.rightPanel}>{renderRecordDetail()}</div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default ExecutionTraceWidget;