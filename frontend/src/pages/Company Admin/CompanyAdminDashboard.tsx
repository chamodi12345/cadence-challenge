// src/pages/Company Admin/CompanyAdminDashboard.tsx
import { Users, UploadCloud, SlidersHorizontal, Wallet, ShieldCheck } from 'lucide-react';
import { DashboardCard } from '../../components/DashboardCard';

export default function CompanyAdminDashboard() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-6 py-8 sm:px-8 lg:px-10">
        <div>
          <h2 className="page-title">Company Admin</h2>
          <p className="page-subtitle">
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
            icon={ShieldCheck}
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