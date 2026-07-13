import { css, keyframes } from '@emotion/react';

const slideIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

export const panel = (isOpen: boolean) => css`
  width: 380px;
  min-width: 380px;
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
    margin-right: -380px;
  `}
`;

export const header = css`
  padding: 16px;
  border-bottom: 1px solid var(--gray-5);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--gray-1);
`;

export const scrollArea = css`
  flex-grow: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const messageContainer = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
`;

export const userMessage = css`
  ${messageContainer}
`;

export const assistantMessage = css`
  ${messageContainer}
`;

export const bubble = (isUser: boolean) => css`
  padding: 14px 16px;
  border-radius: var(--radius-3);
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
  border: 1px solid ${isUser ? 'var(--accent-5)' : 'var(--gray-5)'};
  background-color: ${isUser ? 'var(--accent-2)' : 'var(--gray-3)'};
  color: ${isUser ? 'var(--accent-11)' : 'var(--gray-12)'};
  box-shadow: var(--shadow-1);
`;

export const sqlActionBlock = css`
  margin-top: 8px;
  border: 1px solid var(--accent-5);
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--gray-1);
`;

export const sqlHeader = css`
  background-color: var(--accent-3);
  padding: 6px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--accent-5);
`;

export const sqlCode = css`
  padding: 10px 12px;
  font-family: monospace;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre;
  color: var(--accent-11);
  background-color: var(--gray-1);
  margin: 0;
`;

export const inputArea = css`
  padding: 16px;
  border-top: 1px solid var(--gray-5);
  background-color: var(--gray-1);
`;

export const unifiedInputWrapper = css`
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: var(--color-background);
  border: 1px solid var(--gray-5);
  border-radius: var(--radius-3);
  padding: 10px 12px;
  padding-bottom: 8px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;

  &:focus-within {
    border-color: var(--accent-8);
    box-shadow: 0 0 0 1px var(--accent-8);
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
  color: var(--gray-12);
  min-height: 44px;
  max-height: 120px;
  padding: 0;
  margin: 0;

  &::placeholder {
    color: var(--gray-8);
  }
`;

export const inputControls = css`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 8px;
`;

export const toggleHandle = (isOpen: boolean) => css`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: -20px;
  width: 20px;
  height: 64px;
  background-color: var(--gray-3);
  border: 1px solid var(--gray-6);
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
    width 0.2s,
    left 0.2s;
  color: var(--gray-11);

  &:hover {
    background-color: var(--accent-3);
    color: var(--accent-11);
    width: 24px;
    left: -24px;
  }
`;

export const typingIndicator = css`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background-color: var(--gray-3);
  border-radius: 12px;
  align-self: flex-start;
  max-width: 80px;
  border-bottom-left-radius: 2px;
  border: 1px solid var(--gray-4);
`;

const dotPulse = keyframes`
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
`;

export const dot = (delay: string) => css`
  width: 6px;
  height: 6px;
  background-color: var(--gray-8);
  border-radius: 50%;
  animation: ${dotPulse} 1s infinite ease-in-out;
  animation-delay: ${delay};
`;
