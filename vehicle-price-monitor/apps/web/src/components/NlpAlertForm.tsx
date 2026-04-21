'use client';

import { useState, FormEvent } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ParsedAlert {
  keyword: string | null;
  minYear: number | null;
  maxPrice: number | null;
  maxMileage: number | null;
}

interface NlpAlertFormProps {
  onCreated?: () => void;
}

export default function NlpAlertForm({ onCreated }: NlpAlertFormProps = {}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ParsedAlert | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setResult(null);

    const trimmed = text.trim();
    if (!trimmed) {
      setError('Please describe what you are looking for.');
      return;
    }

    setSubmitting(true);
    try {
      const parsed = await parseText(trimmed);
      setResult(parsed);

      if (!hasAnyFilter(parsed)) {
        setError(
          'Could not extract any filters from that description. Try mentioning the vehicle, year, price, or mileage.',
        );
        return;
      }

      await createAlert(parsed);
      setSuccess('Alert created successfully');
      setText('');
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create alert');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">
              Create alert from description
            </h2>
            <p className="text-sm text-muted-foreground">
              Type what you&apos;re looking for in plain English.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Description</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe what you're looking for..."
              disabled={submitting}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50 disabled:pointer-events-none transition-colors resize-none"
            />
            <span className="text-xs text-muted-foreground">
              e.g. &quot;Toyota Aqua 2018 or newer under 5 million with below
              80000 km&quot;
            </span>
          </label>

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

          {result && <ParsedPreview result={result} />}

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
              'Create Alert'
            )}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}

async function parseText(text: string): Promise<ParsedAlert> {
  const res = await fetch(`${API_BASE}/api/v1/alerts/nlp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(extractError(json, res.status, 'Failed to parse input'));
  }

  const data = json?.data ?? json;
  return {
    keyword: data?.keyword ?? null,
    minYear: data?.minYear ?? null,
    maxPrice: data?.maxPrice ?? null,
    maxMileage: data?.maxMileage ?? null,
  };
}

async function createAlert(parsed: ParsedAlert): Promise<void> {
  const payload: Record<string, string | number> = {};
  if (parsed.keyword) payload.keyword = parsed.keyword;
  if (parsed.minYear !== null) payload.minYear = parsed.minYear;
  if (parsed.maxPrice !== null) payload.maxPrice = parsed.maxPrice;
  if (parsed.maxMileage !== null) payload.maxMileage = parsed.maxMileage;

  const res = await fetch(`${API_BASE}/api/v1/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(extractError(json, res.status, 'Failed to create alert'));
  }
}

function extractError(
  json: unknown,
  status: number,
  fallback: string,
): string {
  const record = (json ?? {}) as Record<string, unknown>;
  const nested = (record.error ?? {}) as Record<string, unknown>;
  return (
    (typeof nested.message === 'string' && nested.message) ||
    (typeof record.message === 'string' && record.message) ||
    `${fallback} (${status})`
  );
}

function hasAnyFilter(parsed: ParsedAlert): boolean {
  return (
    !!parsed.keyword ||
    parsed.minYear !== null ||
    parsed.maxPrice !== null ||
    parsed.maxMileage !== null
  );
}

function ParsedPreview({ result }: { result: ParsedAlert }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Keyword', value: result.keyword ?? '—' },
    {
      label: 'Min year',
      value: result.minYear !== null ? String(result.minYear) : '—',
    },
    {
      label: 'Max price',
      value:
        result.maxPrice !== null
          ? `LKR ${result.maxPrice.toLocaleString()}`
          : '—',
    },
    {
      label: 'Max mileage',
      value:
        result.maxMileage !== null
          ? `${result.maxMileage.toLocaleString()} km`
          : '—',
    },
  ];

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Parsed filters
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
