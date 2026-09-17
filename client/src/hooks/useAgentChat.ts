import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Message,
  Attachment,
  StreamEvent,
  AgentSettings,
  Conversation,
  ConversationSummary,
} from '../types/index.js';

export function useAgentChat(
  userId: string,
  initialSettings?: Partial<AgentSettings>,
  contextData?: Record<string, unknown>
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [settings, setSettingsState] = useState<AgentSettings>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('agent_chat_settings') : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          agentName: initialSettings?.agentName || parsed.agentName || 'Gemini Chat Agent Starter Kit',
          model: initialSettings?.model || parsed.model || 'gemini-3.8-flash',
          systemPrompt: initialSettings?.systemPrompt ?? parsed.systemPrompt ?? '',
          starterPrompts: initialSettings?.starterPrompts || parsed.starterPrompts,
          isLocked: initialSettings?.isLocked ?? parsed.isLocked,
          hideSettings: initialSettings?.hideSettings ?? parsed.hideSettings,
          tagline: initialSettings?.tagline || parsed.tagline,
        };
      }
    } catch {}
    return {
      agentName: initialSettings?.agentName || 'Gemini Chat Agent Starter Kit',
      model: initialSettings?.model || 'gemini-3.8-flash',
      systemPrompt: initialSettings?.systemPrompt || '',
      starterPrompts: initialSettings?.starterPrompts,
      isLocked: initialSettings?.isLocked,
      hideSettings: initialSettings?.hideSettings,
      tagline: initialSettings?.tagline,
    };
  });

  // Fetch authoritative agent manifest config on startup
  useEffect(() => {
    let isMounted = true;
    fetch('/api/agent/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((config) => {
        if (!isMounted || !config) return;
        setSettingsState((prev) => {
          if (config.isLocked) {
            return {
              ...prev,
              agentName: config.name || prev.agentName,
              model: config.model || prev.model,
              systemPrompt: config.systemPrompt ?? prev.systemPrompt,
              starterPrompts: config.starterPrompts || prev.starterPrompts,
              systemPromptFile: config.systemPromptFile || 'agent.prompt.md',
              isLocked: true,
              hideSettings: config.hideSettings ?? false,
              tagline: config.tagline,
            };
          }
          return {
            ...prev,
            agentName: prev.agentName || config.name,
            model: prev.model || config.model,
            starterPrompts: config.starterPrompts || prev.starterPrompts,
            systemPromptFile: config.systemPromptFile || 'agent.prompt.md',
            isLocked: false,
            hideSettings: false,
            tagline: config.tagline,
          };
        });
      })
      .catch(() => {
        // Fall back gracefully if offline / during isolated tests
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setSettings = useCallback((newSettings: AgentSettings | ((prev: AgentSettings) => AgentSettings)) => {
    setSettingsState((prev) => {
      const updated = typeof newSettings === 'function' ? newSettings(prev) : newSettings;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('agent_chat_settings', JSON.stringify(updated));
        }
      } catch {}
      return updated;
    });
  }, []);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch list of saved conversations for this user
  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    try {
      setIsLoadingHistory(true);
      const res = await fetch(`/api/conversations?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversation history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [userId]);

  // Refetch conversations when userId changes
  useEffect(() => {
    fetchConversations();
    // When switching user, reset active chat
    setMessages([]);
    setCurrentConversationId(null);
    setAttachments([]);
  }, [userId, fetchConversations]);

  // Start a new clean chat session
  const startNewChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setCurrentConversationId(null);
    setAttachments([]);
    setStatusMessage(null);
    setIsLoading(false);
  }, []);

  // Load an existing historical conversation
  const loadConversation = useCallback(
    async (id: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      try {
        setIsLoading(true);
        setStatusMessage('Loading conversation...');
        const res = await fetch(`/api/conversations/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          const conv: Conversation = data.conversation;
          setMessages(conv.messages || []);
          setCurrentConversationId(conv.id);
          if (conv.model) {
            setSettings((prev) => ({ ...prev, model: conv.model }));
          }
          if (conv.systemPrompt !== undefined) {
            setSettings((prev) => ({ ...prev, systemPrompt: conv.systemPrompt || '' }));
          }
        }
      } catch (err) {
        console.error('Failed to load conversation:', err);
      } finally {
        setIsLoading(false);
        setStatusMessage(null);
      }
    },
    [userId]
  );

  // Delete an existing conversation
  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/conversations/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setConversations((prev) => prev.filter((c) => c.id !== id));
          if (currentConversationId === id) {
            startNewChat();
          }
        }
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      }
    },
    [userId, currentConversationId, startNewChat]
  );

  // Persist conversation to encrypted backend
  const persistConversation = useCallback(
    async (convId: string, thread: Message[], promptText: string) => {
      if (!userId || thread.length === 0) return;

      const title =
        conversations.find((c) => c.id === convId)?.title ||
        promptText.slice(0, 42).trim() ||
        'New Conversation';

      const conv: Conversation = {
        id: convId,
        userId,
        title,
        model: settings.model,
        systemPrompt: settings.systemPrompt || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: thread,
      };

      try {
        await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation: conv }),
        });
        fetchConversations();
      } catch (err) {
        console.error('Failed to persist conversation:', err);
      }
    },
    [userId, settings, conversations, fetchConversations]
  );

  const addAttachment = useCallback((attachment: Attachment) => {
    setAttachments((prev) => [...prev, attachment]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const clearChat = useCallback(() => {
    startNewChat();
  }, [startNewChat]);

  // Core SSE execution turn
  const executeStreamTurn = useCallback(
    async (thread: Message[], promptText: string, activeConvId: string) => {
      const agentMessageId = `agent_${Date.now()}`;

      const initialAgentMessage: Message = {
        id: agentMessageId,
        role: 'model',
        content: '',
        toolCalls: [],
        toolResults: [],
        timestamp: Date.now(),
      };

      setMessages([...thread, initialAgentMessage]);
      setIsLoading(true);
      setStatusMessage('Connecting to Gemini...');

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      let finalAgentContent = '';
      const finalToolCalls: any[] = [];
      const finalToolResults: any[] = [];
      let turnHasError = false;

      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: thread,
            model: settings.isLocked ? undefined : settings.model,
            systemPrompt: settings.isLocked ? undefined : (settings.systemPrompt || undefined),
            contextData,
          }),
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              const jsonStr = trimmed.replace(/^data:\s*/, '');
              if (!jsonStr) continue;

              try {
                const event: StreamEvent = JSON.parse(jsonStr);

                if (event.type === 'token') {
                  finalAgentContent += event.content;
                  setMessages((prev) =>
                    prev.map((msg) => (msg.id === agentMessageId ? { ...msg, content: msg.content + event.content } : msg))
                  );
                } else if (event.type === 'status') {
                  setStatusMessage(event.message);
                } else if (event.type === 'tool_call') {
                  finalToolCalls.push(event.tool);
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === agentMessageId
                        ? { ...msg, toolCalls: [...(msg.toolCalls || []), event.tool] }
                        : msg
                    )
                  );
                } else if (event.type === 'tool_result') {
                  finalToolResults.push(event.result);
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === agentMessageId
                        ? { ...msg, toolResults: [...(msg.toolResults || []), event.result] }
                        : msg
                    )
                  );
                } else if (event.type === 'error') {
                  turnHasError = true;
                  setStatusMessage(`Error: ${event.error}`);
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === agentMessageId
                        ? {
                            ...msg,
                            errorMessage: event.error,
                            isError: true,
                            canRetry: true,
                          }
                        : msg
                    )
                  );
                } else if (event.type === 'done') {
                  setStatusMessage(null);
                }
              } catch {
                // Ignore parse error on partial chunks
              }
            }
          }
        }

        // On successful turn completion, persist to encrypted storage
        if (!turnHasError) {
          const completedAgentMsg: Message = {
            id: agentMessageId,
            role: 'model',
            content: finalAgentContent,
            toolCalls: finalToolCalls.length > 0 ? finalToolCalls : undefined,
            toolResults: finalToolResults.length > 0 ? finalToolResults : undefined,
            timestamp: Date.now(),
          };

          const finalThread = [...thread, completedAgentMsg];
          persistConversation(activeConvId, finalThread, promptText);
        }
      } catch (err: unknown) {
        if ((err as any)?.name !== 'AbortError') {
          turnHasError = true;
          const errorMsg = err instanceof Error ? err.message : String(err);
          setStatusMessage(`Connection Error: ${errorMsg}`);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === agentMessageId
                ? {
                    ...msg,
                    errorMessage: errorMsg,
                    isError: true,
                    canRetry: true,
                  }
                : msg
            )
          );
        }
      } finally {
        setIsLoading(false);
        setStatusMessage(null);
        abortControllerRef.current = null;
      }
    },
    [settings, persistConversation]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if ((!text.trim() && attachments.length === 0) || isLoading) {
        return;
      }

      const activeConvId = currentConversationId || `conv_${Date.now()}`;
      if (!currentConversationId) {
        setCurrentConversationId(activeConvId);
      }

      const userMessageId = `user_${Date.now()}`;
      const currentAttachments = [...attachments];
      const newUserMessage: Message = {
        id: userMessageId,
        role: 'user',
        content: text,
        attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
        timestamp: Date.now(),
      };

      const updatedHistory = [...messages, newUserMessage];
      setAttachments([]);

      await executeStreamTurn(updatedHistory, text, activeConvId);
    },
    [messages, attachments, isLoading, currentConversationId, executeStreamTurn]
  );

  const retryLastMessage = useCallback(
    async (failedMessageId?: string) => {
      if (isLoading) return;

      let lastUserIdx = -1;
      if (failedMessageId) {
        const errorIdx = messages.findIndex((m) => m.id === failedMessageId);
        if (errorIdx > 0) {
          for (let i = errorIdx - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
              lastUserIdx = i;
              break;
            }
          }
        }
      }

      // Fallback: locate the most recent user turn
      if (lastUserIdx === -1) {
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'user') {
            lastUserIdx = i;
            break;
          }
        }
      }

      if (lastUserIdx === -1) return;

      const activeConvId = currentConversationId || `conv_${Date.now()}`;
      if (!currentConversationId) {
        setCurrentConversationId(activeConvId);
      }

      const lastUserMsg = messages[lastUserIdx];
      // Keep everything up to the user message, discarding the failed agent turn
      const historyUpToUser = messages.slice(0, lastUserIdx + 1);

      await executeStreamTurn(historyUpToUser, lastUserMsg.content, activeConvId);
    },
    [messages, isLoading, currentConversationId, executeStreamTurn]
  );

  return {
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
    clearAttachments,
    sendMessage,
    retryLastMessage,
    clearChat,
    startNewChat,
    loadConversation,
    deleteConversation,
  };
}
