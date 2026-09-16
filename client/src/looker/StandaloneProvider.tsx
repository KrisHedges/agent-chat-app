import React, { createContext, useContext, useState } from 'react';
import { AgentUser, PRESET_DEVS } from './user-model.js';

export interface LookerHostContextType {
  isLooker: boolean;
  hostUrl: string;
  user: AgentUser;
  availableUsers: AgentUser[];
  switchUser: (user: AgentUser) => void;
  contextData: Record<string, unknown>;
  saveContextData: (data: Record<string, unknown>) => Promise<void>;
}

const defaultDevContext: LookerHostContextType = {
  isLooker: false,
  hostUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080',
  user: PRESET_DEVS[0],
  availableUsers: PRESET_DEVS,
  switchUser: () => {},
  contextData: {
    dashboardId: 'mock-101',
    exploreName: 'mock_orders',
  },
  saveContextData: async () => {},
};

export const LookerHostContext = createContext<LookerHostContextType>(defaultDevContext);

export const useLookerHost = () => useContext(LookerHostContext);

const getStorage = () => (typeof window !== 'undefined' ? window.localStorage : null);

export const StandaloneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AgentUser>(() => {
    try {
      const stored = getStorage()?.getItem('gemini_agent_dev_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const match = PRESET_DEVS.find((u) => u.id === parsed.id);
        if (match) return match;
      }
    } catch {
      // Ignore
    }
    return PRESET_DEVS[0];
  });

  const switchUser = (user: AgentUser) => {
    setCurrentUser(user);
    try {
      getStorage()?.setItem('gemini_agent_dev_user', JSON.stringify(user));
    } catch {
      // Ignore
    }
  };

  const [contextData, setContextData] = useState<Record<string, unknown>>(() => {
    try {
      const stored = getStorage()?.getItem('gemini_agent_dev_context');
      return stored ? JSON.parse(stored) : defaultDevContext.contextData;
    } catch {
      return defaultDevContext.contextData;
    }
  });

  const saveContextData = async (data: Record<string, unknown>) => {
    try {
      getStorage()?.setItem('gemini_agent_dev_context', JSON.stringify(data));
      setContextData(data);
    } catch {
      setContextData(data);
    }
  };

  return (
    <LookerHostContext.Provider
      value={{
        ...defaultDevContext,
        user: currentUser,
        availableUsers: PRESET_DEVS,
        switchUser,
        contextData,
        saveContextData,
      }}
    >
      {children}
    </LookerHostContext.Provider>
  );
};
