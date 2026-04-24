---
description: Accessibility (a11y) requirements for inclusive web applications
trigger: glob
globs: ["**/*.tsx", "**/*.jsx", "**/*.html"]
---

# Accessibility (A11y) Standards

## Rule Priorities

| Priority | Category | Impact |
|----------|----------|--------|
| 1 | Semantic HTML | CRITICAL |
| 2 | Keyboard Navigation | CRITICAL |
| 3 | Form Accessibility & Labels | HIGH |
| 4 | Color Contrast (WCAG AA) | HIGH |
| 5 | ARIA Labels & Live Regions | MEDIUM |
| 6 | Image Alt Text | MEDIUM |
| 7 | Modal / Dialog Focus Management | MEDIUM |
| 8 | Skip Navigation | LOW |
| 9 | Reduced Motion | LOW |

## WCAG Guidelines

Follow WCAG 2.1 Level AA as minimum standard.

## Semantic HTML

```tsx
// ✅ Good - semantic elements
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h1>Page Title</h1>
    <section aria-labelledby="section-heading">
      <h2 id="section-heading">Section</h2>
    </section>
  </article>
</main>
<footer>...</footer>

// ❌ Bad - div soup
<div class="header">
  <div class="nav">
    <div class="link">Home</div>
  </div>
</div>
```

## Keyboard Navigation

- All interactive elements must be keyboard accessible
- Visible focus indicators required
- Logical tab order

```tsx
// ✅ Good - keyboard accessible
<button
  onClick={handleClick}
  onKeyDown={(e) => e.key === "Enter" && handleClick()}
  className="focus-visible:ring-2 focus-visible:ring-blue-500"
>
  Click me
</button>
```

## ARIA Labels

```tsx
// ✅ Good - descriptive labels
<button aria-label="Close dialog">
  <XIcon />
</button>

<input
  type="search"
  aria-label="Search products"
  aria-describedby="search-hint"
/>
<span id="search-hint">Enter product name or SKU</span>

// ❌ Bad - no accessible name
<button><XIcon /></button>
```

## Form Accessibility

```tsx
// ✅ Good - accessible form
<form>
  <div>
    <label htmlFor="email">Email address</label>
    <input
      id="email"
      type="email"
      aria-required="true"
      aria-invalid={!!errors.email}
      aria-describedby={errors.email ? "email-error" : undefined}
    />
    {errors.email && (
      <span id="email-error" role="alert">
        {errors.email}
      </span>
    )}
  </div>
</form>
```

## Color Contrast

- Text: minimum 4.5:1 contrast ratio
- Large text (18px+): minimum 3:1
- UI components: minimum 3:1

```tsx
// ✅ Good - sufficient contrast
<p className="text-gray-700 bg-white">Readable text</p>

// ❌ Bad - low contrast
<p className="text-gray-400 bg-gray-200">Hard to read</p>
```

## Images

```tsx
// ✅ Good - meaningful alt text
<img src="chart.png" alt="Sales increased 25% in Q4 2025" />

// ✅ Good - decorative image
<img src="decoration.png" alt="" role="presentation" />

// ❌ Bad - missing or useless alt
<img src="chart.png" />
<img src="chart.png" alt="image" />
```

## Screen Reader Testing

- Test with VoiceOver (Mac), NVDA (Windows)
- Ensure logical reading order
- Announce dynamic content changes

```tsx
// ✅ Good - announce updates
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

## Gotchas

- **`aria-label` on a `<div>` does nothing** — ARIA roles only work on interactive or landmark elements. A `<div>` with `aria-label` is not announced by screen readers unless it has a role (`role="region"`, `role="dialog"`, etc.).
- **Placeholder text is not a label** — placeholders disappear on input, have low contrast, and are not reliably read by all screen readers. Always use a visible `<label>`.
- **`onClick` on non-interactive elements** — adding `onClick` to a `<div>` or `<span>` makes it mouse-clickable but not keyboard-accessible. Use `<button>` or add `role="button"` + `tabIndex={0}` + `onKeyDown` handler.
- **Focus trapped inside modals leaks to background** — without explicit focus management, tab will reach content behind the overlay. Use the native `<dialog>` element or a library (Radix, Angular CDK).
- **`aria-hidden="true"` on focusable elements** — this hides the element from screen readers but keyboard users can still focus it, causing a confusing "invisible" focus. Remove focus or remove `aria-hidden`.

## Form Validation Timing

Validation timing significantly impacts usability — show errors at the right moment:

```tsx
// ✅ Good - validate onBlur for new fields (not while typing)
// ✅ Good - validate onInput once an error is already shown (instant correction feedback)
function EmailField() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  function validate(val: string) {
    if (!val) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Enter a valid email";
    return "";
  }

  return (
    <div>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (touched) setError(validate(e.target.value)); // live correction once touched
        }}
        onBlur={() => {
          setTouched(true);
          setError(validate(value)); // first error shown on blur
        }}
        aria-invalid={!!error}
        aria-describedby={error ? "email-error" : undefined}
      />
      {error && (
        <span id="email-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
```

**Rules:**

- First validation: `onBlur` (after user leaves the field) — never `onInput` before they finish typing
- Subsequent validation: `onInput` (live) — once an error is shown, correct it in real time
- Submit validation: always validate all fields on form submit regardless of touch state

## Skip Navigation (WCAG 2.4.1)

Provide a skip link as the first focusable element on every page:

```tsx
// ✅ Required - skip to main content
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:p-2 focus:bg-white focus:rounded"
>
  Skip to main content
</a>
<main id="main-content">...</main>
```

## Modal / Dialog Accessibility

Modals must trap focus and restore it on close:

```tsx
// ✅ Good - React: accessible dialog
<dialog
  ref={dialogRef}
  aria-modal="true"
  aria-labelledby="dialog-title"
  onClose={onClose}
>
  <h2 id="dialog-title">Confirm Action</h2>
  <button autoFocus onClick={onConfirm}>
    Confirm
  </button>
  <button onClick={onClose}>Cancel</button>
</dialog>
```

- Use the native `<dialog>` element or a library like Radix UI `Dialog` / Angular CDK `Dialog`
- Return focus to the trigger element when the modal closes
- `Escape` key must close the dialog

## Reduced Motion

Respect users who have motion sensitivity:

```tsx
// ✅ Good - respect prefers-reduced-motion
<div className="transition-transform duration-300 motion-reduce:transition-none">
  {content}
</div>
```

```css
/* CSS fallback */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## shadcn/ui + Radix UI Accessibility Patterns

> Stack-enhancement by /project-init -- Stack: shadcn/ui -- Remove if stack changes

### Focus Management in Radix Dialogs
Radix UI Dialog automatically traps focus and returns it on close. Do not override this behavior. Always include `DialogTitle` for screen readers:

```tsx
// Good - Radix manages focus trap automatically
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Settings</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogTitle>Settings</DialogTitle>
    <DialogDescription>Manage your preferences.</DialogDescription>
    <Input autoFocus placeholder="Search settings..." />
  </DialogContent>
</Dialog>
```

### Keyboard Navigation in shadcn Components
All shadcn/ui components inherit Radix keyboard patterns:
- **Dialog**: `Escape` closes, `Tab` cycles focus within
- **DropdownMenu**: Arrow keys navigate items, `Enter`/`Space` selects
- **Select**: Arrow keys navigate options, type-ahead search works
- **Tabs**: Arrow keys switch tabs, `Tab` moves to tab content

### ARIA Attributes on shadcn Form Fields
shadcn `<FormField>` auto-wires `aria-invalid` and `aria-describedby`. Do not add them manually, because double-binding creates invalid ARIA references.
