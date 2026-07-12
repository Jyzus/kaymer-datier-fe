import { css, keyframes } from '@emotion/react';

const slideIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

export const panel = css`
  width: 380px;
  min-width: 380px;
  height: 100%;
  border-left: 1px solid var(--gray-6);
  background-color: var(--gray-2);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  animation: ${slideIn} 0.25s ease-out;
  position: relative;
  z-index: 10;
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
  max-width: 85%;
`;

export const userMessage = css`
  align-self: flex-end;
  ${messageContainer}
`;

export const assistantMessage = css`
  align-self: flex-start;
  ${messageContainer}
`;

export const bubble = (isUser: boolean) => css`
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  ${isUser
    ? `
    background-color: var(--accent-9);
    color: white;
    border-bottom-right-radius: 2px;
  `
    : `
    background-color: var(--gray-3);
    color: var(--gray-12);
    border-bottom-left-radius: 2px;
    border: 1px solid var(--gray-4);
  `}
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
  display: flex;
  gap: 8px;
`;

export const input = css`
  flex-grow: 1;
`;

export const toggleFloatingButton = css`
  position: absolute;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: scale(1.05);
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
