import { css } from '@emotion/react';

export const item = css`
  position: relative;
  border-radius: var(--radius-2);
  cursor: default;
  height: 34px;

  &[data-selected='true'] {
    background-color: var(--accent-4);
    box-shadow: inset 2px 0 0 0 var(--accent-9);
  }

  & > svg {
    cursor: pointer;
    margin-left: 4px;
    color: var(--gray-11);
    visibility: hidden;
  }

  & > .collaborative {
    visibility: hidden;
  }

  &[data-open-menu='true'] {
    & > svg {
      visibility: visible;
    }
  }
`;

export const hover = css`
  /* Only tint on hover when the row is not already the selected one, so the
     selection accent is never masked by the hover surface. */
  &:not([data-selected='true']):hover {
    background-color: var(--gray-4);
  }

  &:hover {
    & > svg {
      visibility: visible;
    }

    & > .collaborative {
      visibility: visible;
    }
  }
`;

export const padding = css`
  padding: 0 var(--space-3);
`;

export const inputPadding = css`
  padding: 0 var(--space-1);
`;

export const text = css`
  width: 100%;
`;

export const ellipsis = css`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
