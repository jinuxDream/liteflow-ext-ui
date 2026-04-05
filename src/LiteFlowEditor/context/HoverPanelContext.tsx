import React, { createContext, useContext, useState, useCallback } from 'react';

// 全局状态（用于 X6 React shape 访问）
let globalHoverPanelEnabled = false;

export const getGlobalHoverPanelEnabled = () => globalHoverPanelEnabled;
export const setGlobalHoverPanelEnabled = (enabled: boolean) => {
  globalHoverPanelEnabled = enabled;
};

interface HoverPanelContextType {
  hoverPanelEnabled: boolean;
  setHoverPanelEnabled: (enabled: boolean) => void;
}

const HoverPanelContext = createContext<HoverPanelContextType>({
  hoverPanelEnabled: false,
  setHoverPanelEnabled: () => {},
});

export const HoverPanelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hoverPanelEnabled, setHoverPanelEnabledState] = useState(false);

  const handleSetEnabled = useCallback((enabled: boolean) => {
    setHoverPanelEnabledState(enabled);
    globalHoverPanelEnabled = enabled;
  }, []);

  return (
    <HoverPanelContext.Provider value={{ hoverPanelEnabled, setHoverPanelEnabled: handleSetEnabled }}>
      {children}
    </HoverPanelContext.Provider>
  );
};

export const useHoverPanel = () => useContext(HoverPanelContext);

export default HoverPanelContext;
