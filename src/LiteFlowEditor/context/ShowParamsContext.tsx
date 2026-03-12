import React, { createContext, useContext, useState, ReactNode } from 'react';

interface IShowParamsContext {
  showParams: boolean;
  toggleShowParams: () => void;
}

const defaultValue: IShowParamsContext = {
  showParams: false,
  toggleShowParams: () => {},
};

export const ShowParamsContext = createContext<IShowParamsContext>(defaultValue);

export const ShowParamsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showParams, setShowParams] = useState(false);

  const toggleShowParams = () => {
    setShowParams(prev => !prev);
  };

  return (
    <ShowParamsContext.Provider value={{ showParams, toggleShowParams }}>
      {children}
    </ShowParamsContext.Provider>
  );
};

export const useShowParams = () => {
  return useContext(ShowParamsContext);
};
