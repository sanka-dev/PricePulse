'use client';

import { useState, FormEvent } from 'react';
import { Bell, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

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
    <Card className="max-w-xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">Create search alert</h2>
            <p className="text-sm text-muted-foreground">
              Get notified when new listings match your criteria.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Keyword"
            placeholder="e.g. Toyota Aqua"
            value={form.keyword}
            onChange={update('keyword')}
            disabled={submitting}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400 text-sm">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create alert'
            )}
          </button>
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
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50 disabled:pointer-events-none transition-colors"
      />
    </label>
  );
}
