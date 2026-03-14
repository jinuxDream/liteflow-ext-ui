import React, { createContext, useContext, useState, ReactNode } from 'react';

interface IShowStepsContext {
  showSteps: boolean;
  toggleShowSteps: () => void;
}

const defaultValue: IShowStepsContext = {
  showSteps: false,
  toggleShowSteps: () => {},
};

export const ShowStepsContext = createContext<IShowStepsContext>(defaultValue);

export const ShowStepsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showSteps, setShowSteps] = useState(false);

  const toggleShowSteps = () => {
    setShowSteps(prev => !prev);
  };

  return (
    <ShowStepsContext.Provider value={{ showSteps, toggleShowSteps }}>
      {children}
    </ShowStepsContext.Provider>
  );
};

export const useShowSteps = () => {
  return useContext(ShowStepsContext);
};
