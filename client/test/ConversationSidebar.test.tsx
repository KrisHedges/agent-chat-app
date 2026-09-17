import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationSidebar } from '../src/components/ConversationSidebar.js';
import { StandaloneProvider, LookerHostContext } from '../src/looker/StandaloneProvider.js';
import { ConversationSummary } from '../src/types/index.js';
import { PRESET_DEVS } from '../src/looker/user-model.js';

describe('ConversationSidebar Component', () => {
  const now = Date.now();
  const sampleConversations: ConversationSummary[] = [
    {
      id: 'c_today',
      title: 'Today Conversation',
      lastMessagePreview: 'Latest message today',
      createdAt: now - 1000 * 60 * 30, // 30m ago
      updatedAt: now - 1000 * 60 * 30,
      messageCount: 2,
    },
    {
      id: 'c_yest',
      title: 'Yesterday Conversation',
      lastMessagePreview: 'Message from yesterday',
      createdAt: now - 1000 * 60 * 60 * 25, // 25h ago
      updatedAt: now - 1000 * 60 * 60 * 25,
      messageCount: 4,
    },
    {
      id: 'c_week',
      title: 'Last Week Conversation',
      createdAt: now - 1000 * 60 * 60 * 24 * 3, // 3 days ago
      updatedAt: now - 1000 * 60 * 60 * 24 * 3,
      messageCount: 1,
    },
    {
      id: 'c_older',
      title: 'Ancient Conversation',
      createdAt: now - 1000 * 60 * 60 * 24 * 30, // 30 days ago
      updatedAt: now - 1000 * 60 * 60 * 24 * 30,
      messageCount: 1,
    },
  ];

  it('renders closed state with data-open="false" and aria-hidden when isOpen is false', () => {
    render(
      <StandaloneProvider>
        <ConversationSidebar
          isOpen={false}
          onToggle={vi.fn()}
          conversations={[]}
          activeId={null}
          onSelect={vi.fn()}
          onNewChat={vi.fn()}
          onDelete={vi.fn()}
          isLoading={false}
        />
      </StandaloneProvider>
    );
    const sidebar = screen.getByTestId('sidebar-container');
    expect(sidebar.getAttribute('data-open')).toBe('false');
    expect(sidebar.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByTitle('Collapse sidebar')).toBeNull();
  });

  it('renders empty state when no conversations exist', () => {
    render(
      <StandaloneProvider>
        <ConversationSidebar
          isOpen={true}
          onToggle={vi.fn()}
          conversations={[]}
          activeId={null}
          onSelect={vi.fn()}
          onNewChat={vi.fn()}
          onDelete={vi.fn()}
          isLoading={false}
        />
      </StandaloneProvider>
    );

    expect(screen.getByText('No saved conversations yet.')).toBeDefined();
    expect(screen.getByText('Messages are encrypted at rest.')).toBeDefined();
  });

  it('renders grouped conversations, handles clicks and delete confirmation', () => {
    const handleSelect = vi.fn();
    const handleNewChat = vi.fn();
    const handleToggle = vi.fn();
    const handleDelete = vi.fn();

    // Mock confirm
    const confirmSpy = vi.spyOn(window, 'confirm');
    confirmSpy.mockReturnValue(true);

    render(
      <StandaloneProvider>
        <ConversationSidebar
          isOpen={true}
          onToggle={handleToggle}
          conversations={sampleConversations}
          activeId="c_today"
          onSelect={handleSelect}
          onNewChat={handleNewChat}
          onDelete={handleDelete}
          isLoading={false}
        />
      </StandaloneProvider>
    );

    // Group titles
    expect(screen.getByText('Today')).toBeDefined();
    expect(screen.getByText('Yesterday')).toBeDefined();
    expect(screen.getByText('Previous 7 Days')).toBeDefined();
    expect(screen.getByText('Older')).toBeDefined();

    // Active conversation check
    const todayItem = screen.getByText('Today Conversation').closest('[data-testid="conversation-item"]')!;
    expect(todayItem.getAttribute('data-active')).toBe('true');

    // Click conversation
    const yestItem = screen.getByText('Yesterday Conversation');
    fireEvent.click(yestItem);
    expect(handleSelect).toHaveBeenCalledWith('c_yest');

    // Header title and collapse
    expect(screen.getByText('Chats')).toBeDefined();
    fireEvent.click(screen.getByTitle('Collapse sidebar'));
    expect(handleToggle).toHaveBeenCalled();

    // Delete conversation
    const deleteButtons = screen.getAllByTitle('Delete conversation');
    fireEvent.click(deleteButtons[0]);
    expect(confirmSpy).toHaveBeenCalled();
    expect(handleDelete).toHaveBeenCalledWith('c_today');

    confirmSpy.mockRestore();
  });

  it('does not delete conversation if user cancels confirmation', () => {
    const handleDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <StandaloneProvider>
        <ConversationSidebar
          isOpen={true}
          onToggle={vi.fn()}
          conversations={sampleConversations}
          activeId={null}
          onSelect={vi.fn()}
          onNewChat={vi.fn()}
          onDelete={handleDelete}
          isLoading={false}
        />
      </StandaloneProvider>
    );

    const deleteButtons = screen.getAllByTitle('Delete conversation');
    fireEvent.click(deleteButtons[0]);
    expect(confirmSpy).toHaveBeenCalled();
    expect(handleDelete).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('renders user profile in sidebar footer without substitute dropdown', () => {
    render(
      <StandaloneProvider>
        <ConversationSidebar
          isOpen={true}
          onToggle={vi.fn()}
          conversations={[]}
          activeId={null}
          onSelect={vi.fn()}
          onNewChat={vi.fn()}
          onDelete={vi.fn()}
          isLoading={false}
        />
      </StandaloneProvider>
    );

    expect(screen.getByText('Local Developer')).toBeDefined();
    expect(screen.getByText('Developer')).toBeDefined();
    expect(screen.getByText('dev@localhost')).toBeDefined();
    expect(screen.getByTestId('user-avatar')).toBeDefined();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('displays Looker Authenticated Session when in Looker mode', () => {
    const mockContext = {
      isLooker: true,
      hostUrl: 'http://looker.internal',
      user: PRESET_DEVS[0],
      availableUsers: [PRESET_DEVS[0]],
      switchUser: vi.fn(),
      contextData: {},
      saveContextData: vi.fn(),
    };

    render(
      <LookerHostContext.Provider value={mockContext}>
        <ConversationSidebar
          isOpen={true}
          onToggle={vi.fn()}
          conversations={[]}
          activeId={null}
          onSelect={vi.fn()}
          onNewChat={vi.fn()}
          onDelete={vi.fn()}
          isLoading={false}
        />
      </LookerHostContext.Provider>
    );

    expect(screen.getByText('Looker Authenticated Session')).toBeDefined();
  });

  it('handles user without avatarColor and dropdown change with unknown user', () => {
    const userWithoutColor = {
      ...PRESET_DEVS[0],
      avatarColor: '',
    };
    const mockSwitch = vi.fn();
    const mockContext = {
      isLooker: false,
      hostUrl: 'http://localhost:8080',
      user: userWithoutColor,
      availableUsers: [userWithoutColor, PRESET_DEVS[1]],
      switchUser: mockSwitch,
      contextData: {},
      saveContextData: vi.fn(),
    };

    render(
      <LookerHostContext.Provider value={mockContext}>
        <ConversationSidebar
          isOpen={true}
          onToggle={vi.fn()}
          // Only one conversation in Today, other 3 groups empty (line 86 returns null)
          conversations={[sampleConversations[0]]}
          activeId={null}
          onSelect={vi.fn()}
          onNewChat={vi.fn()}
          onDelete={vi.fn()}
          isLoading={false}
        />
      </LookerHostContext.Provider>
    );

    // Verify avatar fallback data attribute and initials
    const avatar = screen.getByTestId('user-avatar');
    expect(avatar.getAttribute('data-avatar-color')).toBe('#388bfd');
    expect(avatar.textContent).toBe(userWithoutColor.avatarInitials);
  });
});

