import React from 'react';
import { ConversationSummary } from '../types/index.js';
import { useLookerHost } from '../looker/StandaloneProvider.js';
import { MessageSquare, Trash2, Menu, UserCheck, Shield } from 'lucide-react';
import styles from './ConversationSidebar.module.css';

interface ConversationSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat?: () => void;
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

  return (
    <aside
      data-testid="sidebar-container"
      data-open={isOpen}
      aria-hidden={!isOpen}
      className={`${styles.sidebarContainer} ${isOpen ? styles.sidebarOpen : styles.sidebarClosed} sidebar-container`}
    >
      <div className={`${styles.sidebarInner} sidebar-inner`}>
        {/* Sidebar Header: Title and Collapse Button */}
        <div className={`${styles.sidebarHeader} sidebar-header`}>
          <span className={styles.sidebarTitle}>Chats</span>
          {isOpen && (
            <button
              type="button"
              className={`${styles.sidebarToggleBtn} btn`}
              onClick={onToggle}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <Menu size={20} strokeWidth={2} />
            </button>
          )}
        </div>

      {/* Conversation Thread List */}
      <div className={`${styles.sidebarScrollArea} sidebar-scroll-area`}>
        {conversations.length === 0 ? (
          <div className={`${styles.sidebarEmpty} sidebar-empty`}>
            <MessageSquare size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p>No saved conversations yet.</p>
            <span>Messages are encrypted at rest.</span>
          </div>
        ) : (
          Object.entries(grouped).map(([groupTitle, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={groupTitle} className="sidebar-group">
                <div className={`${styles.sidebarGroupTitle} sidebar-group-title`}>{groupTitle}</div>
                <div className={`${styles.sidebarGroupItems} sidebar-group-items`}>
                  {items.map((conv) => {
                    const isActive = conv.id === activeId;
                    return (
                      <div
                        key={conv.id}
                        data-testid="conversation-item"
                        data-active={isActive}
                        className={`${styles.sidebarItem} ${isActive ? `${styles.sidebarItemActive} active` : ''} sidebar-item`}
                        onClick={() => onSelect(conv.id)}
                      >
                        <MessageSquare size={14} className={`${styles.sidebarItemIcon} sidebar-item-icon`} />
                        <div className={`${styles.sidebarItemContent} sidebar-item-content`}>
                          <span className={`${styles.sidebarItemTitle} sidebar-item-title`}>{conv.title}</span>
                          {conv.lastMessagePreview && (
                            <span className={`${styles.sidebarItemPreview} sidebar-item-preview`}>{conv.lastMessagePreview}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className={`${styles.sidebarItemDelete} sidebar-item-delete`}
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
      <div className={`${styles.sidebarFooter} sidebar-footer`}>
        <div className={`${styles.userProfileRow} user-profile-row`}>
          <div
            data-testid="user-avatar"
            data-avatar-color={user.avatarColor || '#388bfd'}
            className={`${styles.userAvatar} user-avatar`}
            style={{ backgroundColor: user.avatarColor || '#388bfd' }}
          >
            {user.avatarInitials}
          </div>
          <div className={`${styles.userInfo} user-info`}>
            <div className={`${styles.userNameLine} user-name-line`}>
              <span className={`${styles.userDisplayName} user-display-name`}>{user.name}</span>
              <span className={`${styles.userRoleBadge} user-role-badge`}>{user.role}</span>
            </div>
            <span className={`${styles.userEmail} user-email`}>{user.email}</span>
          </div>
        </div>

        {/* In Standalone Mode: Show Substitute User Switcher */}
        {!isLooker && availableUsers.length > 1 && (
          <div className={`${styles.substituteUserSelectBox} substitute-user-select-box`}>
            <div className={`${styles.substituteLabel} substitute-label`}>
              <UserCheck size={12} />
              <span>Dev Substitute User:</span>
            </div>
            <select
              className={`${styles.userSelectDropdown} form-select user-select-dropdown`}
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
          <div className={`${styles.lookerBadgeFooter} looker-badge-footer`}>
            <Shield size={12} />
            <span>Looker Authenticated Session</span>
          </div>
        )}
      </div>
    </div>
  </aside>
);
};
