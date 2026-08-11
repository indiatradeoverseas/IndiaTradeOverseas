import React from 'react';

export function SkeletonBlock({ className = '', style = {} }) {
  return (
    <div
      className={`crm-skeleton rounded-sm ${className}`}
      style={{ background: 'var(--crm-bg-sunken)', ...style }}
    />
  );
}

export function SkeletonStatCard() {
  return (
    <div
      className="border p-5 rounded-sm flex flex-col justify-between gap-4"
      style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <SkeletonBlock className="h-2.5 w-20" />
        <SkeletonBlock className="h-7 w-7" />
      </div>
      <SkeletonBlock className="h-6 w-16" />
    </div>
  );
}

export function SkeletonStatGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonChartCard({ height = 220 }) {
  return (
    <div
      className="border p-5 rounded-sm"
      style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}
    >
      <SkeletonBlock className="h-3 w-40 mb-5" />
      <SkeletonBlock style={{ height }} className="w-full" />
    </div>
  );
}

export function SkeletonListCard({ rows = 4 }) {
  return (
    <div
      className="border p-5 rounded-sm"
      style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}
    >
      <SkeletonBlock className="h-3 w-32 mb-5" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <SkeletonBlock className="h-2.5 w-28" />
            <SkeletonBlock className="h-2.5 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
