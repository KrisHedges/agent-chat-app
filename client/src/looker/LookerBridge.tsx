import React from 'react';
import { LookerHostContext, LookerHostContextType } from './StandaloneProvider.js';
import { AgentUser } from './user-model.js';

export const LookerBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const lookerUser: AgentUser = {
    id: 'looker_active_user',
    name: 'Looker Active User',
    email: 'user@looker.internal',
    role: 'Analyst',
    avatarInitials: 'LU',
    avatarColor: '#4285f4',
  };

  const lookerValue: LookerHostContextType = {
    isLooker: true,
    hostUrl: typeof window !== 'undefined' ? window.location.origin : '',
    user: lookerUser,
    availableUsers: [lookerUser],
    switchUser: () => {},
    contextData: {},
    saveContextData: async () => {},
  };

  return <LookerHostContext.Provider value={lookerValue}>{children}</LookerHostContext.Provider>;
};
