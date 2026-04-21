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

      <div className="grid gap-6 lg:grid-cols-2">
        <NlpAlertForm onCreated={bumpRefresh} />
        <CreateAlertForm onCreated={bumpRefresh} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your alerts</h2>
        <AlertsList refreshKey={refreshKey} />
      </section>
    </div>
  );
}
