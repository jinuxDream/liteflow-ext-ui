import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface NodeParameter {
  fieldName: string;
  fieldType: string;
  description: string;
  required: boolean;
}

export interface InterfaceInfo {
  chainId: string;
  interfaceName: string;
  interfacePath: string;
  description: string;
  inputs: NodeParameter[];
  outputs: NodeParameter[];
}

interface IInterfaceContext {
  currentInterface: InterfaceInfo | null;
  setCurrentInterface: (info: InterfaceInfo | null) => void;
}

const STORAGE_KEY = 'liteflow_current_interface';

const InterfaceContext = createContext<IInterfaceContext | undefined>(undefined);

// 从 localStorage 恢复选中的接口
const getStoredInterface = (): InterfaceInfo | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const InterfaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentInterface, setCurrentInterfaceState] = useState<InterfaceInfo | null>(() => getStoredInterface());

  // 持久化到 localStorage
  const setCurrentInterface = (info: InterfaceInfo | null) => {
    setCurrentInterfaceState(info);
    if (info) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <InterfaceContext.Provider value={{ currentInterface, setCurrentInterface }}>
      {children}
    </InterfaceContext.Provider>
  );
};

export const useInterface = () => {
  const context = useContext(InterfaceContext);
  if (!context) {
    throw new Error('useInterface must be used within InterfaceProvider');
  }
  return context;
};

export default InterfaceContext;
