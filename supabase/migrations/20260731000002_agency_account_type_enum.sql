-- Agency as first-class account type: add enum value (must commit before use in same DB session)

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'agency';
