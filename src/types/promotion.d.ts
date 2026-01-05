export type Promotion = {
  id: string;
  promotion_name: string;
  discount: number;
  start_date: string;
  end_date: string;
  status: "Active" | "Inactive";
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};
