import { css } from '@emotion/react';

export const badge = (color: string, size: number) => css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${size}px;
  height: ${size}px;
  border-radius: 5px;
  background-color: ${color};
  color: #fff;
  font-size: ${Math.round(size * 0.5)}px;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1;
  user-select: none;
  /* Keep the mark legible on both light and dark surfaces */
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
`;
