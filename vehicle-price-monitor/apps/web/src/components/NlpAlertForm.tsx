'use client';

import { useState, FormEvent } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

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
      const parsed = await createAlertFromDescription(trimmed);
      setResult(parsed);

      if (!hasAnyFilter(parsed)) {
        setError(
          'Could not extract any filters from that description. Try mentioning the vehicle, year, price, or mileage.',
        );
        return;
      }

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
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 space-y-1.5">
          <CardTitle className="text-lg">From description</CardTitle>
          <CardDescription>
            We parse your text into keyword, year, price, and mileage filters automatically.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-6 pb-6 pt-0">
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium leading-none">Description</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Toyota Aqua 2018 or newer, under 5 million LKR, below 80,000 km"
              disabled={submitting}
              rows={4}
              className="min-h-[100px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50"
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              Mention the vehicle, budget, model year, or mileage—the more detail, the better the
              match.
            </span>
          </label>

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

            {result && <ParsedPreview result={result} />}

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

async function createAlertFromDescription(text: string): Promise<ParsedAlert> {
  const res = await fetch(`${API_BASE}/api/v1/alerts/from-description`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(extractError(json, res.status, 'Failed to create alert'));
  }

  const data = json?.data ?? json;
  return {
    keyword: data?.keyword ?? null,
    minYear: data?.minYear ?? null,
    maxPrice: data?.maxPrice ?? null,
    maxMileage: data?.maxMileage ?? null,
  };
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
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Parsed filters
      </p>
      <dl className="mt-3 space-y-2.5 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[7rem_1fr] items-baseline gap-x-3 gap-y-0.5">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 font-medium tabular-nums text-right leading-snug">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
