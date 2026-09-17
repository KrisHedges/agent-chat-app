import React, { useState } from 'react';
import { ConversationSummary } from '../types/index.js';
import { useLookerHost } from '../looker/StandaloneProvider.js';
import { MessageSquare, Trash2, Menu, Shield } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal.js';
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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingConversation = conversations.find((c) => c.id === pendingDeleteId);

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
    <>
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
                            setPendingDeleteId(conv.id);
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

      {/* User Identity Footer */}
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


        {isLooker && (
          <div className={`${styles.lookerBadgeFooter} looker-badge-footer`}>
            <Shield size={12} />
            <span>Looker Authenticated Session</span>
          </div>
        )}
      </div>
    </div>
  </aside>

  {/* Delete Confirmation Modal Dialog */}
  <ConfirmModal
    isOpen={pendingDeleteId !== null}
    title="Delete Conversation"
    message={
      pendingConversation
        ? `Are you sure you want to delete "${pendingConversation.title}"? This conversation and its encrypted history cannot be recovered.`
        : 'Are you sure you want to delete this encrypted conversation? This action cannot be undone.'
    }
    confirmText="Delete"
    cancelText="Cancel"
    variant="danger"
    testId="delete-conversation-modal"
    onConfirm={() => {
      if (pendingDeleteId) {
        onDelete(pendingDeleteId);
        setPendingDeleteId(null);
      }
    }}
    onCancel={() => setPendingDeleteId(null)}
  />
</>
);
};
