export interface User {
  provider: string;
  uid: string;
  title: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  status?: "active" | "inactive";
  createdAt?: string | Date;
  updatedAt?: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  phone: string;
  title: string;
}

export interface UpdateUserData extends Partial<CreateUserData> {
  uid: string;
}
