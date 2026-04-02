import React, { createContext, useContext, useState, ReactNode } from 'react';

interface IPanelContext {
  isPanelVisible: boolean;
  showPanel: () => void;
  hidePanel: () => void;
  togglePanel: () => void;
}

const PanelContext = createContext<IPanelContext | undefined>(undefined);

export const PanelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  const showPanel = () => setIsPanelVisible(true);
  const hidePanel = () => setIsPanelVisible(false);
  const togglePanel = () => setIsPanelVisible(prev => !prev);

  return (
    <PanelContext.Provider value={{ isPanelVisible, showPanel, hidePanel, togglePanel }}>
      {children}
    </PanelContext.Provider>
  );
};

export const usePanel = () => {
  const context = useContext(PanelContext);
  if (!context) {
    throw new Error('usePanel must be used within PanelProvider');
  }
  return context;
};

export default PanelContext;
