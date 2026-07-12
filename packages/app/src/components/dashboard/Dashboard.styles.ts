import { css, keyframes } from '@emotion/react';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const container = css`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow-y: auto;
  box-sizing: border-box;
  animation: ${fadeIn} 0.4s ease-out;
`;

export const header = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  border-bottom: 1px solid var(--gray-4);
  padding-bottom: 20px;
`;

export const title = css`
  font-weight: 800;
  letter-spacing: -0.5px;
  background: linear-gradient(120deg, var(--accent-11), var(--accent-9));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
`;

export const grid = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
`;

export const card = css`
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  border: 1px solid var(--gray-4);
  border-radius: 12px;
  background-color: var(--gray-2);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 180px;

  &:hover {
    transform: translateY(-4px);
    border-color: var(--accent-7);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
    background-color: var(--gray-3);
  }
`;

export const cardBody = css`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const cardFooter = css`
  padding: 12px 20px;
  border-top: 1px solid var(--gray-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--gray-1);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
`;

export const dialogOverlay = css`
  background-color: rgba(0, 0, 0, 0.4);
  position: fixed;
  inset: 0;
  animation: overlayShow 150ms cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 1000;
`;

export const dialogContent = css`
  background-color: var(--gray-2);
  border-radius: 12px;
  box-shadow:
    hsl(206 22% 7% / 35%) 0px 10px 38px -10px,
    hsl(206 22% 7% / 20%) 0px 10px 20px -15px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  max-width: 480px;
  max-height: 85vh;
  padding: 24px;
  animation: contentShow 150ms cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid var(--gray-5);
`;

export const actionButton = css`
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-10);
  background: transparent;
  border: none;
  transition: all 0.2s;

  &:hover {
    color: var(--red-9);
    background-color: var(--red-2);
  }
`;

export const editButton = css`
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-10);
  background: transparent;
  border: none;
  transition: all 0.2s;

  &:hover {
    color: var(--accent-9);
    background-color: var(--accent-2);
  }
`;
