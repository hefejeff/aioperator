# Design Requirements Document
## AI Operator Training Hub

**Version:** 1.0  
**Last Updated:** February 2, 2026  
**Project:** Workflow Assistant Platform

---

## Table of Contents
1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Component Library](#component-library)
6. [Layout & Spacing](#layout--spacing)
7. [Interaction Patterns](#interaction-patterns)
8. [Animation & Motion](#animation--motion)
9. [Iconography](#iconography)
10. [Accessibility Requirements](#accessibility-requirements)
11. [Responsive Design](#responsive-design)
12. [States & Feedback](#states--feedback)
13. [Data Visualization](#data-visualization)
14. [Forms & Input Controls](#forms--input-controls)
15. [Navigation Patterns](#navigation-patterns)
16. [Content Structure](#content-structure)
17. [Implementation Guidelines](#implementation-guidelines)

---

## Overview

### Purpose
This document defines the design requirements and standards for the AI Operator Training Hub, a React-based web application built with TypeScript, Vite, and Tailwind CSS. The platform enables users to design, evaluate, and package AI-augmented business workflows with integrated AI assistance.

### Scope
- Design system specifications
- Component behavior and patterns
- Visual design standards
- Interaction guidelines
- Accessibility requirements

### Key Stakeholders
- Development team
- UX designers
- Product managers
- QA engineers

---

## Design Philosophy

### Core Principles

#### 1. **Clear and Human**
All design decisions should prioritize clarity and human-centered interaction. Complex AI-driven workflows must be presented in an accessible, understandable manner.

#### 2. **Professional & Approachable**
The interface balances professional enterprise aesthetics with approachable, user-friendly interactions. This is a workspace tool that feels comfortable for extended use.

#### 3. **Content-First**
Visual design serves the content. Generous white space, clear hierarchies, and intentional use of color guide users through complex workflows without overwhelming them.

#### 4. **Progressive Disclosure**
Complex features and AI-powered capabilities are revealed progressively, preventing cognitive overload while providing power users with deep functionality.

---

## Color System

### Brand Colors (West Monroe)

#### Primary Palette
| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Grounded Blue** | `#000033` | `--wm-blue` | Primary text, headers, major UI elements, logo |
| **White** | `#FFFFFF` | `--wm-white` | Backgrounds, cards, negative space |

#### Highlight Color
| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Highlight Yellow** | `#F2E800` | `--wm-yellow` | Spotlight elements, active states, hover accents (use sparingly) |

#### Accent Palette
| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Accent Blue** | `#0045FF` | `--wm-accent` | Primary CTAs, links, active tabs, interactive elements |
| **Accent Pink** | `#F500A0` | `--wm-pink` | Statistics, emphasis, secondary CTAs, delete/warning actions |

#### Support Color
| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Support Neutral** | `#CBD2DA` | `--wm-neutral` | Borders, dividers, disabled states, subtle backgrounds |

### Color Application Rules

#### Text Colors
- **Primary:** `text-wm-blue` (Grounded Blue #000033)
- **Secondary:** `text-wm-blue/70` or `text-wm-blue/60` (70-60% opacity)
- **Tertiary:** `text-wm-blue/50` or `text-wm-blue/40` (50-40% opacity)
- **Links:** `text-wm-accent` with `hover:text-wm-accent/80`
- **Error/Delete:** `text-wm-pink`

#### Background Colors
- **Page background:** `bg-wm-neutral/10` or `bg-wm-white`
- **Card background:** `bg-white` or `bg-wm-white`
- **Hover states:** `hover:bg-wm-neutral/20`
- **Active/Selected:** `bg-wm-accent/10` or `bg-wm-accent/5`
- **Code blocks:** `bg-wm-neutral/20`

#### Border Colors
- **Default:** `border-wm-neutral/30`
- **Focus/Active:** `border-wm-accent`
- **Hover:** `border-wm-accent/50`

#### Button Colors
- **Primary:** `bg-wm-accent text-white hover:bg-wm-accent/90`
- **Secondary:** `bg-wm-pink text-white hover:bg-wm-pink/90`
- **Tertiary:** `bg-wm-neutral/30 text-wm-blue hover:bg-wm-neutral/50`
- **Ghost:** `text-wm-blue/60 hover:bg-wm-neutral/20`
- **Destructive:** `bg-red-600 text-white hover:bg-red-700`

### Color Usage Guidelines
1. **Never mix brand colors randomly** - Each color has a specific purpose
2. **Maintain sufficient contrast** - Ensure text is readable (WCAG AA minimum)
3. **Use opacity for hierarchy** - Fade out less important text with opacity
4. **Accent colors are intentional** - Don't overuse pink and yellow
5. **White space is a color** - Use generously for breathing room

---

## Typography

### Font Family
**Primary Font:** Arial (sans-serif)

```css
font-family: Arial, sans-serif;
```

### Type Scale

| Name | Size | Line Height | Weight | Tailwind Classes |
|------|------|-------------|--------|------------------|
| **Display** | 36px | 40px | Bold (700) | `text-4xl font-bold` |
| **Heading 1** | 30px | 36px | Bold (700) | `text-3xl font-bold` |
| **Heading 2** | 24px | 32px | Bold (700) | `text-2xl font-bold` |
| **Heading 3** | 20px | 28px | Bold (700) | `text-xl font-bold` |
| **Heading 4** | 18px | 24px | Bold (700) | `text-lg font-bold` |
| **Body Large** | 16px | 24px | Regular (400) | `text-base` |
| **Body** | 14px | 20px | Regular (400) | `text-sm` |
| **Body Small** | 12px | 16px | Regular (400) | `text-xs` |
| **Caption** | 11px | 16px | Regular (400) | `text-xs text-wm-blue/50` |

### Typography Usage

#### Headers
- **Keep concise** - Maximum two lines preferred
- **Use bold weight** - All headers should be `font-bold`
- **Color:** Primary headers in `text-wm-blue`, accent headers in `text-wm-accent`
- **Spacing:** Add bottom margin (`mb-2`, `mb-4`) for clear separation

#### Body Text
- **Line spacing:** Generous `leading-relaxed` for readability
- **Paragraph spacing:** Add `space-y-4` to containers
- **Max width:** Limit to `max-w-2xl` or `max-w-4xl` for long form content

#### Emphasis
- **Bold:** `font-bold` or `font-semibold` for key phrases
- **Color:** Use accent colors (`text-wm-accent`, `text-wm-pink`) for statistics or emphasis
- **Italic:** Use sparingly for quotes or secondary information

#### Labels
- **Form labels:** `text-sm font-bold text-wm-blue`
- **Optional indicators:** `text-wm-blue/50 font-normal`
- **Helper text:** `text-xs text-wm-blue/60`

---

## Component Library

### Buttons

#### Primary Button
```tsx
<button className="px-6 py-3 bg-wm-accent text-white font-bold rounded-lg hover:bg-wm-accent/90 transition-colors">
  Primary Action
</button>
```

#### Secondary Button
```tsx
<button className="px-6 py-3 bg-wm-pink text-white font-bold rounded-lg hover:bg-wm-pink/90 transition-colors">
  Secondary Action
</button>
```

#### Tertiary Button
```tsx
<button className="px-4 py-2 bg-wm-neutral/30 text-wm-blue font-bold rounded-lg hover:bg-wm-neutral/50 transition-colors">
  Tertiary Action
</button>
```

#### Ghost Button
```tsx
<button className="px-4 py-2 text-wm-blue/60 hover:bg-wm-neutral/20 rounded-lg transition-colors">
  Ghost Action
</button>
```

#### Icon Button
```tsx
<button className="p-2 rounded-lg hover:bg-wm-neutral/20 transition-colors">
  <Icons.Edit className="w-5 h-5 text-wm-blue" />
</button>
```

#### Destructive Button
```tsx
<button className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">
  Delete
</button>
```

### Cards

#### Standard Card
```tsx
<div className="bg-white border border-wm-neutral/30 rounded-xl p-6 shadow-sm">
  {/* Content */}
</div>
```

#### Hover Card
```tsx
<div className="bg-white border border-wm-neutral/30 rounded-xl p-6 shadow-sm hover:border-wm-accent/50 hover:shadow-md transition-all cursor-pointer">
  {/* Content */}
</div>
```

#### Elevated Card
```tsx
<div className="bg-white border border-wm-neutral/30 rounded-xl p-6 shadow-2xl">
  {/* Content */}
</div>
```

### Badges & Tags

#### Status Badge
```tsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-wm-accent/20 text-wm-accent">
  Active
</span>
```

#### Count Badge
```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-wm-neutral/20 text-wm-blue">
  3
</span>
```

#### Role Badge (used in Admin Dashboard)
```tsx
<span className="text-xs bg-wm-accent text-white px-2 py-0.5 rounded font-bold">
  ADMIN
</span>
```

### Input Fields

#### Text Input
```tsx
<input
  type="text"
  placeholder="Enter text..."
  className="w-full bg-white border border-wm-neutral/30 rounded-lg p-3 text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none placeholder:text-wm-blue/40"
/>
```

#### Textarea
```tsx
<textarea
  rows={4}
  placeholder="Enter description..."
  className="w-full bg-white border border-wm-neutral/30 rounded-lg p-3 text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none placeholder:text-wm-blue/40"
/>
```

#### Select Dropdown
```tsx
<select className="w-full bg-white border border-wm-neutral/30 rounded-lg p-3 text-wm-blue focus:ring-2 focus:ring-wm-accent focus:outline-none">
  <option value="">Select option</option>
  <option value="1">Option 1</option>
</select>
```

### Modals & Overlays

#### Modal Container
```tsx
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
  <div className="bg-white border border-wm-neutral/30 rounded-xl shadow-2xl p-6 w-full max-w-2xl animate-fade-in-up">
    {/* Modal content */}
  </div>
</div>
```

#### Sidebar Drawer
```tsx
<aside className="fixed top-16 right-0 bottom-0 w-80 bg-wm-white border-l border-wm-neutral shadow-2xl z-50 transform transition-transform duration-300">
  {/* Sidebar content */}
</aside>
```

---

## Layout & Spacing

### Spacing Scale
Follow Tailwind's spacing scale (4px base unit):
- `p-1` = 4px
- `p-2` = 8px
- `p-3` = 12px
- `p-4` = 16px
- `p-6` = 24px
- `p-8` = 32px
- `p-12` = 48px

### Common Spacing Patterns

#### Card Padding
- **Small card:** `p-4` (16px)
- **Standard card:** `p-6` (24px)
- **Large card/section:** `p-8` (32px)

#### Section Spacing
- **Between sections:** `space-y-8` or `space-y-6`
- **Within sections:** `space-y-4`
- **Between list items:** `space-y-3` or `space-y-2`

#### Container Padding
```tsx
<div className="container mx-auto px-4 sm:px-6 md:px-8">
```

### Grid Patterns

#### Two Column Layout
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

#### Three Column Layout
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
```

#### Auto-fit Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
```

---

## Interaction Patterns

### Hover States
All interactive elements should have hover feedback:
- **Buttons:** Slight darkening (`hover:bg-wm-accent/90`)
- **Links:** Color change + underline optional
- **Cards:** Border highlight + shadow elevation
- **Icons:** Background circle appears

### Focus States
Keyboard navigation requires visible focus indicators:
- **Inputs:** `focus:ring-2 focus:ring-wm-accent focus:outline-none`
- **Buttons:** `focus:ring-2 focus:ring-offset-2 focus:ring-wm-accent`
- **Links:** `focus:outline-none focus:ring-2 focus:ring-wm-accent focus:ring-offset-2`

### Active States
- **Selected tabs:** Border bottom + background tint
- **Expanded items:** Icon rotation + background change
- **Pressed buttons:** Slight scale down

### Disabled States
- **Buttons:** `disabled:opacity-50 disabled:cursor-not-allowed`
- **Inputs:** `disabled:bg-wm-neutral/20 disabled:cursor-not-allowed`
- **Text:** `text-wm-blue/40`

### Loading States

#### Button Loading
```tsx
<button disabled className="flex items-center gap-2">
  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
  Loading...
</button>
```

#### Card Loading (Skeleton)
```tsx
<div className="animate-pulse space-y-4">
  <div className="h-4 bg-wm-neutral/40 rounded w-3/4"></div>
  <div className="h-4 bg-wm-neutral/40 rounded"></div>
  <div className="h-4 bg-wm-neutral/40 rounded w-5/6"></div>
</div>
```

---

## Animation & Motion

### Animation Principles
1. **Purposeful** - Animations guide attention or provide feedback
2. **Fast** - Keep under 300ms for most interactions
3. **Smooth** - Use CSS transitions over JavaScript when possible
4. **Optional** - Respect `prefers-reduced-motion`

### Built-in Animations

#### Fade In
```css
animation: fade-in 0.3s ease-out forwards;

@keyframes fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
```

#### Fade In Up
```css
animation: fade-in-up 0.5s ease-out forwards;

@keyframes fade-in-up {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Transition Patterns

#### Standard Transition
```tsx
className="transition-colors duration-200"
```

#### Complex Transition
```tsx
className="transition-all duration-300 ease-in-out"
```

#### Transform Transitions
```tsx
className="transform transition-transform duration-300"
```

---

## Iconography

### Icon Library
Custom icon set defined in `src/constants.tsx` using inline SVG components.

### Icon Usage Guidelines

#### Size Standards
- **Small:** `w-4 h-4` (16px)
- **Default:** `w-5 h-5` (20px)
- **Medium:** `w-6 h-6` (24px)
- **Large:** `w-8 h-8` (32px)

#### Color Application
- **Default:** `text-wm-blue`
- **Subdued:** `text-wm-blue/60`
- **Accent:** `text-wm-accent`
- **Error:** `text-wm-pink` or `text-red-600`

#### Common Icons
- **Navigation:** ChevronLeft, ChevronRight, Menu
- **Actions:** Plus, Edit, Trash, Download, Copy
- **Status:** Star, StarSolid, CheckSquare, Square
- **Content:** LightBulb, ClipboardCheck, Document, Building
- **Data:** ChartBar, Trophy

### Icon Implementation
```tsx
import { Icons } from '../constants';

// Usage
<Icons.Star className="w-5 h-5 text-wm-accent" />
```

---

## Accessibility Requirements

### WCAG Compliance
Target: **WCAG 2.1 AA** compliance minimum

### Color Contrast
- **Normal text (14-18px):** Minimum 4.5:1 contrast ratio
- **Large text (18px+ or 14px+ bold):** Minimum 3:1 contrast ratio
- **Interactive elements:** Minimum 3:1 contrast ratio

#### Verified Combinations
✅ Grounded Blue (#000033) on White (#FFFFFF) - 18.43:1  
✅ Accent Blue (#0045FF) on White - 7.27:1  
✅ Accent Pink (#F500A0) on White - 4.86:1  
⚠️ Highlight Yellow (#F2E800) - Use only for non-text elements

### Keyboard Navigation
1. **Tab order:** Logical flow through interactive elements
2. **Focus indicators:** Always visible (ring-2 on focus)
3. **Skip links:** Provide "Skip to main content" for screen readers
4. **Escape key:** Close modals and dropdowns

### Screen Reader Support
- **Semantic HTML:** Use proper heading hierarchy (h1→h2→h3)
- **ARIA labels:** Add `aria-label` for icon-only buttons
- **Alt text:** All images must have descriptive alt text
- **Form labels:** Always associate labels with inputs
- **Status messages:** Use `aria-live` for dynamic updates

### Form Accessibility
```tsx
<label htmlFor="email" className="block text-sm font-bold text-wm-blue mb-1">
  Email Address
</label>
<input
  id="email"
  type="email"
  aria-required="true"
  aria-describedby="email-hint"
  className="..."
/>
<span id="email-hint" className="text-xs text-wm-blue/60">
  We'll never share your email
</span>
```

---

## Responsive Design

### Breakpoints
```javascript
// Tailwind default breakpoints
sm: '640px'   // Mobile landscape, tablet portrait
md: '768px'   // Tablet
lg: '1024px'  // Desktop
xl: '1280px'  // Large desktop
2xl: '1536px' // Extra large desktop
```

### Mobile-First Approach
Design for mobile first, then enhance for larger screens:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Common Responsive Patterns

#### Navigation
- **Mobile:** Hamburger menu, drawer navigation
- **Desktop:** Horizontal navigation bar

#### Sidebar
- **Mobile:** Slide-out drawer, overlay
- **Desktop:** Fixed sidebar (280-320px width)

#### Tables
- **Mobile:** Card view or horizontal scroll
- **Desktop:** Full table layout

#### Forms
- **Mobile:** Full width, single column
- **Desktop:** Multi-column layout where appropriate

### Responsive Spacing
```tsx
<div className="px-4 sm:px-6 md:px-8">  // Adaptive padding
<div className="space-y-4 lg:space-y-6">  // Larger gaps on desktop
```

---

## States & Feedback

### Loading States

#### Page Loading
```tsx
<div className="flex items-center justify-center py-12">
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wm-accent"></div>
</div>
```

#### Inline Loading
```tsx
<div className="flex items-center gap-2 text-wm-blue/60">
  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-wm-accent"></div>
  <span>Loading...</span>
</div>
```

### Empty States
```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Icons.Search className="w-12 h-12 text-wm-blue/30 mb-4" />
  <h3 className="text-lg font-bold text-wm-blue mb-2">No Results Found</h3>
  <p className="text-sm text-wm-blue/60 max-w-sm">
    Try adjusting your search or filters
  </p>
</div>
```

### Error States
```tsx
<div className="bg-wm-pink/10 border-l-4 border-wm-pink text-wm-pink p-4 rounded-r-lg">
  <p className="font-bold">Error</p>
  <p className="text-sm">Something went wrong. Please try again.</p>
</div>
```

### Success States
```tsx
<div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-r-lg">
  <p className="font-bold">Success</p>
  <p className="text-sm">Your changes have been saved.</p>
</div>
```

### Warning States
```tsx
<div className="bg-wm-yellow/10 border-l-4 border-wm-yellow text-wm-blue p-4 rounded-r-lg">
  <p className="font-bold">Warning</p>
  <p className="text-sm">This action cannot be undone.</p>
</div>
```

---

## Data Visualization

### Charts & Graphs
When displaying data:
1. Use accent colors for primary data series
2. Use neutral colors for secondary information
3. Ensure sufficient contrast for readability
4. Provide text alternatives for screen readers

### Score Display
```tsx
<div className="text-center">
  <div className="text-4xl font-bold text-wm-accent">85</div>
  <div className="text-sm text-wm-blue/60">Score</div>
</div>
```

### Progress Bars
```tsx
<div className="w-full bg-wm-neutral/30 rounded-full h-2">
  <div 
    className="bg-wm-accent h-2 rounded-full transition-all duration-300"
    style={{ width: '75%' }}
  />
</div>
```

### Statistics Cards
```tsx
<div className="bg-white border border-wm-neutral/30 rounded-xl p-6">
  <p className="text-wm-blue/60 text-sm font-bold">Total Users</p>
  <p className="text-3xl font-bold text-wm-blue">1,247</p>
  <p className="text-xs text-wm-accent">↑ 12% from last month</p>
</div>
```

---

## Forms & Input Controls

### Form Layout
```tsx
<form className="space-y-5">
  {/* Form fields with consistent spacing */}
</form>
```

### Label Pattern
```tsx
<label htmlFor="field-id" className="block text-sm font-bold text-wm-blue mb-1">
  Field Label
  <span className="ml-1 text-wm-blue/50 font-normal">(Optional)</span>
</label>
```

### Validation States

#### Error State
```tsx
<input
  className="w-full border-red-500 focus:ring-red-500 ..."
  aria-invalid="true"
  aria-describedby="field-error"
/>
<p id="field-error" className="mt-1 text-sm text-red-600">
  This field is required
</p>
```

#### Success State
```tsx
<input
  className="w-full border-green-500 focus:ring-green-500 ..."
/>
<p className="mt-1 text-sm text-green-600">
  ✓ Valid email address
</p>
```

### File Upload
```tsx
<label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-wm-neutral/50 hover:border-wm-accent rounded-lg cursor-pointer bg-wm-neutral/10 hover:bg-wm-neutral/20 transition-all">
  <Icons.Upload />
  <p className="text-sm text-wm-blue/60">Click to upload or drag and drop</p>
  <input type="file" className="hidden" />
</label>
```

### Checkbox & Radio
```tsx
<label className="flex items-center gap-2 cursor-pointer">
  <input type="checkbox" className="w-4 h-4 text-wm-accent rounded focus:ring-2 focus:ring-wm-accent" />
  <span className="text-sm text-wm-blue">Remember me</span>
</label>
```

---

## Navigation Patterns

### Header Navigation
Fixed header at top with shadow on scroll:
```tsx
<header className="bg-wm-blue sticky top-0 z-40 border-b border-wm-neutral/20">
  <nav className="container mx-auto px-4 sm:px-6 md:px-8">
    <div className="flex items-center justify-between h-16">
      {/* Nav content */}
    </div>
  </nav>
</header>
```

### Tab Navigation
```tsx
<div className="flex border-b border-wm-neutral/30">
  <button
    className={`px-6 py-4 font-bold transition-all ${
      activeTab === 'info'
        ? 'text-wm-accent border-b-2 border-wm-accent bg-wm-accent/5'
        : 'text-wm-blue/60 hover:text-wm-blue hover:bg-wm-neutral/10'
    }`}
  >
    Tab Label
  </button>
</div>
```

### Breadcrumbs
```tsx
<nav className="flex items-center space-x-2 text-sm text-wm-blue/60">
  <Link to="/" className="hover:text-wm-accent">Home</Link>
  <Icons.ChevronRight className="w-4 h-4" />
  <Link to="/section" className="hover:text-wm-accent">Section</Link>
  <Icons.ChevronRight className="w-4 h-4" />
  <span className="text-wm-blue font-bold">Current Page</span>
</nav>
```

---

## Content Structure

### Page Layout Template
```tsx
<div className="space-y-6">
  {/* Page Header */}
  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-2xl font-bold text-wm-blue">Page Title</h1>
      <p className="text-wm-blue/60">Page description</p>
    </div>
    <button className="...">Primary Action</button>
  </div>

  {/* Main Content */}
  <div className="bg-white border border-wm-neutral/30 rounded-xl p-6">
    {/* Content */}
  </div>
</div>
```

### Section Headers
```tsx
<div className="mb-4">
  <h2 className="text-xl font-bold text-wm-blue mb-1">Section Title</h2>
  <p className="text-sm text-wm-blue/60">Section description</p>
</div>
```

### List Patterns

#### Simple List
```tsx
<ul className="space-y-2">
  <li className="text-wm-blue">List item</li>
</ul>
```

#### Card List
```tsx
<div className="space-y-3">
  {items.map(item => (
    <div key={item.id} className="bg-white border border-wm-neutral/30 rounded-lg p-4 hover:border-wm-accent/50 transition-colors">
      {/* Card content */}
    </div>
  ))}
</div>
```

---

## Implementation Guidelines

### CSS Architecture

#### Tailwind First
Use Tailwind utility classes for all styling. Avoid custom CSS unless absolutely necessary.

#### Component Composition
Build reusable components that encapsulate styling patterns:
```tsx
// Good
<PrimaryButton onClick={handleClick}>Save</PrimaryButton>

// Avoid
<button className="px-6 py-3 bg-wm-accent..." onClick={handleClick}>Save</button>
```

#### Conditional Classes
Use template literals for dynamic classes:
```tsx
<div className={`base-classes ${isActive ? 'active-classes' : 'inactive-classes'}`}>
```

### Component Guidelines

#### Prop Naming
- **Handlers:** `onAction` (e.g., `onClick`, `onSave`)
- **Booleans:** `isState` or `hasProperty` (e.g., `isOpen`, `hasError`)
- **Display:** `showElement` (e.g., `showHeader`)

#### TypeScript Types
Always define prop interfaces:
```tsx
interface ComponentProps {
  title: string;
  onSave: () => void;
  isLoading?: boolean;
  className?: string;
}
```

### Performance Considerations

#### Image Optimization
- Use appropriate image formats (WebP with fallbacks)
- Lazy load images below the fold
- Provide width/height to prevent layout shift

#### Bundle Size
- Code split large components
- Lazy load routes and heavy dependencies
- Tree-shake unused utilities

#### Rendering
- Memoize expensive computations
- Use React.memo for pure components
- Virtualize long lists

---

## Maintenance & Updates

### Version Control
- Document all design changes in Git commits
- Use semantic versioning for major design system updates
- Maintain a CHANGELOG for design system changes

### Design Tokens
Consider migrating to design tokens for better maintainability:
```javascript
// Future consideration
const tokens = {
  color: {
    primary: '#000033',
    accent: '#0045FF',
    // ...
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    // ...
  }
}
```

### Documentation
- Keep this document updated with new patterns
- Document rationale for major design decisions
- Provide code examples for new components

### Testing
- Visual regression testing with Chromatic or Percy
- Accessibility testing with axe-DevTools
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Responsive testing on real devices

---

## Appendix

### Quick Reference: Common Patterns

#### Action Button Group
```tsx
<div className="flex items-center gap-4">
  <button className="px-6 py-2 bg-wm-accent text-white font-bold rounded-lg hover:bg-wm-accent/90">
    Primary Action
  </button>
  <button className="px-4 py-2 text-wm-blue/60 hover:bg-wm-neutral/20 rounded-lg">
    Cancel
  </button>
</div>
```

#### Info Card with Icon
```tsx
<div className="flex items-start gap-3 p-4 bg-wm-accent/5 border border-wm-accent/30 rounded-lg">
  <Icons.LightBulb className="w-5 h-5 text-wm-accent flex-shrink-0 mt-0.5" />
  <div>
    <p className="text-sm font-bold text-wm-blue">Pro Tip</p>
    <p className="text-sm text-wm-blue/70">Helpful information goes here</p>
  </div>
</div>
```

#### Stat Badge
```tsx
<div className="inline-flex items-center gap-2 px-3 py-1.5 bg-wm-accent/10 rounded-full">
  <span className="text-xs font-bold text-wm-accent">75%</span>
  <span className="text-xs text-wm-blue/60">Complete</span>
</div>
```

---

## Contact & Support

For questions or suggestions about this design system:
- **Technical Issues:** Submit GitHub issue
- **Design Questions:** Contact UX team
- **Component Requests:** Create feature request

---

**Document History:**
- v1.0 (Feb 2, 2026) - Initial comprehensive design requirements document
