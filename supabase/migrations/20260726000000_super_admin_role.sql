-- Add super_admin role for MVP feature-gate preview access.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';
