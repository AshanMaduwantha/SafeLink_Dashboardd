import { Class, PaginationData } from "./classes";

export interface ClassPack {
  id: string;
  packName: string;
  isActive: boolean;
  createdAt?: string;
  classes?: Class[];
  classCount?: number;
  price?: number;
}

export interface ClassPackClass {
  id: string;
  classId: string;
  classPackId: string;
  className: string;
  packName: string;
}

export interface ClassPackFormData {
  packName: string;
  classIds: string[];
  isActive: boolean;
  // Optional client-provided discount controls
  isDiscountEnabled?: boolean;
  discountPercent?: number;
}

export interface ClassPackPaginationData extends PaginationData {}
