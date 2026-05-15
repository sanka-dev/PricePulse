'use client';

import { useState } from 'react';
import CreateAlertForm from '@/components/CreateAlertForm';
import NlpAlertForm from '@/components/NlpAlertForm';
import AlertsList from '@/components/AlertsList';

export default function AlertsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-muted-foreground">
          Get notified when new listings match your search.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Create a new alert</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Use a plain language description, or set keyword and filters yourself. Both options
            watch the same marketplace sources.
          </p>
        </div>
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 lg:items-stretch">
          <div className="min-w-0 flex flex-col">
            <NlpAlertForm onCreated={bumpRefresh} />
          </div>
          <div className="min-w-0 flex flex-col">
            <CreateAlertForm onCreated={bumpRefresh} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Your alerts</h2>
        <AlertsList refreshKey={refreshKey} />
      </section>
    </div>
  );
}
