import { ScheduleItem } from "./schedule";

export interface Class {
  id: string;
  displayId?: string;
  name: string;
  description: string;
  instructor: string;
  schedule: ScheduleItem[];
  price?: number;
  isActive?: boolean;
  isCompleted?: boolean;
  createdAt?: string;
  image?: string;
  rating?: number;
}

export interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
