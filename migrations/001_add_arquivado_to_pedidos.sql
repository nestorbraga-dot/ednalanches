-- Migration: Add arquivado column to pedidos
-- Execute this in your Supabase SQL editor or via psql

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS arquivado boolean DEFAULT false NOT NULL;

-- Optional: create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_pedidos_arquivado ON public.pedidos(arquivado);
