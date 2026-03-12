// src/stores/useJuliaStore.ts — Zustand store for Julia AI chat

import { create } from 'zustand';

export type JuliaMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

type JuliaStore = {
  conversationId: string | null;
  messages: JuliaMessage[];
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;

  setConversationId: (id: string | null) => void;
  addMessage: (msg: JuliaMessage) => void;
  setMessages: (msgs: JuliaMessage[]) => void;
  setIsStreaming: (v: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  setError: (err: string | null) => void;
  resetConversation: () => void;
};

export const useJuliaStore = create<JuliaStore>((set) => ({
  conversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  error: null,

  setConversationId: (id) => set({ conversationId: id }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (chunk) =>
    set((s) => ({ streamingContent: s.streamingContent + chunk })),
  setError: (err) => set({ error: err }),
  resetConversation: () =>
    set({
      conversationId: null,
      messages: [],
      isStreaming: false,
      streamingContent: '',
      error: null,
    }),
}));
