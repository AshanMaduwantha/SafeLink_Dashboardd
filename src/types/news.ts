export interface News {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  publish_date: string | Date;
  status: "published" | "draft";
  category: string;
  is_pinned: boolean;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface CreateNewsData {
  title: string;
  content: string;
  image_url?: string;
  publish_date: string | Date;
  status: "published" | "draft";
  category: string;
  is_pinned: boolean;
}

export interface UpdateNewsData extends Partial<CreateNewsData> {
  id: string;
}

export interface NewsFilters {
  status?: "published" | "draft" | "all";
  category?: string;
  search?: string;
}
