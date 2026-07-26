-- Milestone 11: impression scale indexes, rollup RPC, partition guidance

CREATE INDEX IF NOT EXISTS idx_ad_impressions_created_brin
  ON public.advertisement_impressions USING brin (created_at);

CREATE INDEX IF NOT EXISTS idx_ad_clicks_created_brin
  ON public.advertisement_clicks USING brin (created_at);

COMMENT ON TABLE public.advertisement_impressions IS
  'High-volume telemetry. BRIN(created_at) supports time-range scans. When rows exceed ~10M, migrate to RANGE (created_at) monthly partitions and attach future months via CREATE TABLE ... PARTITION OF.';

-- Daily sponsor metrics rollup (service role / cron)
CREATE OR REPLACE FUNCTION public.rollup_sponsor_campaign_metrics_daily(p_bucket date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  INSERT INTO public.sponsor_campaign_metrics_daily (
    campaign_id,
    bucket_date,
    impressions,
    clicks,
    unique_visitors
  )
  SELECT
    sc.id,
    p_bucket,
    COALESCE(imp.impressions, 0),
    COALESCE(clk.clicks, 0),
    COALESCE(imp.unique_visitors, 0)
  FROM public.sponsor_campaigns sc
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::bigint AS impressions,
      COUNT(DISTINCT COALESCE(i.user_id::text, i.session_id, i.id::text))::integer AS unique_visitors
    FROM public.advertisements a
    JOIN public.advertisement_impressions i ON i.advertisement_id = a.id
    WHERE a.campaign_id = sc.id
      AND (i.created_at AT TIME ZONE 'UTC')::date = p_bucket
  ) imp ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS clicks
    FROM public.advertisements a
    JOIN public.advertisement_clicks c ON c.advertisement_id = a.id
    WHERE a.campaign_id = sc.id
      AND (c.created_at AT TIME ZONE 'UTC')::date = p_bucket
  ) clk ON true
  WHERE COALESCE(imp.impressions, 0) > 0 OR COALESCE(clk.clicks, 0) > 0
  ON CONFLICT (campaign_id, bucket_date) DO UPDATE SET
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    unique_visitors = EXCLUDED.unique_visitors,
    updated_at = now();

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.rollup_sponsor_campaign_metrics_daily(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollup_sponsor_campaign_metrics_daily(date) TO service_role;
