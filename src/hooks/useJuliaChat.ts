// src/hooks/useJuliaChat.ts — Hook for Julia AI chat interactions

import { useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { useJuliaStore } from '@/stores/useJuliaStore';
import type { JuliaMessage } from '@/stores/useJuliaStore';
import { buildJuliaContext } from '@/lib/julia-context';
import { supabase } from '@/lib/supabase';

export function useJuliaChat() {
  const {
    conversationId,
    messages,
    isStreaming,
    streamingContent,
    error,
    setConversationId,
    addMessage,
    setMessages,
    setIsStreaming,
    setStreamingContent,
    appendStreamingContent,
    setError,
    resetConversation,
  } = useJuliaStore();

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setError(null);

    // Get auth session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Not authenticated');
      return;
    }

    // Add user message optimistically
    const userMsg: JuliaMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMsg);

    // Build context from store
    const storeState = useStore.getState();
    const context = buildJuliaContext(session.user.id, {
      userProfile: storeState.userProfile,
      userLocation: storeState.userLocation,
      pins: storeState.pins,
      activeTrip: storeState.activeTrip,
      safeSpaces: storeState.safeSpaces,
    });

    setIsStreaming(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/julia/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conversationId,
          message: trimmed,
          context,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(errBody || `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let newConvId = conversationId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              // Finalize assistant message
              const assistantMsg: JuliaMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: fullContent,
                createdAt: new Date().toISOString(),
              };
              addMessage(assistantMsg);
              setStreamingContent('');
              setIsStreaming(false);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.conversationId && !newConvId) {
                newConvId = parsed.conversationId;
                setConversationId(newConvId);
              }
              if (parsed.text) {
                fullContent += parsed.text;
                appendStreamingContent(parsed.text);
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      }

      // If stream ended without [DONE], finalize anyway
      if (fullContent) {
        const assistantMsg: JuliaMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: fullContent,
          createdAt: new Date().toISOString(),
        };
        addMessage(assistantMsg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setStreamingContent('');
      setIsStreaming(false);
    }
  }, [
    conversationId, isStreaming, setError, addMessage, setIsStreaming,
    setStreamingContent, appendStreamingContent, setConversationId,
  ]);

  const loadHistory = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const response = await fetch('/api/julia/history', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!response.ok) return;

      const data = await response.json();
      if (data.conversationId) {
        setConversationId(data.conversationId);
        setMessages(data.messages ?? []);
      }
    } catch {
      // silent fail — history is optional
    }
  }, [setConversationId, setMessages]);

  const newConversation = useCallback(() => {
    resetConversation();
  }, [resetConversation]);

  return {
    messages,
    isStreaming,
    streamingContent,
    error,
    conversationId,
    sendMessage,
    loadHistory,
    newConversation,
  };
}
