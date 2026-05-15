'use client';

import { useState, FormEvent } from 'react';
import { Bell, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FormState {
  keyword: string;
  minYear: string;
  maxPrice: string;
  maxMileage: string;
}

const INITIAL_STATE: FormState = {
  keyword: '',
  minYear: '',
  maxPrice: '',
  maxMileage: '',
};

interface CreateAlertFormProps {
  onCreated?: () => void;
}

export default function CreateAlertForm({ onCreated }: CreateAlertFormProps = {}) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    const payload: Record<string, string | number> = {};
    if (form.keyword.trim()) payload.keyword = form.keyword.trim();
    if (form.minYear.trim()) payload.minYear = Number(form.minYear);
    if (form.maxPrice.trim()) payload.maxPrice = Number(form.maxPrice);
    if (form.maxMileage.trim()) payload.maxMileage = Number(form.maxMileage);

    if (Object.keys(payload).length === 0) {
      setError('Please fill in at least one field.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          json?.error?.message ||
          json?.message ||
          `Request failed (${res.status})`;
        throw new Error(message);
      }

      setSuccess('Alert created successfully!');
      setForm(INITIAL_STATE);
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create alert');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bell className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 space-y-1.5">
          <CardTitle className="text-lg">Manual filters</CardTitle>
          <CardDescription>
            Keyword plus optional year, price, and mileage limits. Leave fields empty to skip
            that filter.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-6 pb-6 pt-0">
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
          <div className="space-y-4">
            <Field
              label="Keyword"
              placeholder="e.g. Toyota Aqua"
              value={form.keyword}
              onChange={update('keyword')}
              disabled={submitting}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-0">
              <Field
                label="Min year"
                placeholder="2015"
                type="number"
                min={1900}
                max={2100}
                value={form.minYear}
                onChange={update('minYear')}
                disabled={submitting}
              />
              <Field
                label="Max price (LKR)"
                placeholder="5000000"
                type="number"
                min={0}
                value={form.maxPrice}
                onChange={update('maxPrice')}
                disabled={submitting}
              />
            </div>

            <Field
              label="Max mileage (km)"
              placeholder="100000"
              type="number"
              min={0}
              value={form.maxMileage}
              onChange={update('maxMileage')}
              disabled={submitting}
            />
          </div>

          <div className="mt-auto flex flex-col gap-4 pt-2">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Creating…
                </>
              ) : (
                'Create alert'
              )}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  disabled?: boolean;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  max,
  disabled,
}: FieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium leading-none">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={disabled}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50"
      />
    </label>
  );
}
