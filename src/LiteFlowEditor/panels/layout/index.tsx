import React, { useState } from 'react';
import { Graph } from '@antv/x6';
import { SplitBox } from '@antv/x6-react-components';
import { FullscreenOutlined, FullscreenExitOutlined, MenuFoldOutlined, MenuUnfoldOutlined, RightOutlined } from '@ant-design/icons';
import { useGraphWrapper } from '../../hooks';
import { usePanel } from '../../context/PanelContext';
import '@antv/x6-react-components/es/split-box/style/index.css';
import styles from './index.module.less';

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
  const { isPanelVisible, showPanel, togglePanel } = usePanel();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(0);

  const handleResize = () => {
    if (flowGraph && wrapperRef && wrapperRef.current) {
      const width = wrapperRef.current.clientWidth;
      const height = wrapperRef.current.clientHeight;
      flowGraph.resize(width, height);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  React.useEffect(() => {
    const calculatePanelWidth = () => {
      const screenWidth = window.innerWidth;
      setPanelWidth(Math.floor(screenWidth * 0.25));
    };
    
    calculatePanelWidth();
    window.addEventListener('resize', calculatePanelWidth);
    
    return () => {
      window.removeEventListener('resize', calculatePanelWidth);
    };
  }, []);

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
          <SplitBox
            split={'vertical'}
            minSize={50}
            maxSize={isFullscreen ? 10000 : Math.floor(window.innerWidth * 0.7)}
            defaultSize={isFullscreen ? (isPanelVisible ? 10000 : 0) : (isPanelVisible ? panelWidth : 0)}
            primary="second"
            onResizing={handleResize}
          >
            {props.children}
            {isPanelVisible ? (
              <div className={`${styles.liteflowEditorSettingBar} ${isFullscreen ? styles.fullscreen : ''}`}>
                <div className={styles.fullscreenToggle} onClick={toggleFullscreen} title={isFullscreen ? "退出全屏" : "全屏"}>
                  {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                </div>
                {settingBar}
              </div>
            ) : (
              isFullscreen && (
                <div className={styles.panelShowButton} onClick={togglePanel} title="显示面板">
                  <MenuUnfoldOutlined />
                </div>
              )
            )}
          </SplitBox>
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
      <SplitBox
        split={'vertical'}
        minSize={50}
        maxSize={500}
        defaultSize={260}
        primary="first"
        onResizing={handleResize}
      >
        <div className={styles.liteflowEditorSideBar}>{sideBar}</div>
        <SplitBox
          split={'vertical'}
          minSize={50}
          maxSize={isFullscreen ? 10000 : Math.floor(window.innerWidth * 0.7)}
          defaultSize={isFullscreen ? 10000 : (isPanelVisible ? panelWidth : 30)}
          primary="second"
          onResizing={handleResize}
        >
          {props.children}
          {isPanelVisible ? (
            <div className={`${styles.liteflowEditorSettingBar} ${isFullscreen ? styles.fullscreen : ''}`}>
              <div className={styles.fullscreenToggle} onClick={toggleFullscreen} title={isFullscreen ? "退出全屏" : "全屏"}>
                {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              </div>
              {settingBar}
            </div>
          ) : (
            <div className={styles.panelShowButton} onClick={togglePanel} title="显示面板">
              <RightOutlined />
            </div>
          )}
        </SplitBox>
      </SplitBox>
    </div>
  );
};

export default Layout;
