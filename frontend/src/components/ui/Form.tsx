/**
 * Form primitives (same look in every modal).
 *
 *   <Field label="Gerrit URL" hint="Without trailing slash" error={errors.url}>
 *     <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://review.opendev.org" />
 *   </Field>
 *   <Field label="Channel"><Input leading="#" value={channel} onChange={...} /></Field>
 *   <Field label="Sort by"><Select value={v} onChange={...}><option value="a">A</option></Select></Field>
 *   <Field label="Query"><Textarea rows={3} className="font-mono" /></Field>
 *   <Checkbox label="Show title" description="Display the bug title" checked={c} onChange={...} />
 *
 * Field wires id / aria-describedby / aria-invalid into its Input/Textarea/Select child
 * automatically (via context); pass `id` to Field (or the control) to override.
 */
import { createContext, useContext, useId, type AriaAttributes, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Icon } from './Icon';

interface FieldCtx {
  id: string;
  describedBy?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldCtx | null>(null);

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Id of the control (auto-generated otherwise). */
  id?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, id, required, className, children }: FieldProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <FieldContext.Provider value={{ id: controlId, describedBy, invalid: !!error }}>
      <div className={cx('flex flex-col gap-1', className)}>
        <Label htmlFor={controlId}>
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </Label>
        {children}
        {hint && !error && (
          <p id={hintId} className="text-[11px] text-fg-3">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-[11px] text-danger">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

export function Label({ className, ...rest }: ComponentPropsWithRef<'label'>) {
  return <label className={cx('text-xs font-medium text-fg-2', className)} {...rest} />;
}

/** Props a control inherits from the surrounding Field. */
function useFieldProps(id?: string, describedBy?: string, invalid?: AriaAttributes['aria-invalid']) {
  const ctx = useContext(FieldContext);
  return {
    id: id ?? ctx?.id,
    'aria-describedby': describedBy ?? ctx?.describedBy,
    'aria-invalid': invalid ?? (ctx?.invalid || undefined),
  };
}

const CONTROL =
  'w-full rounded-md border border-line bg-surface-2 text-[13px] text-fg placeholder:text-fg-3 ' +
  'hover:border-line-strong focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ' +
  'aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:opacity-50';

export interface InputProps extends ComponentPropsWithRef<'input'> {
  /** Non-editable prefix inside the box, e.g. "#" for IRC channels. */
  leading?: ReactNode;
}

export function Input({ leading, className, id, 'aria-describedby': db, 'aria-invalid': inv, ...rest }: InputProps) {
  const fieldProps = useFieldProps(id, db, inv);
  if (leading == null) {
    return <input className={cx(CONTROL, 'h-8 px-2.5', className)} {...fieldProps} {...rest} />;
  }
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[13px] text-fg-3">
        {leading}
      </span>
      <input className={cx(CONTROL, 'h-8 pl-6 pr-2.5', className)} {...fieldProps} {...rest} />
    </div>
  );
}

export function Textarea({ className, id, 'aria-describedby': db, 'aria-invalid': inv, ...rest }: ComponentPropsWithRef<'textarea'>) {
  const fieldProps = useFieldProps(id, db, inv);
  return <textarea className={cx(CONTROL, 'min-h-16 px-2.5 py-1.5 leading-5', className)} {...fieldProps} {...rest} />;
}

export function Select({ className, id, 'aria-describedby': db, 'aria-invalid': inv, children, ...rest }: ComponentPropsWithRef<'select'>) {
  const fieldProps = useFieldProps(id, db, inv);
  return (
    <div className="relative">
      <select className={cx(CONTROL, 'h-8 appearance-none pl-2.5 pr-8', className)} {...fieldProps} {...rest}>
        {children}
      </select>
      <Icon
        name="chevron-down"
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-3"
      />
    </div>
  );
}

export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
  label: ReactNode;
  description?: ReactNode;
}

export function Checkbox({ label, description, className, disabled, ...rest }: CheckboxProps) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-start gap-2 text-[13px] text-fg',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input type="checkbox" disabled={disabled} className="mt-0.5 size-3.5 shrink-0 accent-accent" {...rest} />
      <span className="min-w-0">
        {label}
        {description && <span className="block text-[11px] text-fg-3">{description}</span>}
      </span>
    </label>
  );
}
