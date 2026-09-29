import {
  ArrowDownIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  Cross1Icon,
  Cross2Icon,
  Link2Icon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  PaperPlaneIcon,
  PersonIcon,
  TableIcon,
  TargetIcon,
} from '@radix-ui/react-icons';
import { Button, Flex, Heading, IconButton, Text } from '@radix-ui/themes';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useEffect, useRef, useState } from 'react';

import {
  activeChatMessagesAtom,
  activeEditorAtom,
  addChatMessagesAction,
  aiChatOpenAtom,
  clearChatHistoryAction,
  focusedTableAtom,
  hasMoreChatMessagesAtom,
  loadingChatHistoryAtom,
  loadInitialChatHistoryAction,
  loadMoreChatHistoryAction,
} from '@/atoms/modules/ai-chat';
import { selectedSchemaIdAtom } from '@/atoms/modules/sidebar';
import { api, ChatMessage } from '@/utils/api';
import { copyToClipboard } from '@/utils/clipboard';
import { buildSchemaContext, SchemaContext } from '@/utils/schemaContext';

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

/**
 * Shows which table an exchange was grounded on. Rendered on both the question
 * and the answer so a reply can always be traced back to its reference, even
 * after the focus has moved on or the page was reloaded.
 */
const MessageReference: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const { focusedTable, contextTables } = message;
  if (!focusedTable) return null;

  // Tables sent alongside the focused one (its direct relationships).
  const others = (contextTables ?? []).filter(name => name !== focusedTable);

  return (
    <div
      css={styles.messageReference}
      title={
        others.length > 0
          ? `Contexto enviado: ${[focusedTable, ...others].join(', ')}`
          : `Contexto enviado: ${focusedTable}`
      }
    >
      <TargetIcon width="11" height="11" />
      <span>
        Ref. <strong>{focusedTable}</strong>
        {others.length > 0 && ` +${others.length}`}
      </span>
    </div>
  );
};

/** Small copy-to-clipboard button with a transient "copied" confirmation. */
const CopyButton: React.FC<{ value: string; label?: string }> = ({
  value,
  label,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      css={styles.iconAction}
      onClick={handleCopy}
      title="Copiar"
    >
      {copied ? (
        <CheckIcon width="12" height="12" />
      ) : (
        <CopyIcon width="12" height="12" />
      )}
      {label && <span>{copied ? 'Copiado' : label}</span>}
    </button>
  );
};

// Starter prompts shown on an empty conversation to make the assistant's
// capabilities discoverable and save the first keystrokes.
const SUGGESTIONS: Array<{ icon: React.ReactNode; text: string }> = [
  {
    icon: <TableIcon width="15" height="15" />,
    text: 'Crea una tabla de usuarios con autenticación',
  },
  {
    icon: <Link2Icon width="15" height="15" />,
    text: 'Relaciona pedidos con clientes y productos',
  },
  {
    icon: <MagnifyingGlassIcon width="15" height="15" />,
    text: 'Revisa mi esquema y sugiere mejoras o índices',
  },
];

export const AiChatPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(aiChatOpenAtom);
  const [activeEditor] = useAtom(activeEditorAtom);
  const schemaId = useAtomValue(selectedSchemaIdAtom);
  const [focusedTable, setFocusedTable] = useAtom(focusedTableAtom);

  const messages = useAtomValue(activeChatMessagesAtom);
  const hasMore = useAtomValue(hasMoreChatMessagesAtom);
  const loadingHistory = useAtomValue(loadingChatHistoryAtom);

  const [, loadInitialChatHistory] = useAtom(loadInitialChatHistoryAction);
  const [, loadMoreChatHistory] = useAtom(loadMoreChatHistoryAction);
  const [, addChatMessages] = useAtom(addChatMessagesAction);
  const [, clearChatHistory] = useAtom(clearChatHistoryAction);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // Keep the textarea height matched to its content, within CSS bounds.
  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  // Trigger initial chat loading when active schema changes
  useEffect(() => {
    if (schemaId) {
      loadInitialChatHistory(schemaId);
    }
  }, [schemaId, loadInitialChatHistory]);

  // Scroll to bottom when new messages arrive (non-historical ones)
  useEffect(() => {
    if (!loadingHistory) scrollToBottom();
  }, [messages, isOpen, loading, loadingHistory]);

  // Shrink the textarea back once its content is cleared.
  useEffect(() => {
    if (!input) autoGrow();
  }, [input]);

  // Only render panel if a schema is selected
  if (!schemaId) return null;

  // Show the "scroll to latest" pill only when the user has scrolled up.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollButton(distanceFromBottom > 120);
  };

  const runSuggestion = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
    requestAnimationFrame(autoGrow);
  };

  const handleSend = async () => {
    if (!input.trim() || !schemaId || loading) return;

    const userMsgText = input.trim();
    // A reference applies to a single exchange: capture the focus, then clear it
    // so the chip disappears and the next message starts without a reference.
    const currentFocus = focusedTable;
    setFocusedTable(null);
    setInput('');
    setLoading(true);

    // 1. Build the layered context from the editor document (not the DDL text).
    // Done before echoing the message so the bubble can already show which
    // table the exchange references.
    let schemaContext: SchemaContext | null = null;
    let includedTables: string[] = [];
    let unresolvedFocus: string | undefined;
    if (activeEditor) {
      const result = buildSchemaContext(activeEditor.value, currentFocus, {
        question: userMsgText,
      });
      schemaContext = result.context;
      includedTables = result.includedTables;
      unresolvedFocus = result.unresolvedFocus;
      if (result.error) {
        console.error('Error building schema context:', result.error);
      }
    }

    // The reference travels with both sides of the exchange, mirroring what the
    // server persists, so it survives a reload of the conversation.
    const reference = currentFocus
      ? { focusedTable: currentFocus, contextTables: includedTables }
      : {};

    const userMessage: ChatMessage = {
      role: 'user',
      content: userMsgText,
      ...reference,
    };
    const updatedMessages = [...messages, userMessage];

    // Optimistically update conversation history
    addChatMessages([userMessage]);

    if (unresolvedFocus) {
      // Never silently fall back to the whole schema: that is exactly how the
      // assistant ends up answering about an unrelated table.
      addChatMessages([
        {
          role: 'assistant',
          content: `⚠️ No encontré la tabla enfocada **${unresolvedFocus}** en el diagrama (¿fue renombrada o eliminada?). Quita el enfoque o vuelve a enfocarla para continuar.`,
        },
      ]);
      setLoading(false);
      return;
    }

    try {
      // 2. Call backend chat API
      const res = await api.sendChat(updatedMessages, schemaContext, schemaId);

      // 3. Save final conversation history locally
      addChatMessages([
        { role: 'assistant', content: res.reply, ...reference },
      ]);
    } catch (err: any) {
      console.error(err);
      addChatMessages([
        {
          role: 'assistant',
          content: `❌ Error al conectar con la IA: ${err.message}`,
        },
      ]);
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
        aria-label={isOpen ? 'Cerrar Asistente de IA' : 'Abrir Asistente de IA'}
      >
        {isOpen ? (
          <ChevronRightIcon width="16" height="16" />
        ) : (
          <MagicWandIcon width="18" height="18" />
        )}
      </div>

      {/* Header */}
      <div css={styles.header}>
        <Flex align="center" gap="2">
          <span css={styles.headerBadge}>
            <MagicWandIcon width="16" height="16" />
          </span>
          <Flex direction="column">
            <Heading size="3">Asistente de IA</Heading>
            <Text size="1" color="gray">
              Diseño de base de datos
            </Text>
          </Flex>
        </Flex>
        <Flex align="center" gap="2">
          {messages.length > 0 && (
            <Button
              size="1"
              variant="ghost"
              color="red"
              onClick={() => {
                if (confirm('¿Estás seguro de que deseas vaciar el chat?')) {
                  clearChatHistory(schemaId);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              Vaciar
            </Button>
          )}
          <IconButton
            size="1"
            variant="ghost"
            color="gray"
            onClick={() => setIsOpen(false)}
          >
            <Cross1Icon width="14" height="14" />
          </IconButton>
        </Flex>
      </div>

      {/* Messages */}
      <div css={styles.messagesViewport}>
        <div css={styles.scrollArea} ref={scrollRef} onScroll={handleScroll}>
          {hasMore && (
            <Flex justify="center" style={{ margin: '0 0 4px 0' }}>
              <Button
                size="1"
                variant="ghost"
                disabled={loadingHistory}
                onClick={() => loadMoreChatHistory(schemaId)}
                style={{ cursor: 'pointer' }}
              >
                {loadingHistory ? 'Cargando...' : 'Cargar mensajes anteriores'}
              </Button>
            </Flex>
          )}

          {messages.length === 0 && !loadingHistory && (
            <div css={styles.emptyState}>
              <span css={styles.emptyIcon}>
                <MagicWandIcon width="26" height="26" />
              </span>
              <Flex direction="column" gap="1" align="center">
                <Heading size="3">¿En qué te ayudo?</Heading>
                <Text size="2" color="gray" align="center">
                  Pídeme crear tablas y relaciones, o enfoca una tabla (clic
                  derecho → Enfocar en chat IA) para preguntar sobre ella.
                </Text>
              </Flex>
              <div css={styles.suggestionGrid}>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    css={styles.suggestionChip}
                    onClick={() => runSuggestion(s.text)}
                  >
                    {s.icon}
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const blocks = parseMessageContent(msg.content);

            return (
              <div key={index} css={styles.messageRow(isUser)}>
                <div css={styles.messageMeta(isUser)}>
                  <span css={styles.avatar(isUser)}>
                    {isUser ? (
                      <PersonIcon width="13" height="13" />
                    ) : (
                      <MagicWandIcon width="13" height="13" />
                    )}
                  </span>
                  <span css={styles.roleLabel}>
                    {isUser ? 'Tú' : 'Asistente IA'}
                  </span>
                  <MessageReference message={msg} />
                </div>

                <div css={styles.bubbleWrap(isUser)}>
                  <div css={styles.bubble(isUser)}>
                    {blocks.map((block, bIdx) => {
                      if (block.type === 'text') {
                        return (
                          <span key={bIdx}>{renderMarkdown(block.value)}</span>
                        );
                      }
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
                            <div css={styles.sqlHeaderActions}>
                              <CopyButton value={block.value.trim()} />
                              <Button
                                size="1"
                                variant="solid"
                                onClick={() => handleApplySql(block.value)}
                              >
                                <CheckIcon /> Aplicar
                              </Button>
                            </div>
                          </div>
                          <pre css={styles.sqlCode}>{block.value.trim()}</pre>
                        </div>
                      );
                    })}
                  </div>

                  {!isUser && (
                    <div className="msg-actions" css={styles.messageActions}>
                      <CopyButton value={msg.content} label="Copiar" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div css={styles.messageRow(false)}>
              <div css={styles.messageMeta(false)}>
                <span css={styles.avatar(false)}>
                  <MagicWandIcon width="13" height="13" />
                </span>
                <span css={styles.roleLabel}>Asistente IA</span>
              </div>
              <div css={styles.typingIndicator}>
                <div css={styles.dot('0s')} />
                <div css={styles.dot('0.2s')} />
                <div css={styles.dot('0.4s')} />
              </div>
            </div>
          )}
        </div>

        {showScrollButton && (
          <button
            type="button"
            css={styles.scrollToBottom}
            onClick={scrollToBottom}
          >
            <ArrowDownIcon width="13" height="13" /> Ir al final
          </button>
        )}
      </div>

      {/* Input */}
      <div css={styles.inputArea}>
        {focusedTable && (
          <div css={styles.focusChip}>
            <TargetIcon width="13" height="13" />
            <span css={styles.focusChipLabel}>
              Enfocado en <strong>{focusedTable}</strong>
            </span>
            <button
              type="button"
              css={styles.focusChipClose}
              title="Quitar enfoque"
              aria-label="Quitar enfoque"
              onClick={() => setFocusedTable(null)}
            >
              <Cross2Icon width="12" height="12" />
            </button>
          </div>
        )}
        <div css={styles.unifiedInputWrapper}>
          <textarea
            required
            ref={textareaRef}
            css={styles.customTextArea}
            placeholder={
              focusedTable
                ? `Pregunta sobre "${focusedTable}"...`
                : 'Pregunta o pide cambios en el DDL...'
            }
            value={input}
            onChange={e => {
              setInput(e.target.value);
              autoGrow();
            }}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <div css={styles.inputControls}>
            <span css={styles.inputHint}>
              <kbd>Enter</kbd> enviar · <kbd>Shift+Enter</kbd> nueva línea
            </span>
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
