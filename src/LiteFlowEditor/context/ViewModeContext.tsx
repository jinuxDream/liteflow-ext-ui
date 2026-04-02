import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ViewMode = '' | 'summary' | 'logic' | 'dataflow' | 'dependency';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

// 全局状态，用于 X6 React Shape 无法访问 Context 的情况
let globalViewMode: ViewMode = '';
let globalSetViewMode: ((mode: ViewMode) => void) | null = null;
let refreshCallbacks: (() => void)[] = [];

// 注册刷新回调
export const registerRefresh = (cb: () => void) => {
  refreshCallbacks.push(cb);
  return () => {
    refreshCallbacks = refreshCallbacks.filter(fn => fn !== cb);
  };
};

// 触发所有节点刷新
export const triggerRefresh = () => {
  refreshCallbacks.forEach(cb => cb());
};

export const setGlobalViewMode = (mode: ViewMode) => {
  globalViewMode = mode;
};

export const getGlobalViewMode = (): ViewMode => {
  return globalViewMode;
};

interface ViewModeProviderProps {
  children: ReactNode;
}

export const ViewModeProvider: React.FC<ViewModeProviderProps> = ({ children }) => {
  const [viewMode, setViewModeState] = useState<ViewMode>('');

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    globalViewMode = mode;
    // 触发所有节点刷新
    triggerRefresh();
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewModeState((prev) => {
      const modes: ViewMode[] = ['', 'summary', 'logic', 'dataflow', 'dependency'];
      const currentIndex = modes.indexOf(prev);
      const newMode = modes[(currentIndex + 1) % modes.length];
      globalViewMode = newMode;
      // 触发所有节点刷新
      triggerRefresh();
      return newMode;
    });
  }, []);

  // 初始化全局 setter
  if (!globalSetViewMode) {
    globalSetViewMode = setViewMode;
  }

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, toggleViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = (): ViewModeContextType => {
  const context = useContext(ViewModeContext);
  // 如果 Context 不可用（X6 React Shape 场景），返回全局状态
  if (!context) {
    return {
      viewMode: globalViewMode,
      setViewMode: (mode: ViewMode) => {
        globalViewMode = mode;
        triggerRefresh();
      },
      toggleViewMode: () => {
        const modes: ViewMode[] = ['', 'summary', 'logic', 'dataflow', 'dependency'];
        const currentIndex = modes.indexOf(globalViewMode);
        globalViewMode = modes[(currentIndex + 1) % modes.length];
        triggerRefresh();
      },
    };
  }
  return context;
};

export { ViewMode };
export default ViewModeContext;
