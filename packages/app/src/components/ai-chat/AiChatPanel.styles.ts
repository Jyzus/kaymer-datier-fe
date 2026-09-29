import { css, keyframes } from '@emotion/react';

const slideIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

export const panel = (isOpen: boolean) => css`
  width: 400px;
  min-width: 400px;
  height: 100%;
  border-left: 1px solid var(--gray-6);
  background-color: var(--gray-2);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  position: relative;
  z-index: 10;
  transition: margin-right 0.25s ease-out;

  ${!isOpen &&
  `
    margin-right: -400px;
  `}
`;

export const header = css`
  padding: 12px 16px;
  border-bottom: 1px solid var(--gray-5);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--gray-1);
`;

export const headerBadge = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(140deg, var(--accent-9), var(--accent-10));
  color: var(--accent-contrast, #fff);
  box-shadow: var(--shadow-2);
`;

export const scrollArea = css`
  flex-grow: 1;
  padding: 18px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  scroll-behavior: smooth;
`;

const messageAppear = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const messageRow = (isUser: boolean) => css`
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  align-items: ${isUser ? 'flex-end' : 'flex-start'};
  animation: ${messageAppear} 0.18s ease-out;

  &:hover .msg-actions,
  &:focus-within .msg-actions {
    opacity: 1;
  }
`;

export const messageMeta = (isUser: boolean) => css`
  display: flex;
  align-items: center;
  gap: 7px;
  flex-direction: ${isUser ? 'row-reverse' : 'row'};
  padding: 0 2px;
`;

export const avatar = (isUser: boolean) => css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  ${isUser
    ? `background-color: var(--gray-5); color: var(--gray-11);`
    : `background: linear-gradient(140deg, var(--accent-9), var(--accent-10)); color: var(--accent-contrast, #fff);`}
`;

export const roleLabel = css`
  font-size: 11px;
  font-weight: 600;
  color: var(--gray-10);
  letter-spacing: 0.01em;
`;

export const bubbleWrap = (isUser: boolean) => css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 90%;
  align-items: ${isUser ? 'flex-end' : 'flex-start'};
`;

export const bubble = (isUser: boolean) => css`
  padding: 11px 14px;
  border-radius: 14px;
  ${isUser
    ? 'border-bottom-right-radius: 4px;'
    : 'border-bottom-left-radius: 4px;'}
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
  border: 1px solid ${isUser ? 'var(--accent-6)' : 'var(--gray-5)'};
  background-color: ${isUser ? 'var(--accent-4)' : 'var(--gray-3)'};
  color: var(--gray-12);
  box-shadow: var(--shadow-1);
`;

export const messageActions = css`
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;

  /* Revealed on row hover/focus (see messageRow). Touch devices have no hover,
     so keep it visible there. */
  @media (hover: none) {
    opacity: 1;
  }
`;

export const iconAction = css`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border: 1px solid var(--gray-5);
  border-radius: 6px;
  background: var(--gray-1);
  color: var(--gray-11);
  font-size: 11px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;

  &:hover {
    background: var(--gray-3);
    color: var(--gray-12);
    border-color: var(--gray-7);
  }
`;

export const sqlActionBlock = css`
  margin-top: 10px;
  border: 1px solid var(--accent-6);
  border-radius: 10px;
  overflow: hidden;
  background-color: var(--gray-1);
`;

export const sqlHeader = css`
  background-color: var(--accent-3);
  padding: 7px 10px 7px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--accent-5);
`;

export const sqlHeaderActions = css`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const sqlCode = css`
  padding: 10px 12px;
  font-family: var(--code-font-family, monospace);
  font-size: 12px;
  line-height: 1.55;
  overflow-x: auto;
  white-space: pre;
  color: var(--accent-11);
  background-color: var(--gray-1);
  margin: 0;
`;

/* --- Empty state --- */

export const emptyState = css`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px 12px;
  text-align: center;
`;

export const emptyIcon = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(140deg, var(--accent-4), var(--accent-6));
  color: var(--accent-11);
`;

export const suggestionGrid = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 300px;
  margin-top: 4px;
`;

export const suggestionChip = css`
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--gray-5);
  border-radius: 10px;
  background: var(--gray-1);
  color: var(--gray-12);
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s,
    transform 0.1s;

  svg {
    flex-shrink: 0;
    color: var(--accent-10);
  }

  &:hover {
    border-color: var(--accent-8);
    background: var(--accent-2);
  }

  &:active {
    transform: scale(0.99);
  }
`;

/* --- Input area --- */

export const inputArea = css`
  padding: 12px 16px 14px;
  border-top: 1px solid var(--gray-5);
  background-color: var(--gray-1);
`;

export const messageReference = css`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 1px 8px 1px 6px;
  border-radius: 999px;
  background-color: var(--accent-3);
  border: 1px solid var(--accent-6);
  color: var(--accent-11);
  font-size: 10px;
  line-height: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: default;

  strong {
    font-weight: 600;
  }
`;

export const focusChip = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  margin-bottom: 8px;
  padding: 4px 6px 4px 10px;
  border-radius: 999px;
  background-color: var(--accent-3);
  border: 1px solid var(--accent-6);
  color: var(--accent-11);
  font-size: 12px;
`;

export const focusChipLabel = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  strong {
    font-weight: 600;
  }
`;

export const focusChipClose = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--accent-11);
  cursor: pointer;

  &:hover {
    background-color: var(--accent-5);
  }
`;

export const unifiedInputWrapper = css`
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: var(--color-background);
  border: 1px solid var(--gray-6);
  border-radius: 14px;
  padding: 10px 12px 8px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;

  &:focus-within {
    border-color: var(--accent-8);
    box-shadow: 0 0 0 3px var(--accent-a4, rgba(0, 0, 0, 0.06));
  }
`;

export const customTextArea = css`
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  box-shadow: none;
  resize: none;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  color: var(--gray-12);
  min-height: 24px;
  max-height: 160px;
  padding: 0;
  margin: 0;

  &::placeholder {
    color: var(--gray-8);
  }
`;

export const inputControls = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
`;

export const inputHint = css`
  font-size: 10.5px;
  color: var(--gray-9);
  user-select: none;

  kbd {
    font-family: inherit;
    padding: 1px 4px;
    border: 1px solid var(--gray-6);
    border-radius: 4px;
    background: var(--gray-3);
    font-size: 10px;
    color: var(--gray-11);
  }
`;

const handleAttention = keyframes`
  0%, 100% { box-shadow: -3px 0 12px var(--accent-a5, rgba(0, 0, 0, 0.15)); }
  50% { box-shadow: -3px 0 22px 2px var(--accent-a8, rgba(0, 0, 0, 0.3)); }
`;

export const toggleHandle = (isOpen: boolean) => css`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: ${isOpen ? '-20px' : '-32px'};
  width: ${isOpen ? '20px' : '32px'};
  height: ${isOpen ? '64px' : '80px'};
  background-color: ${isOpen ? 'var(--gray-3)' : 'var(--accent-9)'};
  color: ${isOpen ? 'var(--gray-11)' : 'var(--accent-contrast, #fff)'};
  border: 1px solid ${isOpen ? 'var(--gray-6)' : 'var(--accent-9)'};
  border-right: none;
  border-radius: var(--radius-3) 0 0 var(--radius-3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  cursor: pointer;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.08);
  transition:
    background-color 0.2s,
    color 0.2s,
    width 0.2s,
    left 0.2s;

  /* When closed, run a short attention pulse so the assistant is discoverable. */
  ${!isOpen &&
  css`
    animation: ${handleAttention} 2.4s ease-in-out 3;
  `}

  &:hover {
    width: ${isOpen ? '24px' : '38px'};
    left: ${isOpen ? '-24px' : '-38px'};
    ${isOpen
      ? `background-color: var(--accent-3); color: var(--accent-11);`
      : `filter: brightness(1.08);`}
  }
`;

export const typingIndicator = css`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background-color: var(--gray-3);
  border-radius: 14px;
  border-bottom-left-radius: 4px;
  align-self: flex-start;
  max-width: 80px;
  border: 1px solid var(--gray-5);
`;

const dotPulse = keyframes`
  0%, 100% { opacity: 0.2; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-2px); }
`;

export const dot = (delay: string) => css`
  width: 6px;
  height: 6px;
  background-color: var(--accent-9);
  border-radius: 50%;
  animation: ${dotPulse} 1s infinite ease-in-out;
  animation-delay: ${delay};
`;

/* Floating "scroll to latest" affordance. */
export const scrollToBottom = css`
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px 5px 9px;
  border: 1px solid var(--gray-6);
  border-radius: 999px;
  background: var(--gray-1);
  color: var(--gray-11);
  font-size: 11px;
  cursor: pointer;
  box-shadow: var(--shadow-3);
  z-index: 20;
  transition:
    background 0.15s,
    color 0.15s;

  &:hover {
    background: var(--accent-3);
    color: var(--accent-11);
  }
`;

export const messagesViewport = css`
  position: relative;
  flex-grow: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;
