'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Filter, X, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

interface FilterState {
  keyword: string;
  location: string;
  minPrice: string;
  maxPrice: string;
  minYear: string;
  maxMileage: string;
}

const EMPTY: FilterState = {
  keyword: '',
  location: '',
  minPrice: '',
  maxPrice: '',
  minYear: '',
  maxMileage: '',
};

const FILTER_KEYS = Object.keys(EMPTY) as (keyof FilterState)[];

function readFromParams(params: URLSearchParams): FilterState {
  return FILTER_KEYS.reduce<FilterState>((acc, key) => {
    acc[key] = params.get(key) ?? '';
    return acc;
  }, { ...EMPTY });
}

export default function ListingsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FilterState>(() =>
    readFromParams(searchParams ?? new URLSearchParams()),
  );

  // Keep the form in sync if the user navigates via back/forward buttons.
  useEffect(() => {
    setFilters(readFromParams(searchParams ?? new URLSearchParams()));
  }, [searchParams]);

  const update = (key: keyof FilterState) => (value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const activeCount = FILTER_KEYS.filter((k) => filters[k].trim()).length;

  const handleApply = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = filters[key].trim();
      if (value) next.set(key, value);
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleClear = () => {
    setFilters(EMPTY);
    router.push(pathname);
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Filter className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight">Filters</h2>
            <p className="text-xs text-muted-foreground">
              {activeCount === 0
                ? 'Refine the listings below.'
                : `${activeCount} active filter${activeCount === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        <form onSubmit={handleApply} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Field
              label="Keyword"
              placeholder="e.g. Toyota Aqua"
              value={filters.keyword}
              onChange={update('keyword')}
              icon={<Search className="h-3.5 w-3.5" />}
            />
            <Field
              label="Location"
              placeholder="e.g. Colombo"
              value={filters.location}
              onChange={update('location')}
            />
            <Field
              label="Min year"
              placeholder="2015"
              type="number"
              min={1900}
              max={2100}
              value={filters.minYear}
              onChange={update('minYear')}
            />
            <Field
              label="Min price (LKR)"
              placeholder="0"
              type="number"
              min={0}
              value={filters.minPrice}
              onChange={update('minPrice')}
            />
            <Field
              label="Max price (LKR)"
              placeholder="10000000"
              type="number"
              min={0}
              value={filters.maxPrice}
              onChange={update('maxPrice')}
            />
            <Field
              label="Max mileage (km)"
              placeholder="100000"
              type="number"
              min={0}
              value={filters.maxMileage}
              onChange={update('maxMileage')}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleClear}
              disabled={activeCount === 0 && !isDirty(filters)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-accent disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear Filters
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Filter className="h-3.5 w-3.5" />
              Apply Filters
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function isDirty(filters: FilterState): boolean {
  return FILTER_KEYS.some((k) => filters[k].trim().length > 0);
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  icon?: React.ReactNode;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  max,
  icon,
}: FieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          className={`w-full py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors ${
            icon ? 'pl-9 pr-3' : 'px-3'
          }`}
        />
      </div>
    </label>
  );
}
