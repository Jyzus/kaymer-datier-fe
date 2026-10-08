import { css, keyframes } from '@emotion/react';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const container = css`
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 36px 32px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  box-sizing: border-box;
  animation: ${fadeIn} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

export const header = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--gray-a4);
`;

export const title = css`
  font-weight: 800;
  letter-spacing: -0.03em;
  background: linear-gradient(
    135deg,
    var(--gray-12) 20%,
    var(--accent-11) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
`;

export const searchBar = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

export const grid = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
`;

export const card = css`
  position: relative;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
  border: 1px solid var(--gray-a4);
  border-radius: 14px;
  background-color: var(--color-surface, var(--gray-2));
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 195px;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    border-color: var(--accent-7);
    box-shadow:
      0 14px 28px -8px rgba(0, 0, 0, 0.25),
      0 0 0 1px var(--accent-a5);
    background-color: var(--gray-3);
  }
`;

export const cardHighlight = css`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent-9), var(--accent-11));
  opacity: 0.8;
`;

export const cardBody = css`
  padding: 22px 22px 16px 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const cardFooter = css`
  padding: 12px 22px;
  border-top: 1px solid var(--gray-a3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--gray-1);
`;

export const dialogOverlay = css`
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  position: fixed;
  inset: 0;
  z-index: 1000;
`;

export const dialogContent = css`
  background-color: var(--gray-2);
  border-radius: 16px;
  box-shadow:
    hsl(206 22% 7% / 35%) 0px 10px 38px -10px,
    hsl(206 22% 7% / 20%) 0px 10px 20px -15px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  max-width: 500px;
  max-height: 85vh;
  padding: 28px;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid var(--gray-a5);
`;

export const iconButton = css`
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-10);
  background: transparent;
  border: 1px solid transparent;
  transition: all 0.18s ease;

  &:hover {
    color: var(--gray-12);
    background-color: var(--gray-4);
    border-color: var(--gray-6);
  }
`;

export const deleteButton = css`
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-10);
  background: transparent;
  border: 1px solid transparent;
  transition: all 0.18s ease;

  &:hover {
    color: var(--red-9);
    background-color: var(--red-a3);
    border-color: var(--red-a5);
  }
`;

export const userPill = css`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 6px 8px;
  border-radius: 20px;
  background-color: var(--gray-3);
  border: 1px solid var(--gray-a4);
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.25; }
`;

export const skeletonGrid = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
`;

export const skeletonCard = css`
  min-height: 195px;
  border-radius: 14px;
  background-color: var(--gray-3);
  border: 1px solid var(--gray-a3);
  animation: ${pulse} 1.6s ease-in-out infinite;
`;

export const onboardingContainer = css`
  max-width: 800px;
  margin: 32px auto 60px auto;
  width: 100%;
  padding: 60px 48px;
  border-radius: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-surface, var(--gray-2));
  border: 1px solid var(--gray-a4);
  box-shadow:
    0 20px 48px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px var(--gray-a3);
  backdrop-filter: blur(12px);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
`;

export const onboardingHighlight = css`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(
    90deg,
    var(--accent-9) 0%,
    var(--accent-11) 50%,
    var(--accent-8) 100%
  );
`;

export const onboardingIconWrapper = css`
  width: 76px;
  height: 76px;
  border-radius: 22px;
  background: linear-gradient(135deg, var(--accent-3), var(--accent-5));
  border: 1px solid var(--accent-a6);
  color: var(--accent-11);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: 0 10px 28px -6px var(--accent-a5);
`;

export const featuresGrid = css`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
  margin-top: 44px;
  width: 100%;
  text-align: left;
`;

export const featureCard = css`
  padding: 18px 20px;
  border-radius: 14px;
  background-color: var(--gray-3);
  border: 1px solid var(--gray-a3);
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--accent-a5);
    background-color: var(--gray-4);
  }
`;

export const searchEmptyCard = css`
  padding: 56px 32px;
  border-radius: 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-surface, var(--gray-2));
  border: 1px dashed var(--gray-a5);
  margin-top: 16px;
`;
