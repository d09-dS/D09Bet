---
description: Tailwind CSS standards with mobile-first responsive design, dark mode, cn() utility patterns, and shadcn/ui integration
trigger: glob
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
---

# Tailwind CSS Standards & Conventions

This rule enforces consistent Tailwind CSS usage, class ordering, responsive patterns, dark mode strategy, and integration with shadcn/ui components across the project.

## Rule Priorities

| Priority | Category | Impact |
|----------|----------|--------|
| P0 | Mobile-first responsive design | Prevents desktop-only layouts that break on phones, because min-width breakpoints cascade correctly while max-width creates override chains |
| P0 | Design token usage over arbitrary values | Maintains visual consistency across the app, to prevent one-off pixel values that drift from the design system |
| P1 | cn() utility for conditional classes | Prevents class conflicts and ensures twMerge resolves Tailwind specificity correctly, otherwise conflicting utilities produce unpredictable results |
| P1 | Dark mode with class strategy | Enables user-controlled theming via CSS variables, because media-query dark mode cannot be toggled programmatically |
| P2 | Class ordering conventions | Improves readability and diff quality, because consistent ordering makes PR reviews faster |
| P2 | Logical CSS properties for i18n | Supports RTL layouts without separate stylesheets, to prevent broken layouts for Arabic/Hebrew users |

## Class Ordering Convention

Follow this ordering for Tailwind classes: layout, positioning, sizing, spacing, typography, visual, interactive, responsive/state modifiers. This ordering reads as "what it is, where it is, how big, how spaced, what it says, how it looks."

```tsx
// Good: Consistent ordering - layout, size, spacing, typography, visual, state
<div className="flex items-center gap-4 w-full p-4 text-sm font-medium text-foreground bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
  {children}
</div>

// Bad: Random ordering makes scanning and diffing difficult
<div className="shadow-sm text-sm hover:shadow-md border flex p-4 bg-card rounded-lg font-medium w-full items-center gap-4 text-foreground transition-shadow">
  {children}
</div>
```

## Mobile-First Responsive Design

Always design for mobile first, then layer on larger breakpoints with `sm:`, `md:`, `lg:`, `xl:`, `2xl:`. Never use arbitrary max-width media queries, because Tailwind's mobile-first system cascades upward cleanly.

```tsx
// Good: Mobile-first - single column stacks, grid at md+
<section className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:gap-6">
  <Card className="col-span-1 md:col-span-2 lg:col-span-1" />
</section>

// Bad: Desktop-first forces overrides at every smaller breakpoint
<section className="grid grid-cols-3 gap-6 p-6 sm:grid-cols-1 sm:gap-4 sm:p-4 md:grid-cols-2">
  <Card />
</section>
```

## Dark Mode with CSS Variables

Use the `class` strategy for dark mode. Define colors via CSS custom properties in your global CSS so shadcn/ui theming works consistently. Reference semantic tokens (`text-foreground`, `bg-background`) instead of raw Tailwind colors, because semantic tokens automatically adapt to light/dark mode.

```tsx
// Good: Semantic tokens that auto-adapt to theme
<div className="bg-background text-foreground border-border">
  <h2 className="text-primary">Dashboard</h2>
  <p className="text-muted-foreground">Welcome back</p>
</div>

// Bad: Hard-coded colors that need manual dark: overrides everywhere
<div className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
  <h2 className="text-blue-600 dark:text-blue-400">Dashboard</h2>
</div>
```

## cn() Utility for Conditional Classes

Always use the `cn()` utility (built from `clsx` + `tailwind-merge`) for conditional and composed class names, because `tailwind-merge` correctly resolves conflicting utilities (e.g., `p-2` vs `p-4`) while `clsx` handles boolean toggling.

```tsx
// Good: cn() resolves conflicts and handles conditionals
import { cn } from "@/lib/utils";

interface CardProps {
  className?: string;
  isActive?: boolean;
  variant?: "default" | "destructive";
}

function Card({ className, isActive, variant = "default" }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        variant === "destructive" && "border-destructive bg-destructive/10",
        isActive && "ring-2 ring-primary",
        className
      )}
    />
  );
}

// Bad: Template literals cannot resolve Tailwind conflicts
function Card({ className, isActive }: CardProps) {
  return (
    <div className={`rounded-lg border p-4 ${isActive ? "ring-2 ring-primary" : ""} ${className}`} />
  );
}
```

## Avoid @apply (Except in Global Styles)

Do not use `@apply` in component-level styles, because it defeats Tailwind's utility-first model and creates hidden coupling between classes. The only acceptable use is in `globals.css` for base element resets.

```css
/* Good: @apply only in globals.css for base resets */
@layer base {
  body {
    @apply bg-background text-foreground;
  }
}
```

## Design Tokens Over Arbitrary Values

Use Tailwind's spacing, color, and typography scales instead of arbitrary values (`[13px]`, `[#1a2b3c]`), because arbitrary values bypass the design system and create visual inconsistency. Extend the theme in `tailwind.config.ts` when the scale genuinely needs a new value.

```tsx
// Good: Uses design system tokens
<div className="mt-4 p-6 text-sm rounded-lg max-w-2xl">
  <span className="text-muted-foreground">Subtitle</span>
</div>

// Bad: Arbitrary values bypass the design system
<div className="mt-[13px] p-[22px] text-[13.5px] rounded-[7px] max-w-[543px]">
  <span className="text-[#6b7280]">Subtitle</span>
</div>
```

## Logical CSS Properties for RTL Support

Use Tailwind's logical property utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) instead of physical `ml-*`/`mr-*`/`pl-*`/`pr-*`, to prevent broken layouts when the app supports RTL languages.

```tsx
// Good: Logical properties adapt to text direction
<div className="flex items-center gap-2">
  <Icon className="me-2" />
  <span className="ps-4 text-start">Label</span>
</div>

// Bad: Physical properties break in RTL
<div className="flex items-center gap-2">
  <Icon className="mr-2" />
  <span className="pl-4 text-left">Label</span>
</div>
```

## Animation Utilities & Motion Preference

Always pair animations with `motion-reduce:` variants, because users with vestibular disorders set `prefers-reduced-motion` and ignoring it causes accessibility violations.

```tsx
// Good: Respects motion preference
<div className="animate-fade-in motion-reduce:animate-none">
  <Spinner className="animate-spin motion-reduce:animate-none" />
</div>

// Bad: Forced animation with no escape
<div className="animate-fade-in">
  <Spinner className="animate-spin" />
</div>
```

## Group and Peer Modifiers

Use `group` and `peer` modifiers for parent/sibling-driven styling instead of JavaScript state, because CSS-only solutions are faster and don't trigger React re-renders.

```tsx
// Good: CSS-only hover state propagation
<div className="group rounded-lg border p-4 transition-colors hover:bg-accent">
  <h3 className="font-medium group-hover:text-accent-foreground">Title</h3>
  <p className="text-muted-foreground group-hover:text-accent-foreground/80">Description</p>
</div>

// Good: Peer modifier for form validation styling
<div>
  <input className="peer" type="email" required />
  <p className="hidden text-sm text-destructive peer-invalid:block">Invalid email address</p>
</div>
```

## Gotchas

1. **`tailwind-merge` only resolves conflicts it recognizes**. Custom utilities defined with plugins may not be handled. Register custom class groups in the `twMerge` config, otherwise `cn("custom-padding-sm", "custom-padding-lg")` keeps both classes.

2. **Tailwind v4 uses CSS-first configuration**. If migrating from v3, `tailwind.config.ts` is replaced by `@theme` directives in CSS. Check which version the project uses before adding config, because v3 config syntax does not work in v4.

3. **`dark:` variants only work with the correct strategy**. With `class` strategy, the `dark` class must be on an ancestor element (usually `<html>`). Forgetting to set this up means every `dark:` utility is silently ignored.

4. **Arbitrary value brackets break with spaces**. Use underscores for spaces in arbitrary values: `bg-[url('/img/hero.png')]` works but `bg-[url('/img/ hero.png')]` does not, because Tailwind splits on whitespace.

5. **Container queries (`@container`) require explicit container context**. Add `@container` to the parent element before using `@sm:`, `@md:` etc. on children, otherwise the container query utilities have no effect.
