import React from 'react';
import { ConversationSummary } from '../types/index.js';
import { useLookerHost } from '../looker/StandaloneProvider.js';
import { Plus, MessageSquare, Trash2, ChevronLeft, UserCheck, Shield } from 'lucide-react';

interface ConversationSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  isOpen,
  onToggle,
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  isLoading,
}) => {
  const { user, availableUsers, switchUser, isLooker } = useLookerHost();

  // Helper to group conversations by relative date
  const groupConversations = () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const groups: { [key: string]: ConversationSummary[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    for (const conv of conversations) {
      const diff = now - conv.updatedAt;
      if (diff < oneDay) {
        groups['Today'].push(conv);
      } else if (diff < 2 * oneDay) {
        groups['Yesterday'].push(conv);
      } else if (diff < 7 * oneDay) {
        groups['Previous 7 Days'].push(conv);
      } else {
        groups['Older'].push(conv);
      }
    }

    return groups;
  };

  const grouped = groupConversations();

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="sidebar-container">
      {/* Sidebar Header: New Chat Button */}
      <div className="sidebar-header">
        <button className="btn btn-new-chat" onClick={onNewChat} title="Start new conversation">
          <Plus size={16} />
          <span>New Chat</span>
        </button>
        <button className="btn btn-ghost btn-icon" onClick={onToggle} title="Collapse sidebar">
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Conversation Thread List */}
      <div className="sidebar-scroll-area">
        {conversations.length === 0 ? (
          <div className="sidebar-empty">
            <MessageSquare size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p>No saved conversations yet.</p>
            <span>Messages are encrypted at rest.</span>
          </div>
        ) : (
          Object.entries(grouped).map(([groupTitle, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={groupTitle} className="sidebar-group">
                <div className="sidebar-group-title">{groupTitle}</div>
                <div className="sidebar-group-items">
                  {items.map((conv) => {
                    const isActive = conv.id === activeId;
                    return (
                      <div
                        key={conv.id}
                        className={`sidebar-item ${isActive ? 'active' : ''}`}
                        onClick={() => onSelect(conv.id)}
                      >
                        <MessageSquare size={14} className="sidebar-item-icon" />
                        <div className="sidebar-item-content">
                          <span className="sidebar-item-title">{conv.title}</span>
                          {conv.lastMessagePreview && (
                            <span className="sidebar-item-preview">{conv.lastMessagePreview}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="sidebar-item-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Delete this encrypted conversation?')) {
                              onDelete(conv.id);
                            }
                          }}
                          title="Delete conversation"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* User Identity & Substitute User Switcher Footer */}
      <div className="sidebar-footer">
        <div className="user-profile-row">
          <div className="user-avatar" style={{ backgroundColor: user.avatarColor || '#388bfd' }}>
            {user.avatarInitials}
          </div>
          <div className="user-info">
            <div className="user-name-line">
              <span className="user-display-name">{user.name}</span>
              <span className="user-role-badge">{user.role}</span>
            </div>
            <span className="user-email">{user.email}</span>
          </div>
        </div>

        {/* In Standalone Mode: Show Substitute User Switcher */}
        {!isLooker && availableUsers.length > 1 && (
          <div className="substitute-user-select-box">
            <div className="substitute-label">
              <UserCheck size={12} />
              <span>Dev Substitute User:</span>
            </div>
            <select
              className="form-select user-select-dropdown"
              value={user.id}
              onChange={(e) => {
                const target = availableUsers.find((u) => u.id === e.target.value);
                if (target) switchUser(target);
              }}
            >
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        )}

        {isLooker && (
          <div className="looker-badge-footer">
            <Shield size={12} />
            <span>Looker Authenticated Session</span>
          </div>
        )}
      </div>
    </aside>
  );
};
