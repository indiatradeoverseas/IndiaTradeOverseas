import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import SalesExecutiveDashboard from './SalesExecutiveDashboard';
import SalesManagerDashboard from './SalesManagerDashboard';

export default function SalesDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.department === 'ADMIN' || (user?.position && user.position.toLowerCase().includes('admin'));
  
  // Managers and Admins see the Team Command Center (SalesManagerDashboard)
  const isManager = isAdmin || user?.role === 'MANAGER' || user?.role === 'SALES_MANAGER' || (user?.department === 'SALES' && user?.position?.toLowerCase()?.includes('manager'));

  if (isManager) {
    return <SalesManagerDashboard />;
  }

  return <SalesExecutiveDashboard />;
}
