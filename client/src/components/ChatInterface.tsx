import React, { useState } from 'react';
import { useAgentChat } from '../hooks/useAgentChat.js';
import { useLookerHost } from '../looker/StandaloneProvider.js';
import { MessageList } from './MessageList.js';
import { InputBar } from './InputBar.js';
import { SettingsDrawer } from './SettingsDrawer.js';
import { ConversationSidebar } from './ConversationSidebar.js';
import { Sliders, Menu, Plus, RotateCcw } from 'lucide-react';
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
    clearChat,
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
      data-testid="chat-container"
      data-drag-over={isDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
          {/* Chat Content Window Toolbar */}
          <div className={styles.chatToolbar} data-testid="chat-toolbar">
            <div className={styles.toolbarLeft}>
              {!isSidebarOpen && (
                <button
                  type="button"
                  className={`${styles.hamburgerBtn} btn`}
                  onClick={() => setIsSidebarOpen(true)}
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <Menu size={20} strokeWidth={2} />
                </button>
              )}
            </div>

            <div className={styles.toolbarRight}>
              <button
                type="button"
                className={`${styles.toolbarBtn} ${styles.toolbarBtnPrimary} btn`}
                onClick={startNewChat}
                title="Start new chat"
              >
                <Plus size={14} />
                <span>New Chat</span>
              </button>

              <button
                type="button"
                className={`${styles.toolbarBtn} btn`}
                onClick={clearChat}
                disabled={messages.length === 0 || isLoading}
                title="Clear chat messages"
              >
                <RotateCcw size={14} />
                <span>Clear</span>
              </button>

              <button
                type="button"
                className={`${styles.toolbarBtn} btn`}
                onClick={() => setIsSettingsOpen(true)}
                title="Configure agent model and skills"
              >
                <Sliders size={14} />
                <span>Settings</span>
              </button>
            </div>
          </div>

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
