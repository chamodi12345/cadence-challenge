// src/pages/Company Admin/CompanyAdminDashboard.tsx
import { Users, UploadCloud, SlidersHorizontal, Wallet } from 'lucide-react';
import { DashboardCard } from '../../components/DashboardCard';

export default function CompanyAdminDashboard() {
  return (
    <div className="min-h-screen bg-blue-950">
      <div className="w-full max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-10 py-8 space-y-6">
        <div>
          <h2 className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
            Company Admin
          </h2>
          <p className="text-sm text-blue-200 mt-1">
            Manage your team, bookings, and monthly payouts.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <DashboardCard
            title="Manage users"
            description="Add Finance staff and Agents to your company."
            to="/dashboard/users"
            icon={Users}
            accent="indigo"
          />
          <DashboardCard
          title="Teams"
          description="Assign team leads and manage overrides."
          to="/dashboard/teams"
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
    </div>
  );
}