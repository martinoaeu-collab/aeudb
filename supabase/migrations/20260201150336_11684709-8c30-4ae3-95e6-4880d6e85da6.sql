-- Create table for PDF templates with form field definitions
CREATE TABLE public.pdf_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_pdf_path TEXT NOT NULL,
  form_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for filled PDF forms (instances of templates)
CREATE TABLE public.filled_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.pdf_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  filled_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_pdf_path TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdf_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filled_forms ENABLE ROW LEVEL SECURITY;

-- Templates: All authenticated can view, HR/Admin can manage
CREATE POLICY "Authenticated users can view templates"
  ON public.pdf_templates FOR SELECT
  USING (true);

CREATE POLICY "HR can create templates"
  ON public.pdf_templates FOR INSERT
  WITH CHECK (is_hr_or_admin(auth.uid()));

CREATE POLICY "HR can update templates"
  ON public.pdf_templates FOR UPDATE
  USING (is_hr_or_admin(auth.uid()));

CREATE POLICY "HR can delete templates"
  ON public.pdf_templates FOR DELETE
  USING (is_hr_or_admin(auth.uid()));

-- Filled forms: Users can manage their own, HR/Admin can see all
CREATE POLICY "Users can view own filled forms or HR can view all"
  ON public.filled_forms FOR SELECT
  USING (auth.uid() = created_by OR is_hr_or_admin(auth.uid()));

CREATE POLICY "Authenticated users can create filled forms"
  ON public.filled_forms FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own filled forms"
  ON public.filled_forms FOR UPDATE
  USING (auth.uid() = created_by OR is_hr_or_admin(auth.uid()));

CREATE POLICY "Users can delete own filled forms"
  ON public.filled_forms FOR DELETE
  USING (auth.uid() = created_by OR is_hr_or_admin(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_pdf_templates_updated_at
  BEFORE UPDATE ON public.pdf_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_filled_forms_updated_at
  BEFORE UPDATE ON public.filled_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for PDF templates
INSERT INTO storage.buckets (id, name, public) VALUES ('pdf-templates', 'pdf-templates', true);

-- Storage policies for pdf-templates bucket
CREATE POLICY "Anyone can view pdf templates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pdf-templates');

CREATE POLICY "HR can upload pdf templates"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pdf-templates' AND is_hr_or_admin(auth.uid()));

CREATE POLICY "HR can update pdf templates"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'pdf-templates' AND is_hr_or_admin(auth.uid()));

CREATE POLICY "HR can delete pdf templates"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pdf-templates' AND is_hr_or_admin(auth.uid()));