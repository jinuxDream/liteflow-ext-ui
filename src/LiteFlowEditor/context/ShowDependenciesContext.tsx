import React, { createContext, useContext, useState, ReactNode } from 'react';

interface IShowDependenciesContext {
  showDependencies: boolean;
  toggleShowDependencies: () => void;
}

const defaultValue: IShowDependenciesContext = {
  showDependencies: false,
  toggleShowDependencies: () => {},
};

export const ShowDependenciesContext = createContext<IShowDependenciesContext>(defaultValue);

export const ShowDependenciesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showDependencies, setShowDependencies] = useState(false);

  const toggleShowDependencies = () => {
    setShowDependencies(prev => !prev);
  };

  return (
    <ShowDependenciesContext.Provider value={{ showDependencies, toggleShowDependencies }}>
      {children}
    </ShowDependenciesContext.Provider>
  );
};

export const useShowDependencies = () => {
  return useContext(ShowDependenciesContext);
};
