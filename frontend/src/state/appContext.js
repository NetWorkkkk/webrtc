import { createContext, useContext } from "react";

export const AppContext = createContext(null);

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppProvider");
  }
  return context;
}
