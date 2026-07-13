import { css } from '@dineug/r-html';

import { TOOLBAR_HEIGHT } from '@/constants/layout';
import { typography } from '@/styles/typography.styles';

export const root = css`
  display: flex;
  width: 100%;
  height: ${TOOLBAR_HEIGHT}px;
  min-height: ${TOOLBAR_HEIGHT}px;
  padding: 0 15px;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  background-color: var(--toolbar-background);

  & > input {
    margin-right: 15px;
  }
`;

export const vertical = css`
  width: 10px;
  height: 100%;
`;

export const menu = css`
  cursor: pointer;
  padding: 0 5px;
  display: flex;
  align-items: center;
  height: 100%;

  &.active {
    fill: var(--active);
  }
  &:hover {
    fill: var(--active);
  }

  &.undo-redo {
    cursor: not-allowed;
    fill: var(--foreground);
  }

  &.undo-redo.active {
    cursor: pointer;
    fill: var(--active);
  }
`;

export const tableCount = css`
  display: flex;
  align-self: center;
  margin-left: auto;
  white-space: nowrap;
  ${typography.paragraph};
`;

export const modalOverlay = css`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

export const modalContent = css`
  background-color: var(--canvas-background, #1a1a1a);
  border: 1px solid var(--border, #333);
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: slideUp 0.2s ease-out;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

export const modalTitle = css`
  font-size: 16px;
  font-weight: 600;
  color: var(--foreground, #fff);
  margin: 0;
`;

export const modalTextarea = css`
  width: 100%;
  height: 180px;
  background-color: var(--toolbar-background, #222);
  border: 1px solid var(--border, #444);
  border-radius: 6px;
  color: var(--foreground, #fff);
  padding: 12px;
  font-family: monospace;
  font-size: 12px;
  resize: vertical;
  outline: none;

  &:focus {
    border-color: var(--active, #3880ff);
  }
`;

export const modalActions = css`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

export const modalButton = css`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background-color 0.15s;

  &.cancel {
    background-color: transparent;
    color: var(--foreground, #aaa);
    border: 1px solid var(--border, #444);

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }

  &.merge {
    background-color: var(--active, #3880ff);
    color: #fff;

    &:hover {
      opacity: 0.9;
    }
  }
`;
