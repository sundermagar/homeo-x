# Paperplane Brand Identity & Design System (v1.0)

This document serves as the "Agent Memory" for the Paperplane (Homeo-x) design system, extracted from the official brand kit.

## 🎨 Core Design Tokens

### Colors
- **Primary Accent**: `#2563EB` (Paperplane Blue)
- **Neutral Palette**:
    - **Page Background**: `#FAFAF8` (Warm 1)
    - **Surface 2**: `#F4F3F1`
    - **Border Default**: `#E3E2DF` (Warm 4)
    - **Dark Background**: `#0F172A`
- **Typography Colors**:
    - **Primary Text**: `#0F0F0E` (Ink Primary)
    - **Secondary Text**: `#4A4A47` (Text 2)
    - **Muted/Metadata**: `#888786` (Text 3)
- **Semantic Colors**:
    - **Success**: `#16A34A` on `#F0FDF4`
    - **Danger**: `#DC2626` on `#FEF2F2`
    - **Warning**: `#D97706` on `#FFFBEB`
    - **Info**: `#2563EB` on `#EFF6FF`

### Typography (Geist Family)
- **Primary Font**: [Geist](https://fonts.google.com/specimen/Geist) (UI text, headings)
- **Monospace Font**: [Geist Mono](https://fonts.google.com/specimen/Geist+Mono) (Data, IDs, timers, amounts)
- **Weights**: Regular (400), Medium (500), SemiBold (600), Bold (700), ExtraBold (800)

### Spacing & Layout
- **Grid Unit**: 4px base (all values are multiples of 4).
- **Chrome Heights**: 
    - Topbar & Stage Footer: 48px
    - Secondary Bars: 36px
    - Table Rows: 28px
- **Page Rhythm**: 16–56px.

### Component Specs
- **Border Radius**: 
    - Buttons: 6px
    - Cards/Tables: 8px
    - Status Pills: 20px
- **Iconography**: Lucide icons, stroke-width 1.5–1.8, always stroke, never fill.

## 🎬 Motion & Transitions
- **UI Entering**: `cubic-bezier(0, 0, 0.2, 1)` (Ease out)
- **Transitions**: `cubic-bezier(0.4, 0, 0.6, 1)` (Ease in-out)
- **Durations**:
    - Micro-interactions: 80ms
    - Fast (fades, pills): 150ms
    - Standard (collapse): 200ms
    - Deliberate (stage transitions): 300ms

## 🗣️ Voice & Tone
- **Principles**: Direct, confident, precise, brief.
- **Constraints**: 
    - No exclamation marks.
    - Numbers over adjectives.
    - Action-oriented descriptions ("Capturing symptoms" vs "AI is extracting").

## 📱 Responsive & Mobile-First
- **Philosophy**: All designs must be built **Mobile-First**. Base styles target small screens, with cumulative enhancements for larger viewports.
- **Breakpoints**:
    - **Sm**: 640px (Handheld - Vertical)
    - **Md**: 768px (Handheld - Horizontal / Tablet)
    - **Lg**: 1024px (Laptop / Desktop Base)
    - **Xl**: 1280px (Wide Display)
- **Fluidity**: Use `clamp()` for fluid typography where appropriate. Margin and padding should remain strictly within the 4px grid.
- **Interactions**: Optimize for touch targets (min 44x44px) on mobile. Use hover effects only as progressive enhancements hidden on touch devices.
