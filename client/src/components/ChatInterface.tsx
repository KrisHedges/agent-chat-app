import React, { useState } from 'react';
import { useAgentChat } from '../hooks/useAgentChat.js';
import { useLookerHost } from '../looker/StandaloneProvider.js';
import { MessageList } from './MessageList.js';
import { InputBar } from './InputBar.js';
import { SettingsDrawer } from './SettingsDrawer.js';
import { ConversationSidebar } from './ConversationSidebar.js';
import { Bot, Sliders, ShieldCheck, Box, PanelLeftClose, PanelLeft, Plus } from 'lucide-react';
import { AttachmentCategory } from '../types/index.js';
import styles from './ChatInterface.module.css';

export const ChatInterface: React.FC = () => {
  const lookerHost = useLookerHost();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const {
    messages,
    attachments,
    isLoading,
    statusMessage,
    settings,
    setSettings,
    conversations,
    currentConversationId,
    isLoadingHistory,
    addAttachment,
    removeAttachment,
    sendMessage,
    retryLastMessage,
    startNewChat,
    loadConversation,
    deleteConversation,
  } = useAgentChat(lookerHost.user.id);

  // Drag and drop handler for the whole chat viewport
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const mime = file.type.toLowerCase();

      let category: AttachmentCategory = 'text';
      if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
        category = 'image';
      } else if (mime === 'application/json' || ext === 'json') {
        category = 'json';
      } else if (mime === 'text/csv' || ext === 'csv') {
        category = 'csv';
      }

      const reader = new FileReader();
      if (category === 'image') {
        reader.onload = () => {
          const result = reader.result as string;
          addAttachment({
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'image/png',
            category: 'image',
            base64Data: result.split(',')[1] || '',
            previewUrl: result,
          });
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          const text = reader.result as string;
          addAttachment({
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: file.size,
            mimeType: file.type || (category === 'json' ? 'application/json' : 'text/plain'),
            category,
            base64Data: btoa(unescape(encodeURIComponent(text))),
          });
        };
        reader.readAsText(file);
      }
    }
  };

  return (
    <div
      className={`${styles.appContainer} app-container`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        outline: isDragOver ? '2px dashed var(--accent-blue)' : 'none',
        outlineOffset: '-2px',
      }}
    >
      {/* Top Header */}
      <header className={`${styles.appHeader} app-header`}>
        <div className={styles.headerBrand}>
          <button
            className={`btn btn-ghost ${styles.headerGhostBtn}`}
            style={{ padding: '7px' }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>

          <div className={styles.headerLogo}>
            <Bot size={20} />
          </div>

          <div className={styles.headerTitleGroup}>
            <h1>Gemini Agent Assistant</h1>
            <span>
              {lookerHost.isLooker ? (
                <span style={{ color: 'var(--accent-green)' }}>
                  <ShieldCheck size={11} style={{ display: 'inline', marginRight: '4px' }} />
                  Looker Extension Mode ({lookerHost.user.name})
                </span>
              ) : (
                <span style={{ color: 'var(--accent-amber)' }}>
                  <Box size={11} style={{ display: 'inline', marginRight: '4px' }} />
                  Standalone Dev ({lookerHost.user.name})
                </span>
              )}
            </span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={`btn btn-ghost ${styles.headerGhostBtn}`} onClick={startNewChat} title="Start new chat">
            <Plus size={14} />
            <span>New Chat</span>
          </button>

          <button
            className={`btn btn-ghost ${styles.headerGhostBtn}`}
            onClick={() => setIsSettingsOpen(true)}
            title="Configure agent model and skills"
          >
            <Sliders size={14} />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar + Chat Layout */}
      <div className={`${styles.appBodyLayout} app-body-layout`}>
        <ConversationSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          conversations={conversations}
          activeId={currentConversationId}
          onSelect={loadConversation}
          onNewChat={startNewChat}
          onDelete={deleteConversation}
          isLoading={isLoadingHistory}
        />

        <main className={`${styles.chatLayout} chat-layout`}>
          <MessageList
            messages={messages}
            onPromptClick={(prompt) => sendMessage(prompt)}
            onRetry={retryLastMessage}
            isLoading={isLoading}
          />

          <InputBar
            attachments={attachments}
            onAddAttachments={(newAtts) => newAtts.forEach(addAttachment)}
            onRemoveAttachment={removeAttachment}
            onSend={(text) => sendMessage(text)}
            isLoading={isLoading}
            statusMessage={statusMessage}
          />
        </main>
      </div>

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />
    </div>
  );
};
