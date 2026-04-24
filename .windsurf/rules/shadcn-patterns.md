---
description: shadcn/ui component patterns with Radix primitives, cva variants, form integration, accessibility, and data table conventions
trigger: glob
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
---

# shadcn/ui Component Patterns & Accessibility

This rule enforces shadcn/ui usage patterns, Radix UI accessibility requirements, class-variance-authority (cva) conventions, form integration with React Hook Form, and data display patterns with TanStack Table.

## Rule Priorities

| Priority | Category | Impact |
|----------|----------|--------|
| P0 | Never modify node_modules components | Prevents lost changes on install, because npm install overwrites node_modules entirely |
| P0 | Radix accessibility primitives | Ensures keyboard navigation and screen reader support, to prevent WCAG violations |
| P1 | cva variant patterns | Maintains type-safe, composable component variants, because ad-hoc conditional classes become unmaintainable at scale |
| P1 | Form integration with React Hook Form | Ensures validation, error display, and submission work consistently, to prevent silent form failures |
| P2 | CSS variable theming | Enables runtime theme switching without rebuilds, because CSS variables update live in the browser |
| P2 | Toast/notification patterns | Provides consistent user feedback, to prevent silent failures that leave users confused |

## NEVER Modify node_modules

shadcn/ui components are copied into `components/ui/`. NEVER edit files inside `node_modules/` because they are overwritten on every `npm install`. To customize a Radix primitive, wrap or extend the copied component in `components/ui/`.

```tsx
// Good: Extend the local copy in components/ui/
import { Button as BaseButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function IconButton({ icon, children, className, ...props }: IconButtonProps) {
  return (
    <BaseButton className={cn("gap-2", className)} {...props}>
      {icon}
      {children}
    </BaseButton>
  );
}

// Bad: Editing node_modules directly - lost on next install
// node_modules/@radix-ui/react-dialog/dist/index.mjs  <-- NEVER DO THIS
```

## class-variance-authority (cva) Variant Patterns

Define component variants using `cva` from `class-variance-authority`, because it provides type-safe variant props and integrates cleanly with `cn()` for consumer overrides. Always include a `defaultVariants` block.

```tsx
// Good: Type-safe variants with cva
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// Bad: Manual conditional classes without type safety
function Badge({ variant, className }: { variant: string; className?: string }) {
  return (
    <div className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      variant === "destructive" ? "bg-red-500 text-white" : "bg-gray-100"
    } ${className}`} />
  );
}
```

## CSS Variable Theming

Define theme tokens as CSS custom properties in `globals.css` and reference them via Tailwind's semantic classes, because CSS variables enable runtime theme switching without a rebuild.

```css
/* Good: globals.css with HSL CSS variables */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
  }
}
```

## Radix UI Accessibility Patterns

All shadcn/ui components are built on Radix primitives that provide focus management, keyboard navigation, and ARIA attributes. Preserve these behaviors by using the component composition API correctly.

### Dialog, Sheet, Popover

Always include `DialogTitle` (even if visually hidden) because screen readers need it. Use `DialogDescription` for context.

```tsx
// Good: Accessible dialog with all required elements
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";

function ConfirmDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your account.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Bad: Missing DialogTitle - screen readers cannot announce the dialog
<Dialog>
  <DialogTrigger>Delete</DialogTrigger>
  <DialogContent>
    <p>Are you sure?</p>
    <button onClick={handleDelete}>Yes</button>
  </DialogContent>
</Dialog>
```

## Form Integration with React Hook Form

Use shadcn/ui's `<Form>` components built on React Hook Form with Zod validation, because this combination provides type-safe validation, accessible error messages, and consistent field rendering.

```tsx
// Good: Full shadcn Form integration with Zod + React Hook Form
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form, FormControl, FormDescription,
  FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: "", email: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} />
              </FormControl>
              <FormDescription>Your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}
```

## Command Palette (cmdk) Patterns

Use the shadcn `<Command>` component (built on `cmdk`) for searchable command menus. Always include `CommandEmpty` for empty states, to prevent users seeing a blank dropdown with no feedback.

```tsx
// Good: Full command palette with groups and empty state
import {
  CommandDialog, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";

function CommandMenu() {
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => router.push("/dashboard")}>
            <LayoutDashboard className="me-2 h-4 w-4" />
            Dashboard
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

## Toast / Sonner Notification Patterns

Use Sonner (`sonner`) via the shadcn `<Toaster>` component for notifications. Place `<Toaster>` once in the root layout. Use specific toast types (`toast.success`, `toast.error`) instead of generic `toast()`, because typed toasts convey semantic meaning to screen readers.

```tsx
// Good: Typed toast calls with action support
import { toast } from "sonner";

async function handleDelete(id: string) {
  try {
    await deleteItem(id);
    toast.success("Item deleted", {
      description: "The item has been permanently removed.",
      action: { label: "Undo", onClick: () => restoreItem(id) },
    });
  } catch {
    toast.error("Failed to delete", {
      description: "Please try again or contact support.",
    });
  }
}
```

## Data Table with TanStack Table

Use shadcn's `<DataTable>` pattern with `@tanstack/react-table` for sortable, filterable, paginated tables. Define columns with `ColumnDef` for type safety.

```tsx
// Good: Type-safe columns with TanStack Table
import { ColumnDef } from "@tanstack/react-table";

export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.getValue("status") === "paid" ? "default" : "destructive"}>
        {row.getValue("status")}
      </Badge>
    ),
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        Amount <ArrowUpDown className="ms-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD",
    }).format(row.getValue("amount")),
  },
];
```

## Gotchas

1. **`asChild` prop changes rendering behavior entirely**. When using `asChild` on a shadcn trigger, the trigger renders its child instead of a default button. Forgetting `asChild` creates a nested button-inside-button, which is invalid HTML and breaks accessibility.

2. **Radix portals render outside the DOM tree**. Dialog, Popover, and DropdownMenu content portals to `document.body` by default. Tailwind classes that depend on parent selectors (like `group-hover:`) will not work across the portal boundary.

3. **shadcn CLI overwrites existing files**. Running `npx shadcn@latest add button` when `components/ui/button.tsx` already has customizations will overwrite them. Always use version control and diff after adding new components.

4. **Form field `name` must match Zod schema keys exactly**. A mismatch between `<FormField name="userName">` and `z.object({ username: ... })` silently fails validation, because React Hook Form cannot map the field to the schema.

5. **CSS variable HSL values must omit the `hsl()` wrapper**. shadcn expects raw HSL values like `222.2 84% 4.9%` in CSS variables, not `hsl(222.2 84% 4.9%)`. Including the wrapper doubles it to `hsl(hsl(...))` which is invalid CSS.
