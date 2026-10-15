import { css, keyframes } from '@emotion/react';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 var(--green-a4); }
  50% { box-shadow: 0 0 16px 2px var(--green-a5); }
`;

export const dialogContent = css`
  max-width: 720px;
  width: 94vw;
  max-height: 88vh;
  border-radius: 18px;
  background-color: var(--color-surface, var(--gray-2));
  border: 1px solid var(--gray-a4);
  box-shadow:
    0 24px 48px -12px rgba(0, 0, 0, 0.4),
    0 0 0 1px var(--gray-a3);
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-sizing: border-box;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--gray-a4);
    border-radius: 4px;
  }
`;

export const header = css`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--gray-a3);
`;

export const iconBadge = css`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-3), var(--accent-5));
  border: 1px solid var(--accent-a5);
  color: var(--accent-11);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 14px var(--accent-a4);
`;

export const creationCard = css`
  background-color: var(--gray-3);
  border: 1px solid var(--gray-a4);
  border-radius: 14px;
  padding: 16px 18px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const revealCard = css`
  background: linear-gradient(135deg, var(--green-2), var(--green-3));
  border: 1px solid var(--green-7);
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 20px;
  animation:
    ${fadeIn} 0.25s ease-out,
    ${pulseGlow} 2.5s ease-in-out infinite;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const keyBox = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--color-background, var(--gray-1));
  border: 1px solid var(--green-6);
  border-radius: 8px;
  padding: 10px 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  word-break: break-all;
  user-select: all;
`;

export const keyList = css`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 250px;
  overflow-y: auto;
  padding-right: 4px;
  margin-bottom: 20px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--gray-a4);
    border-radius: 4px;
  }
`;

export const keyItem = css`
  background-color: var(--gray-2);
  border: 1px solid var(--gray-a3);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  transition: all 0.18s ease;

  &:hover {
    border-color: var(--accent-a5);
    background-color: var(--gray-3);
    transform: translateY(-1px);
  }
`;

export const emptyState = css`
  padding: 32px 20px;
  border-radius: 12px;
  border: 1px dashed var(--gray-a5);
  background-color: var(--gray-a2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  margin-bottom: 20px;
`;

export const guideCard = css`
  background-color: var(--gray-2);
  border: 1px solid var(--gray-a3);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const codeBlock = css`
  background-color: var(--gray-1);
  border: 1px solid var(--gray-a3);
  border-radius: 8px;
  padding: 10px 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  color: var(--gray-12);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  user-select: all;
  overflow-x: auto;
  white-space: pre;
`;

export const confirmRevokeBox = css`
  background: var(--red-2);
  border: 1px solid var(--red-6);
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: 8px;
  animation: ${fadeIn} 0.15s ease-out;
`;
