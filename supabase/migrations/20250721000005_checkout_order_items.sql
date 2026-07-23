-- Milestone 6: allow buyers to insert order line items on their pending orders

CREATE POLICY "Insert order items on own order" ON public.order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );
