---
name: frontend-design
description: Expert UI/UX frontend design guidelines and patterns. Use when designing, building, or refining modern user interfaces, dashboards, visual styling, Radix UI Themes layouts, color palettes, animations, and micro-interactions.
---

# Modern Frontend UI/UX Design System & Guidelines

This skill provides comprehensive principles and design patterns for creating modern, elegant, and ergonomic web applications (specifically with React, Emotion, Tailwind, and Radix UI Themes).

## 1. Core Principles

- **Visual Hierarchy & Clarity**: Always guide the user's eye. Primary actions must be obvious; secondary and destructive actions distinct.
- **Depth & Modern Glassmorphism**: Use multi-layered surfaces with subtle borders (`1px solid var(--gray-a4)` or `rgba(255, 255, 255, 0.08)`), subtle background translucency (`backdrop-filter: blur(12px)`), and gentle drop shadows rather than heavy opaque borders.
- **Delightful Micro-interactions**: Smooth transitions (150-200ms ease-out) on hovers, scale/translate feedback on interactive cards, and immediate loading feedback on button clicks.
- **Dark Mode Ergonomics**:
  - Never use pure black `#000000` for main surfaces; use rich dark slates / charcoals (`#0f1117`, `#161922`, or Radix `var(--color-background)` / `var(--gray-1)`).
  - Use high contrast text (`var(--gray-12)`) for headings and primary content, and soft muted grays (`var(--gray-11)`, `var(--gray-10)`) for secondary descriptions.
- **Typography Hierarchy**:
  - Clear scale: 28-32px for page titles, 18-20px for section headers, 14-15px for body text, 12-13px for metadata/labels.
  - Tracking & Letter-spacing: Use `-0.02em` or `-0.5px` on large headings for a crisp modern look.

## 2. Authentication & Onboarding UI Patterns

- **Brand Anchor**: Clear logo badge with gradient icon or subtle glow, paired with a concise value proposition tagline.
- **Third-Party Auth (OAuth)**:
  - Official brand icon (e.g. Google multicolor G logo, GitHub Octocat).
  - High-visibility full-width button with subtle border and crisp hover state.
  - Clear divider: `—— o continúa con correo ——`.
- **Form Ergonomics**:
  - Inline icons inside input slots (Envelope, Lock, User).
  - Clear error states with matching Callouts and red accent borders.
  - Floating card container (380px–420px max width) with soft elevation.

## 3. Dashboard & Workspace UI Patterns

- **Top Navigation Bar / Header**:
  - Crisp title with gradient text fill (`linear-gradient(135deg, var(--accent-11), var(--accent-9))`).
  - Contextual user profile pill with avatar and tenant/account badge.
  - Primary CTA button (e.g. "+ Nuevo Proyecto") styled with gradient accent or high-contrast solid variant.
- **Project & Resource Cards**:
  - Card grid: `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`.
  - Elevation on hover: `transform: translateY(-4px); border-color: var(--accent-7); box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.3)`.
  - Metadata badges: Schema count pill, database dialect badge, last updated relative timestamp.
  - Quick actions: Discreet edit and delete icon buttons on hover without cluttering the main card face.
- **Empty & Loading States**:
  - Friendly empty state with an illustrative icon or subtle graphic, clear title, and direct CTA to create the first item.
  - Loading skeleton or subtle spinner rather than abrupt layout shifts.

## 4. Radix UI Themes Integration

- Use Radix UI semantic variables:
  - Colors: `var(--accent-9)`, `var(--accent-11)`, `var(--gray-2)`, `var(--gray-4)`, `var(--gray-12)`.
  - Radii: `var(--radius-3)` (8px), `var(--radius-4)` (12px), `var(--radius-full)` (9999px).
- Pair Radix UI dialogs with frosted glass overlays:
  ```css
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  ```
