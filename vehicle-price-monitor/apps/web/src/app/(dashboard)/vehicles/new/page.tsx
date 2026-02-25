'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import type { CreateVehicleDto } from '@vehicle-price-monitor/types';
import { VehicleType, VehicleCondition } from '@vehicle-price-monitor/types';

export default function NewVehiclePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Partial<CreateVehicleDto>>({
    title: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    type: VehicleType.CAR,
    condition: VehicleCondition.USED,
    currentPrice: 0,
    sourceUrl: '',
    sourceName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/vehicles`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create vehicle');
      }

      router.push('/vehicles');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vehicle');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add New Vehicle</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Enter the vehicle details to start tracking its price
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-medium">Basic Information</h3>
              
              <Input
                label="Listing URL"
                type="url"
                value={formData.sourceUrl}
                onChange={(e) =>
                  setFormData({ ...formData, sourceUrl: e.target.value })
                }
                required
                placeholder="https://example.com/listing/123"
                helperText="Paste the URL of the vehicle listing"
              />

              <Input
                label="Title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                placeholder="2020 Toyota Camry XSE"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Make"
                  value={formData.make}
                  onChange={(e) =>
                    setFormData({ ...formData, make: e.target.value })
                  }
                  required
                  placeholder="Toyota"
                />
                <Input
                  label="Model"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  required
                  placeholder="Camry"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Year"
                  type="number"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: parseInt(e.target.value) })
                  }
                  required
                  min={1900}
                  max={new Date().getFullYear() + 1}
                />
                <Input
                  label="Current Price"
                  type="number"
                  value={formData.currentPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      currentPrice: parseFloat(e.target.value),
                    })
                  }
                  required
                  min={0}
                  placeholder="25000"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as VehicleType,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600"
                  >
                    {Object.values(VehicleType).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Condition
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        condition: e.target.value as VehicleCondition,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600"
                  >
                    {Object.values(VehicleCondition).map((condition) => (
                      <option key={condition} value={condition}>
                        {condition.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="Source Name"
                value={formData.sourceName}
                onChange={(e) =>
                  setFormData({ ...formData, sourceName: e.target.value })
                }
                required
                placeholder="AutoTrader"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading} className="flex-1">
                Add Vehicle
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
