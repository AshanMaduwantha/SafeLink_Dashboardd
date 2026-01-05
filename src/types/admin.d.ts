export interface Admin {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  role: "admin" | "super_admin";
  status: "active" | "inactive";
  img_url?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  password?: string;
}
