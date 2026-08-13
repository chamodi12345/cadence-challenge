// src/pages/Company Admin/CompanyAdminDashboard.tsx
import { Users, UploadCloud, SlidersHorizontal, Wallet } from 'lucide-react';
import { DashboardCard } from '../../components/DashboardCard';

export default function CompanyAdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Company Admin
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage your team, bookings, and monthly payouts.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DashboardCard
          title="Manage users"
          description="Add Finance staff and Agents to your company."
          to="/dashboard/users"
          icon={Users}
          accent="indigo"
        />
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
  );
}