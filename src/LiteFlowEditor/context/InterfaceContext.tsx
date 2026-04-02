import React, { createContext, useContext, useState, ReactNode } from 'react';

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

const InterfaceContext = createContext<IInterfaceContext | undefined>(undefined);

export const InterfaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentInterface, setCurrentInterface] = useState<InterfaceInfo | null>(null);

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
