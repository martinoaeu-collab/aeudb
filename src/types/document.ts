export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
}
