export interface Membership {
  id: string;
  name: string;
  pricePerMonth: string;
  status: "Active" | "Inactive";
  enabled: boolean;
  isMembershipEnabled?: boolean;
  description?: string;
  features?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateMembershipData {
  name: string;
  pricePerMonth: string;
  enableMembership: boolean;
  description?: string;
  features?: string[];
}

export interface UpdateMembershipData extends Partial<CreateMembershipData> {
  id: string;
  status?: "Active" | "Inactive";
  enabled?: boolean;
  isMembershipEnabled?: boolean;
}
