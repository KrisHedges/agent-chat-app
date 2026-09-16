import React from 'react';
import { StandaloneProvider } from './looker/StandaloneProvider.js';
import { LookerBridge } from './looker/LookerBridge.js';
import { ChatInterface } from './components/ChatInterface.js';

/**
 * Environment detection:
 * Inside Looker, extensions run in an iframe where window.self !== window.top.
 * When running standalone locally in browser, window.self === window.top.
 */
export const App: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded }) => {
  const isStandalone =
    isEmbedded !== undefined
      ? !isEmbedded
      : typeof window !== 'undefined' && window.self === window.top;

  if (isStandalone) {
    return (
      <StandaloneProvider>
        <ChatInterface />
      </StandaloneProvider>
    );
  }

  return (
    <LookerBridge>
      <ChatInterface />
    </LookerBridge>
  );
};
