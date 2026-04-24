---
description: React Hook Form with Zod and shadcn/ui form patterns for type-safe form handling
trigger: glob
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
---

# Form Patterns

This rule defines conventions for building forms with React Hook Form, Zod validation, and shadcn/ui Form components, because consistent form patterns prevent validation gaps, accessibility issues, and state management bugs.

## Rule Priorities

| Priority | Category | Impact |
|----------|-------------------------------|--------|
| P0 | Zod resolver integration | Prevents runtime type errors and validation bypasses |
| P0 | Form state handling | Prevents double submissions and data loss |
| P1 | shadcn/ui Form components | Ensures accessible labels, errors, and descriptions |
| P1 | Server action validation | Prevents accepting unvalidated data on the server |
| P2 | Field arrays | Enables dynamic repeating field groups |
| P2 | Multi-step forms | Enables complex wizard-style workflows |

## React Hook Form with Zod Resolver

Always use `zodResolver` with a Zod schema, because it provides compile-time type safety and runtime validation in a single source of truth.

```tsx
// Good - Zod schema drives both types and validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'user', 'editor']),
});

type CreateUserInput = z.infer<typeof createUserSchema>;

function CreateUserForm() {
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: '', email: '', role: 'user' },
    mode: 'onBlur',
  });

  const onSubmit = async (data: CreateUserInput) => {
    await api.users.create(data);
  };

  return <Form {...form}>...</Form>;
}

// Bad - manual validation is error-prone and duplicates type definitions
function CreateUserForm() {
  const { register, handleSubmit } = useForm();
  const onSubmit = (data: any) => {
    if (!data.name || data.name.length < 2) { /* manual checks */ }
    api.users.create(data);
  };
}
```

## shadcn/ui Form Component Pattern

Use the shadcn/ui `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>` components, because they wire up accessibility attributes (aria-describedby, aria-invalid) automatically.

```tsx
// Good - shadcn/ui Form provides accessible, consistent field rendering
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

function ProfileForm() {
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: '', bio: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Form>
  );
}
```

## Field Arrays with useFieldArray

Use `useFieldArray` for dynamic repeating field groups, because manual array state management with `useState` causes re-render storms and loses React Hook Form's optimization.

```tsx
// Good - useFieldArray manages dynamic list fields efficiently
const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: 'items',
});

return (
  <div>
    {fields.map((field, index) => (
      <div key={field.id}>
        <FormField control={form.control} name={`items.${index}.productId`}
          render={({ field }) => (
            <FormItem>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button variant="destructive" onClick={() => remove(index)}>Remove</Button>
      </div>
    ))}
    <Button onClick={() => append({ productId: '', quantity: 1 })}>Add Item</Button>
  </div>
);
```

## Form State Management

Leverage `formState` properties for UX feedback, because they prevent double-submissions and communicate form status.

```tsx
// Good - use formState to control submit button and show dirty indicator
const { formState: { isSubmitting, isDirty, isValid } } = form;

<Button type="submit" disabled={isSubmitting || !isDirty}>
  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Save Changes'}
</Button>
```

## Server Actions with Form Validation

Validate in both client and server, because client validation can be bypassed and server-only validation causes poor UX.

```tsx
// Good - validate with same Zod schema on both client and server
// lib/schemas/user.ts (shared)
export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50),
  bio: z.string().max(500).optional(),
});

// app/actions/profile.ts (server action)
'use server';
import { updateProfileSchema } from '@/lib/schemas/user';

export async function updateProfile(formData: FormData) {
  const parsed = updateProfileSchema.safeParse({
    displayName: formData.get('displayName'),
    bio: formData.get('bio'),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  await prisma.user.update({ where: { id: userId }, data: parsed.data });
  return { success: true };
}

// Bad - trusting client-side validation only
'use server';
export async function updateProfile(data: { displayName: string }) {
  await prisma.user.update({ where: { id: userId }, data });
}
```

## Multi-Step Form Pattern

Use Zustand or React context to persist form state across steps, because unmounting a step loses React Hook Form state by default.

```tsx
// Good - persist multi-step form data in Zustand store
import { create } from 'zustand';

interface FormStore {
  stepData: Record<string, unknown>;
  setStepData: (step: string, data: unknown) => void;
}

const useFormStore = create<FormStore>((set) => ({
  stepData: {},
  setStepData: (step, data) =>
    set((s) => ({ stepData: { ...s.stepData, [step]: data } })),
}));

function StepOne({ onNext }: { onNext: () => void }) {
  const { setStepData, stepData } = useFormStore();
  const form = useForm({
    resolver: zodResolver(stepOneSchema),
    defaultValues: (stepData.one as StepOneInput) ?? { name: '' },
  });
  const onSubmit = (data: StepOneInput) => {
    setStepData('one', data);
    onNext();
  };
  return <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)}>...</form></Form>;
}
```

## Gotchas

1. **defaultValues must be stable**: Pass `defaultValues` as a static object or memoized value, not an inline object literal that creates a new reference each render -- otherwise React Hook Form resets the form on every parent re-render.

2. **mode: 'onChange' performance**: Using `mode: 'onChange'` with complex Zod schemas runs validation on every keystroke. Prefer `mode: 'onBlur'` or `mode: 'onTouched'`, because Zod parsing is synchronous and blocks the main thread.

3. **FormField key prop**: When rendering `useFieldArray` fields, always use `field.id` as the key (not the array index), because index-based keys cause React to confuse field identity when items are reordered or removed.

4. **Server action FormData types**: `formData.get()` returns `FormDataEntryValue | null`, not `string`. Always convert and validate with Zod before using -- otherwise you may pass `File` objects or `null` to your database queries.

5. **reset() after successful submit**: Call `form.reset()` after successful mutation to clear `isDirty` state -- otherwise the unsaved-changes warning persists even after saving.
