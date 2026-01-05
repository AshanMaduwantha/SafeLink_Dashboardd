"use client";

import MembershipTable from "@/components/dashboard/membership/membershipTable";
import { Membership } from "@/types/membership";

export default function MembershipPage() {
  const handleEdit = (_membership: Membership) => {};

  const handleDelete = (_membershipId: string) => {};

  const handleToggleStatus = (_membershipId: string, _enabled: boolean) => {};

  const handleCreateMembership = (_data: any) => {};

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8">
      <MembershipTable
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        onCreate={handleCreateMembership}
      />
    </div>
  );
}
