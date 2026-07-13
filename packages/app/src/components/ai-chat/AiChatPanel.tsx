import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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

const renderMarkdown = (text: string) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];

  const parseInline = (line: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      const matchStr = match[0];
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        parts.push(line.substring(lastIndex, matchIndex));
      }

      if (matchStr.startsWith('**') && matchStr.endsWith('**')) {
        parts.push(
          <strong
            key={matchIndex}
            style={{ fontWeight: 'bold', color: 'inherit' }}
          >
            {matchStr.slice(2, -2)}
          </strong>
        );
      } else if (matchStr.startsWith('`') && matchStr.endsWith('`')) {
        parts.push(
          <code
            key={matchIndex}
            style={{
              backgroundColor: 'var(--gray-5)',
              padding: '2px 4px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '11px',
            }}
          >
            {matchStr.slice(1, -1)}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [line];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(
        <li
          key={idx}
          style={{
            marginLeft: '16px',
            marginBottom: '4px',
            listStyleType: 'disc',
          }}
        >
          {parseInline(trimmed.slice(2))}
        </li>
      );
    } else {
      if (inList) {
        elements.push(
          <ul
            key={`list-${idx}`}
            style={{ margin: '8px 0', paddingLeft: '16px' }}
          >
            {listItems}
          </ul>
        );
        inList = false;
      }

      if (trimmed.startsWith('### ')) {
        elements.push(
          <h3
            key={idx}
            style={{
              margin: '12px 0 6px 0',
              fontSize: '14px',
              fontWeight: 'bold',
              color: 'inherit',
            }}
          >
            {parseInline(trimmed.slice(4))}
          </h3>
        );
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h2
            key={idx}
            style={{
              margin: '14px 0 8px 0',
              fontSize: '15px',
              fontWeight: 'bold',
              color: 'inherit',
            }}
          >
            {parseInline(trimmed.slice(3))}
          </h2>
        );
      } else if (trimmed.startsWith('# ')) {
        elements.push(
          <h1
            key={idx}
            style={{
              margin: '16px 0 10px 0',
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'inherit',
            }}
          >
            {parseInline(trimmed.slice(2))}
          </h1>
        );
      } else if (trimmed === '') {
        elements.push(<div key={idx} style={{ height: '8px' }} />);
      } else {
        elements.push(
          <p key={idx} style={{ margin: '4px 0', minHeight: '18px' }}>
            {parseInline(line)}
          </p>
        );
      }
    }
  });

  if (inList) {
    elements.push(
      <ul key="list-end" style={{ margin: '8px 0', paddingLeft: '16px' }}>
        {listItems}
      </ul>
    );
  }

  return elements;
};

const mergeDDL = (currentSql: string, newSql: string): string => {
  const splitStatements = (sql: string): string[] => {
    return sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  const getCreateTableName = (statement: string): string | null => {
    const match = statement.match(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_"`\.-]+)/i
    );
    if (!match) return null;
    return match[1]
      .replace(/["'`\[\]]/g, '')
      .trim()
      .toLowerCase();
  };

  const currentStatements = splitStatements(currentSql);
  const newStatements = splitStatements(newSql);

  const mergedStatements = [...currentStatements];

  for (const newStmt of newStatements) {
    const newTableName = getCreateTableName(newStmt);

    if (newTableName) {
      const existingIdx = mergedStatements.findIndex(stmt => {
        const name = getCreateTableName(stmt);
        return name === newTableName;
      });

      if (existingIdx !== -1) {
        mergedStatements[existingIdx] = newStmt;
      } else {
        mergedStatements.push(newStmt);
      }
    } else {
      mergedStatements.push(newStmt);
    }
  }

  return mergedStatements.join(';\n\n') + ';';
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

  // Only render panel if a schema is selected
  if (!schemaId) return null;

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
      const currentSql = activeEditor.getSchemaSQL();
      const mergedSql = mergeDDL(currentSql, sql);
      activeEditor.setSchemaSQL(mergedSql);
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
    <div css={styles.panel(isOpen)}>
      {/* Vertical Toggle Handle */}
      <div
        css={styles.toggleHandle(isOpen)}
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? 'Cerrar Asistente de IA' : 'Abrir Asistente de IA'}
      >
        {isOpen ? (
          <ChevronRightIcon width="16" height="16" />
        ) : (
          <ChevronLeftIcon width="16" height="16" />
        )}
      </div>

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
                weight="medium"
                style={{
                  color: isUser ? 'var(--accent-11)' : 'var(--gray-9)',
                  marginBottom: '2px',
                }}
              >
                {isUser ? 'Tú' : 'Asistente IA'}
              </Text>

              <div css={styles.bubble(isUser)}>
                {blocks.map((block, bIdx) => {
                  if (block.type === 'text') {
                    return (
                      <span key={bIdx}>{renderMarkdown(block.value)}</span>
                    );
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
        <div css={styles.unifiedInputWrapper}>
          <textarea
            required
            css={styles.customTextArea}
            placeholder="Pregunta o pide cambios en el DDL..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <div css={styles.inputControls}>
            <IconButton
              size="2"
              variant="solid"
              disabled={!input.trim() || loading}
              onClick={handleSend}
              style={{ cursor: 'pointer' }}
            >
              <PaperPlaneIcon width="14" height="14" />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AiChatToggle: React.FC = () => {
  return null;
};
