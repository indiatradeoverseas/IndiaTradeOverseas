import React from 'react';
import CareerLeadsSection from '../../components/crm/CareerLeadsSection';

export default function CareerLeads() {
    return (
        <div className="min-h-screen bg-[var(--crm-bg-sunken)] font-sans antialiased text-[var(--crm-ink-soft)] p-2.5 sm:p-8 pt-16 sm:pt-20">
            <div className="max-w-7xl mx-auto w-full">
                <CareerLeadsSection />
            </div>
        </div>
    );
}
