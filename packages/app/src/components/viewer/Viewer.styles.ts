import { css } from '@emotion/react';

export const root = css`
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  background-color: var(--gray-2);
  background-image: radial-gradient(var(--gray-4) 1px, transparent 1px);
  background-size: 20px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const card = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 36px;
  max-width: 440px;
  width: 90%;
  background: var(--color-background);
  border: 1px solid var(--gray-5);
  border-radius: var(--radius-4);
  box-shadow: var(--shadow-4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  text-align: center;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-5);
    border-color: var(--gray-7);
  }
`;

export const iconContainer = css`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: var(--accent-3);
  color: var(--accent-11);
  margin-bottom: 24px;
  border: 1px solid var(--accent-5);
  box-shadow: 0 0 15px var(--accent-a2);
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.05) rotate(5deg);
  }
`;
