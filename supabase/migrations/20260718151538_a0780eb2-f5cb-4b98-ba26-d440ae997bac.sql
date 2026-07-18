
-- Central databank settings (singleton row)
CREATE TABLE public.central_databank_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_url TEXT NOT NULL DEFAULT '',
  api_header_name TEXT NOT NULL DEFAULT 'X-API-Key',
  api_header_value TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.central_databank_settings TO authenticated;
GRANT ALL ON public.central_databank_settings TO service_role;

ALTER TABLE public.central_databank_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage central settings"
  ON public.central_databank_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_central_databank_settings_updated
BEFORE UPDATE ON public.central_databank_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Which categories are transmitted to the central databank
CREATE TABLE public.central_databank_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.central_databank_categories TO authenticated;
GRANT ALL ON public.central_databank_categories TO service_role;

ALTER TABLE public.central_databank_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage central categories"
  ON public.central_databank_categories
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sync log
CREATE TABLE public.central_databank_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  status TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.central_databank_sync_log TO authenticated;
GRANT ALL ON public.central_databank_sync_log TO service_role;

ALTER TABLE public.central_databank_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view sync log"
  ON public.central_databank_sync_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
