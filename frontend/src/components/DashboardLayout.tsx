import type { ReactNode } from 'react';
import { DashboardHeader } from './DashboardHeader';

// Shared authenticated layout: header (brand + user name + sign out) over page content.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main>{children}</main>
    </div>
  );
}