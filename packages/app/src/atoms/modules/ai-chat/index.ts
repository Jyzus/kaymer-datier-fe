import { atom, useAtom } from 'jotai';

import { api, ChatMessage } from '@/utils/api';

export const aiChatOpenAtom = atom<boolean>(false);

export const activeEditorAtom = atom<any | null>(null);

export const activeChatMessagesAtom = atom<ChatMessage[]>([]);
export const hasMoreChatMessagesAtom = atom<boolean>(true);
export const loadingChatHistoryAtom = atom<boolean>(false);

export const loadInitialChatHistoryAction = atom(
  null,
  async (get, set, schemaId: string) => {
    set(activeChatMessagesAtom, []);
    set(hasMoreChatMessagesAtom, true);
    set(loadingChatHistoryAtom, true);
    try {
      const messages = await api.getChatHistory(schemaId, 10, 0);
      const chronological = [...messages].reverse();
      set(activeChatMessagesAtom, chronological);
      set(hasMoreChatMessagesAtom, messages.length === 10);
    } catch (err) {
      console.error('Failed to load initial chat history:', err);
    } finally {
      set(loadingChatHistoryAtom, false);
    }
  }
);

export const loadMoreChatHistoryAction = atom(
  null,
  async (get, set, schemaId: string) => {
    const currentMessages = get(activeChatMessagesAtom);
    set(loadingChatHistoryAtom, true);
    try {
      const offset = currentMessages.length;
      const messages = await api.getChatHistory(schemaId, 10, offset);
      const chronological = [...messages].reverse();
      set(activeChatMessagesAtom, [...chronological, ...currentMessages]);
      set(hasMoreChatMessagesAtom, messages.length === 10);
    } catch (err) {
      console.error('Failed to load more chat history:', err);
    } finally {
      set(loadingChatHistoryAtom, false);
    }
  }
);

export const addChatMessagesAction = atom(
  null,
  (get, set, newMessages: ChatMessage[]) => {
    const current = get(activeChatMessagesAtom);
    set(activeChatMessagesAtom, [...current, ...newMessages]);
  }
);

export const clearChatHistoryAction = atom(
  null,
  async (get, set, schemaId: string) => {
    try {
      await api.clearChatHistory(schemaId);
      set(activeChatMessagesAtom, []);
      set(hasMoreChatMessagesAtom, false);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  }
);

export const useAiChatOpen = () => useAtom(aiChatOpenAtom);
export const useActiveEditor = () => useAtom(activeEditorAtom);
