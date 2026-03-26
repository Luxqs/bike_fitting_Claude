import React, { useId } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FieldOption {
  value: string;
  label: string;
  description?: string;
}

export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'number' | 'email' | 'select' | 'textarea' | 'radio';
  value?: string | number;
  onChange?: (value: string) => void;
  options?: FieldOption[];
  error?: string | null;
  hint?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// ─── Shared style tokens ──────────────────────────────────────────────────────

const INPUT_BASE =
  'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 ' +
  'placeholder-gray-400 transition-colors duration-150 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ' +
  'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed';

const INPUT_NORMAL = 'border-gray-300 hover:border-gray-400';
const INPUT_ERROR  = 'border-red-400 focus:border-red-500 focus:ring-red-500';

function inputClasses(hasError: boolean): string {
  return `${INPUT_BASE} ${hasError ? INPUT_ERROR : INPUT_NORMAL}`;
}

// ─── Sub-renderers ────────────────────────────────────────────────────────────

function TextInput({
  id,
  name,
  type,
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
  disabled,
  hasError,
  required,
}: {
  id: string;
  name: string;
  type: 'text' | 'number' | 'email';
  value?: string | number;
  onChange?: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  hasError: boolean;
  required?: boolean;
}): React.JSX.Element {
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={inputClasses(hasError)}
      aria-invalid={hasError}
    />
  );
}

function SelectInput({
  id,
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  hasError,
  required,
}: {
  id: string;
  name: string;
  value?: string | number;
  onChange?: (value: string) => void;
  options: FieldOption[];
  placeholder?: string;
  disabled?: boolean;
  hasError: boolean;
  required?: boolean;
}): React.JSX.Element {
  return (
    <select
      id={id}
      name={name}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      required={required}
      className={`${inputClasses(hasError)} pr-8 appearance-none bg-no-repeat`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%236b7280' d='M6 8L0 0h12z'/%3E%3C/svg%3E\")",
        backgroundPosition: 'right 12px center',
        backgroundSize: '10px',
      }}
      aria-invalid={hasError}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function TextareaInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  disabled,
  hasError,
  required,
}: {
  id: string;
  name: string;
  value?: string | number;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError: boolean;
  required?: boolean;
}): React.JSX.Element {
  return (
    <textarea
      id={id}
      name={name}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      rows={4}
      className={`${inputClasses(hasError)} resize-y`}
      aria-invalid={hasError}
    />
  );
}

function RadioGroup({
  id,
  name,
  value,
  onChange,
  options,
  disabled,
  hasError,
  required,
}: {
  id: string;
  name: string;
  value?: string | number;
  onChange?: (value: string) => void;
  options: FieldOption[];
  disabled?: boolean;
  hasError: boolean;
  required?: boolean;
}): React.JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-labelledby={`${id}-label`}
      className="grid grid-cols-1 sm:grid-cols-2 gap-2"
    >
      {options.map((opt) => {
        const isSelected = String(value) === opt.value;
        return (
          <label
            key={opt.value}
            className={[
              'flex flex-col gap-0.5 rounded-lg border-2 px-3 py-2.5 cursor-pointer ',
              'transition-colors duration-150 select-none text-sm',
              isSelected
                ? 'border-brand-600 bg-brand-50 text-brand-900'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
              disabled ? 'opacity-50 cursor-not-allowed' : '',
              hasError && !isSelected ? 'border-red-200' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={isSelected}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={disabled}
                required={required}
                className="sr-only"
                aria-describedby={opt.description ? `${id}-${opt.value}-desc` : undefined}
              />
              <span
                className={[
                  'w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center',
                  isSelected ? 'border-brand-600' : 'border-gray-400',
                ].join(' ')}
              >
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-brand-600" />
                )}
              </span>
              <span className="font-medium">{opt.label}</span>
            </span>
            {opt.description && (
              <span
                id={`${id}-${opt.value}-desc`}
                className={`text-xs pl-6 ${isSelected ? 'text-brand-700' : 'text-gray-500'}`}
              >
                {opt.description}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  options = [],
  error,
  hint,
  required,
  min,
  max,
  step,
  placeholder,
  disabled,
  className = '',
}: FormFieldProps): React.JSX.Element {
  const uid = useId();
  const id = `${uid}-${name}`;
  const hasError = !!error;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Label — hidden for radio (the radiogroup already handles labelling) */}
      <label
        htmlFor={type === 'radio' ? undefined : id}
        id={type === 'radio' ? `${id}-label` : undefined}
        className="text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span className="ml-1 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {/* Input */}
      {type === 'select' ? (
        <SelectInput
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          options={options}
          placeholder={placeholder}
          disabled={disabled}
          hasError={hasError}
          required={required}
        />
      ) : type === 'textarea' ? (
        <TextareaInput
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          hasError={hasError}
          required={required}
        />
      ) : type === 'radio' ? (
        <RadioGroup
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          options={options}
          disabled={disabled}
          hasError={hasError}
          required={required}
        />
      ) : (
        <TextInput
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          hasError={hasError}
          required={required}
        />
      )}

      {/* Hint */}
      {hint && !error && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}

      {/* Error */}
      {error && (
        <p role="alert" className="text-xs text-red-600 flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

export default FormField;
