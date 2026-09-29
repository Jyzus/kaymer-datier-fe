import { css } from '@dineug/r-html';

export const root = css`
  display: flex;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 32px;
  background-color: var(--context-menu-background);

  .column-order-move {
    transition: transform 0.3s;
  }
`;

export const lnbArea = css`
  display: flex;
  width: 200px;
  height: 100%;
  overflow: hidden;
`;

export const contentArea = css`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding-left: 16px;
`;

export const content = css`
  display: flex;
  width: 100%;
  height: 100%;
  overflow: auto;
  flex-flow: wrap;
`;

export const section = css`
  margin: 0 32px 32px 0;
  min-width: 300px;
`;

export const row = css`
  display: flex;
  white-space: nowrap;
  height: 24px;
  align-items: center;
  margin-bottom: 16px;
`;

export const vertical = (size: number) => css`
  width: ${size}px;
  height: 100%;
`;

export const columnOrderSection = css`
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
`;

export const columnOrderList = css`
  display: flex;
  flex-direction: column;
`;

export const columnOrderItem = css`
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 32px;
  cursor: move;
  border-radius: 4px;

  &:hover {
    background-color: var(--context-menu-hover);
    color: var(--active);
    fill: var(--active);
  }

  &.none-hover {
    background-color: transparent;
    color: var(--foreground);
    fill: var(--foreground);
  }

  &.dragging {
    opacity: 0.5;
  }
`;

// Change-database-engine confirmation modal
export const modalOverlay = css`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

export const modalContent = css`
  background-color: var(--context-menu-background);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 520px;
  max-width: 90%;
  max-height: 80%;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
`;

export const modalTitle = css`
  font-size: 16px;
  font-weight: 600;
  color: var(--foreground);
  margin: 0;
`;

export const modalSelect = css`
  background-color: var(--context-menu-background);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--foreground);
  padding: 6px 8px;
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: var(--active);
  }
`;

export const modalWarning = css`
  font-size: 13px;
  line-height: 1.5;
  color: var(--foreground);
`;

export const modalWarningStrong = css`
  color: var(--active);
  font-weight: 600;
`;

export const previewList = css`
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: auto;
  max-height: 260px;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px;
`;

export const previewRow = css`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-family: monospace;
  white-space: nowrap;

  &.unmapped {
    opacity: 0.7;
  }
`;

export const previewColumn = css`
  color: var(--foreground);
  min-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const previewFrom = css`
  color: var(--foreground);
  opacity: 0.7;
`;

export const previewTo = css`
  color: var(--active);
`;

export const previewBadge = css`
  color: #e5a50a;
  font-size: 11px;
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
    color: var(--foreground);
    border: 1px solid var(--border);

    &:hover {
      background-color: var(--context-menu-hover);
    }
  }

  &.confirm {
    background-color: var(--active);
    color: #fff;

    &:hover {
      opacity: 0.9;
    }
  }
`;
