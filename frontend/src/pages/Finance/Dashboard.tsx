// src/pages/Finance/Dashboard.tsx
import { UploadCloud, SlidersHorizontal, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../lib/roles';
import { DashboardCard } from '../../components/DashboardCard';

export default function FinanceDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-6 py-8 sm:px-8 lg:px-10">
        <div>
          <h2 className="page-title">{ROLE_LABELS[user.role]}</h2>
          <p className="page-subtitle">
            Manage bookings, commission rules, and payouts for {user.companyId}.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <DashboardCard
            title="Import bookings"
            description="Upload a CSV of agent bookings."
            to="/dashboard/import"
            icon={UploadCloud}
            accent="teal"
          />
          <DashboardCard
            title="Commission rules"
            description="View and edit tiered commission rates."
            to="/dashboard/rules"
            icon={SlidersHorizontal}
            accent="amber"
          />
          <DashboardCard
            title="Payout runs"
            description="Generate and finalise monthly payouts."
            to="/dashboard/payouts"
            icon={Wallet}
            accent="emerald"
          />
        </div>
      </div>
    </div>
  );
}