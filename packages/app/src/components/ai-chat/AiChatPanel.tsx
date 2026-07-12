import {
  ChatBubbleIcon,
  CheckIcon,
  Cross1Icon,
  MagicWandIcon,
  PaperPlaneIcon,
} from '@radix-ui/react-icons';
import {
  Button,
  Flex,
  Heading,
  IconButton,
  Text,
  TextArea,
} from '@radix-ui/themes';
import { useAtom, useAtomValue } from 'jotai';
import React, { useEffect, useRef, useState } from 'react';

import {
  activeEditorAtom,
  aiChatOpenAtom,
  schemaChatHistoryAtom,
} from '@/atoms/modules/ai-chat';
import { selectedSchemaIdAtom } from '@/atoms/modules/sidebar';
import { api, ChatMessage } from '@/utils/api';

import * as styles from './AiChatPanel.styles';

// Helper to parse message content and extract SQL blocks
interface ParsedBlock {
  type: 'text' | 'sql';
  value: string;
}

const parseMessageContent = (content: string): ParsedBlock[] => {
  const parts: ParsedBlock[] = [];
  const regex = /```sql([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push({ type: 'text', value: textBefore });
    }
    parts.push({ type: 'sql', value: match[1] });
    lastIndex = regex.lastIndex;
  }

  const textAfter = content.substring(lastIndex);
  if (textAfter || parts.length === 0) {
    parts.push({ type: 'text', value: textAfter || content });
  }

  return parts;
};

export const AiChatPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(aiChatOpenAtom);
  const [activeEditor] = useAtom(activeEditorAtom);
  const schemaId = useAtomValue(selectedSchemaIdAtom);
  const [chatHistoryMap, setChatHistoryMap] = useAtom(schemaChatHistoryAtom);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = schemaId ? chatHistoryMap[schemaId] || [] : [];

  // Scroll to bottom when messages list updates or panel opens
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, loading]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || !schemaId || loading) return;

    const userMsgText = input.trim();
    setInput('');
    setLoading(true);

    const userMessage: ChatMessage = { role: 'user', content: userMsgText };
    const updatedMessages = [...messages, userMessage];

    // Optimistically update conversation history
    setChatHistoryMap({
      schemaId,
      messages: updatedMessages,
    });

    try {
      // 1. Extract DDL of the active visual diagram
      let ddlContext = '';
      if (activeEditor) {
        try {
          ddlContext = activeEditor.getSchemaSQL();
        } catch (err) {
          console.error('Error fetching schema SQL:', err);
        }
      }

      // 2. Call backend chat API
      const res = await api.sendChat(updatedMessages, ddlContext);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: res.reply,
      };

      // 3. Save final conversation history
      setChatHistoryMap({
        schemaId,
        messages: [...updatedMessages, assistantMessage],
      });
    } catch (err: any) {
      console.error(err);
      setChatHistoryMap({
        schemaId,
        messages: [
          ...updatedMessages,
          {
            role: 'assistant',
            content: `❌ Error al conectar con la IA: ${err.message}`,
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplySql = (sql: string) => {
    if (!activeEditor) {
      alert('Editor no inicializado. Asegúrate de tener un diagrama abierto.');
      return;
    }
    try {
      activeEditor.setSchemaSQL(sql);
    } catch (err: any) {
      alert(`Error al aplicar SQL en el diagrama: ${err.message}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div css={styles.panel}>
      {/* Header */}
      <div css={styles.header}>
        <Flex align="center" gap="2">
          <MagicWandIcon
            width="18"
            height="18"
            style={{ color: 'var(--accent-9)' }}
          />
          <Heading size="3">Asistente de IA (DB)</Heading>
        </Flex>
        <IconButton
          size="1"
          variant="ghost"
          color="gray"
          onClick={() => setIsOpen(false)}
        >
          <Cross1Icon width="14" height="14" />
        </IconButton>
      </div>

      {/* Messages */}
      <div css={styles.scrollArea} ref={scrollRef}>
        {messages.length === 0 && (
          <Flex
            direction="column"
            align="center"
            justify="center"
            style={{ flexGrow: 1, padding: 20 }}
            gap="3"
          >
            <MagicWandIcon
              width="32"
              height="32"
              style={{ color: 'var(--gray-8)', opacity: 0.5 }}
            />
            <Text size="2" color="gray" align="center">
              Pregúntame cosas sobre tu base de datos, pídeme crear tablas,
              relaciones o que te explique campos específicos.
            </Text>
          </Flex>
        )}

        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const blocks = parseMessageContent(msg.content);

          return (
            <div
              key={index}
              css={isUser ? styles.userMessage : styles.assistantMessage}
            >
              <Text
                size="1"
                color="gray"
                style={{ alignSelf: isUser ? 'flex-end' : 'flex-start' }}
              >
                {isUser ? 'Tú' : 'Asistente IA'}
              </Text>

              <div css={styles.bubble(isUser)}>
                {blocks.map((block, bIdx) => {
                  if (block.type === 'text') {
                    return <span key={bIdx}>{block.value}</span>;
                  } else {
                    return (
                      <div key={bIdx} css={styles.sqlActionBlock}>
                        <div css={styles.sqlHeader}>
                          <Text
                            size="1"
                            weight="bold"
                            style={{ color: 'var(--accent-11)' }}
                          >
                            SQL GENERADO
                          </Text>
                          <Button
                            size="1"
                            variant="solid"
                            onClick={() => handleApplySql(block.value)}
                          >
                            <CheckIcon /> Aplicar al Diagrama
                          </Button>
                        </div>
                        <pre css={styles.sqlCode}>{block.value.trim()}</pre>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          );
        })}

        {loading && (
          <div css={styles.assistantMessage}>
            <Text size="1" color="gray">
              Asistente IA
            </Text>
            <div css={styles.typingIndicator}>
              <div css={styles.dot('0s')} />
              <div css={styles.dot('0.2s')} />
              <div css={styles.dot('0.4s')} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div css={styles.inputArea}>
        <TextArea
          required
          css={styles.input}
          placeholder="Pregunta o pide cambios en el DDL..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          style={{ resize: 'none' }}
        />
        <IconButton
          size="3"
          variant="solid"
          disabled={!input.trim() || loading}
          onClick={handleSend}
        >
          <PaperPlaneIcon width="16" height="16" />
        </IconButton>
      </div>
    </div>
  );
};

export const AiChatToggle: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(aiChatOpenAtom);
  const schemaId = useAtomValue(selectedSchemaIdAtom);

  // Toggle button only makes sense when a schema is active/selected
  if (!schemaId) return null;

  return (
    <IconButton
      size="4"
      variant="solid"
      color="grass"
      css={styles.toggleFloatingButton}
      onClick={() => setIsOpen(!isOpen)}
      title="Consultar Asistente de IA"
    >
      <ChatBubbleIcon width="20" height="20" />
    </IconButton>
  );
};
