export interface FormField {
  id: string;
  type: 'text' | 'checkbox' | 'signature' | 'date' | 'textarea';
  name: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  required?: boolean;
  placeholder?: string;
}

export interface PdfTemplate {
  id: string;
  name: string;
  description: string | null;
  base_pdf_path: string;
  form_fields: FormField[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FilledForm {
  id: string;
  template_id: string | null;
  name: string;
  filled_data: Record<string, string | boolean>;
  output_pdf_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  template?: PdfTemplate;
}
