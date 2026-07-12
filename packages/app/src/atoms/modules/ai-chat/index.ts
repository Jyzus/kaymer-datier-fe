import { atom, useAtom } from 'jotai';

import { ChatMessage } from '@/utils/api';

export const aiChatOpenAtom = atom<boolean>(false);

export const activeEditorAtom = atom<any | null>(null);

// Stores chat history by schemaId: Record<schemaId, ChatMessage[]>
const chatHistoryMapAtom = atom<Record<string, ChatMessage[]>>({});

export const schemaChatHistoryAtom = atom(
  get => get(chatHistoryMapAtom),
  (get, set, payload: { schemaId: string; messages: ChatMessage[] }) => {
    const currentMap = get(chatHistoryMapAtom);
    set(chatHistoryMapAtom, {
      ...currentMap,
      [payload.schemaId]: payload.messages,
    });
  }
);

export const useAiChatOpen = () => useAtom(aiChatOpenAtom);
export const useActiveEditor = () => useAtom(activeEditorAtom);
