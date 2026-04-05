import React, { useState, useCallback, useEffect } from 'react';
import { Graph } from '@antv/x6';
import { FullscreenOutlined, FullscreenExitOutlined, MenuFoldOutlined, MenuUnfoldOutlined, RightOutlined } from '@ant-design/icons';
import { useGraphWrapper } from '../../hooks';
import { usePanel } from '../../context/PanelContext';
import styles from './index.module.less';

// 全局状态，用于跨组件传递 Tab 切换
let globalSettingBarTab = 'properties';
const settingBarTabListeners: Set<(tab: string) => void> = new Set();

export const getSettingBarTab = () => globalSettingBarTab;
export const setSettingBarTab = (tab: string) => {
  globalSettingBarTab = tab;
  settingBarTabListeners.forEach(fn => fn(tab));
};
export const subscribeSettingBarTab = (fn: (tab: string) => void) => {
  settingBarTabListeners.add(fn);
  return () => settingBarTabListeners.delete(fn);
};

interface ISubComponentProps {
  flowGraph: Graph;
  widgets?: React.FC<any>[];
}

interface IProps {
  flowGraph?: Graph;
  SideBar: React.FC<ISubComponentProps> | null;
  ToolBar: React.FC<ISubComponentProps>;
  SettingBar: React.FC<ISubComponentProps>;
  widgets?: React.FC[];
  children: React.ReactNode;
}

const Layout: React.FC<IProps> = (props) => {
  const { flowGraph, SideBar, ToolBar, SettingBar, widgets } = props;

  const wrapperRef = useGraphWrapper();
  const { isPanelVisible, showPanel, hidePanel, togglePanel } = usePanel();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  useEffect(() => {
    // 监听打开数据血缘事件
    const handleOpenDataLineage = () => {
      setIsFullscreen(true);
      showPanel();
      setSettingBarTab('lineage');
    };

    // 监听关闭数据血缘事件
    const handleCloseDataLineage = () => {
      setIsFullscreen(false);
      hidePanel();
    };

    window.addEventListener('openDataLineage', handleOpenDataLineage);
    window.addEventListener('closeDataLineage', handleCloseDataLineage);

    return () => {
      window.removeEventListener('openDataLineage', handleOpenDataLineage);
      window.removeEventListener('closeDataLineage', handleCloseDataLineage);
    };
  }, [showPanel, hidePanel]);

  // 窗口大小变化时调整画布
  useEffect(() => {
    const handleResize = () => {
      if (flowGraph && wrapperRef && wrapperRef.current) {
        flowGraph.resize(wrapperRef.current.clientWidth, wrapperRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [flowGraph]);

  let sideBar, toolBar, settingBar;
  if (flowGraph) {
    sideBar = SideBar ? <SideBar flowGraph={flowGraph} /> : null;
    toolBar = <ToolBar flowGraph={flowGraph} widgets={widgets} />;
    settingBar = <SettingBar flowGraph={flowGraph} />;
  }

  if (!SideBar) {
    return (
        <div className={styles.liteflowEditorLayoutContainer}>
          <div className={styles.liteflowEditorToolBar}>
            {toolBar}
            <div className={styles.panelControlsInToolbar}>
              <div className={styles.panelControlInToolbar} onClick={togglePanel} title={isPanelVisible ? "隐藏面板" : "显示面板"}>
                {isPanelVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
              </div>
            </div>
          </div>
          <div className={styles.mainContent}>
            <div className={styles.canvasArea} ref={wrapperRef}>
              {props.children}
            </div>
            {(isPanelVisible || isFullscreen) && (
              <div className={`${styles.panelArea} ${isFullscreen ? styles.panelFullscreen : ''}`}>
                <div className={styles.fullscreenToggle} onClick={toggleFullscreen} title={isFullscreen ? "退出全屏" : "全屏"}>
                  {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                </div>
                {settingBar}
              </div>
            )}
          </div>
        </div>
      );
  }

  return (
    <div className={styles.liteflowEditorLayoutContainer}>
      <div className={styles.liteflowEditorToolBar}>
        {toolBar}
        <div className={styles.panelControlsInToolbar}>
          <div className={styles.panelControlInToolbar} onClick={togglePanel} title={isPanelVisible ? "隐藏面板" : "显示面板"}>
            {isPanelVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
          </div>
        </div>
      </div>
      <div className={styles.mainContent}>
        <div className={styles.sideBarArea}>{sideBar}</div>
        <div className={styles.canvasArea} ref={wrapperRef}>
          {props.children}
        </div>
        {(isPanelVisible || isFullscreen) && (
          <div className={`${styles.panelArea} ${isFullscreen ? styles.panelFullscreen : ''}`}>
            <div className={styles.fullscreenToggle} onClick={toggleFullscreen} title={isFullscreen ? "退出全屏" : "全屏"}>
              {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            </div>
            {settingBar}
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;
