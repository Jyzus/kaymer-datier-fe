import { css } from '@emotion/react';

export const root = css`
  width: 260px;
  min-width: 260px;
  height: 100%;
  overflow: hidden;
  background-color: var(--gray-2);
  padding: 14px 0;
  border-right: 1px solid var(--gray-6);
  position: relative;
`;

export const hide = css`
  display: none;
`;

export const header = css`
  padding: 0 12px;
  margin-bottom: 18px;
`;

export const backButton = css`
  width: 100%;
  justify-content: flex-start;
  cursor: pointer;
`;

export const addButton = css`
  width: 100%;
  cursor: pointer;
`;

export const sectionHeader = css`
  padding: 0 16px;
  margin-bottom: 6px;
`;

export const sectionLabel = css`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gray-10);
`;

export const count = css`
  font-size: 11px;
  font-weight: 600;
  color: var(--gray-9);
  font-variant-numeric: tabular-nums;
`;

export const contentArea = css`
  width: 260px;
  min-width: 260px;
  padding: 0 12px;
  height: 100%;
`;

export const emptyState = css`
  padding: 8px 12px;
  color: var(--gray-10);
  line-height: 1.5;
`;

export const empty = css`
  width: 5px;
  min-width: 5px;
  height: 100%;
  background-color: var(--gray-6);
`;
