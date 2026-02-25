'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, Input } from '@/components/ui';
import type { VehicleResponseDto, PaginatedResponse } from '@vehicle-price-monitor/types';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/vehicles`);
      // const data: PaginatedResponse<VehicleResponseDto> = await response.json();
      // setVehicles(data.data);
      
      // Mock data for now
      setVehicles([]);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vehicles</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track and monitor vehicle listings
          </p>
        </div>
        <Link href="/vehicles/new">
          <Button>+ Add Vehicle</Button>
        </Link>
      </div>

      {/* Search and filters */}
      <div className="flex gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search vehicles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline">Filters</Button>
      </div>

      {/* Vehicle grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-t-xl" />
              <CardContent>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredVehicles.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">🚗</div>
            <h3 className="text-lg font-medium mb-2">No vehicles yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Start tracking vehicles by adding your first listing
            </p>
            <Link href="/vehicles/new">
              <Button>Add Your First Vehicle</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </div>
  );
}

function VehicleCard({ vehicle }: { vehicle: VehicleResponseDto }) {
  return (
    <Link href={`/vehicles/${vehicle.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <div className="aspect-video relative bg-gray-100 dark:bg-gray-700 rounded-t-xl overflow-hidden">
          {vehicle.imageUrl ? (
            <img
              src={vehicle.imageUrl}
              alt={vehicle.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">
              🚗
            </div>
          )}
          {vehicle.priceChangePercent && vehicle.priceChangePercent < 0 && (
            <span className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              {vehicle.priceChangePercent.toFixed(1)}%
            </span>
          )}
        </div>
        <CardContent>
          <h3 className="font-semibold truncate">{vehicle.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {vehicle.year} • {vehicle.mileage?.toLocaleString()} km
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg font-bold text-primary-600">
              {vehicle.currency} {vehicle.currentPrice.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">{vehicle.sourceName}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
