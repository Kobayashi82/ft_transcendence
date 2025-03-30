import React from "react";
import {
  GlobalUIContext,
  createGlobalUIState,
} from "../hooks/useGlobalUIState";

interface GlobalUIProviderProps {
  children: React.ReactNode;
}

// Provider component with JSX - this must be in a .tsx file
export const GlobalUIProvider: React.FC<GlobalUIProviderProps> = ({
  children,
}) => {
  const state = createGlobalUIState();

  return (
    <GlobalUIContext.Provider value={state}>
      {children}
    </GlobalUIContext.Provider>
  );
};
