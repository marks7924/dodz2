-- ============================================================
-- DODZ — Migration 010: Chat & Activity Logs
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Helper function for super admin (Dev, Owner, Head Admin)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT role IN ('HEAD_ADMIN', 'DEVELOPER', 'OWNER')
  FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 2. Activity Logs RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can read logs" ON public.activity_logs;
CREATE POLICY "Super admins can read logs" ON public.activity_logs
  FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "Managers can insert logs" ON public.activity_logs;
CREATE POLICY "Managers can insert logs" ON public.activity_logs
  FOR INSERT WITH CHECK (public.is_manager());

-- 3. Support Chats RLS
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;

-- Customers can view their own chats
DROP POLICY IF EXISTS "Customers view own chats" ON public.support_chats;
CREATE POLICY "Customers view own chats" ON public.support_chats
  FOR SELECT USING (customer_id = auth.uid());

-- Customers can create their own chats
DROP POLICY IF EXISTS "Customers insert own chats" ON public.support_chats;
CREATE POLICY "Customers insert own chats" ON public.support_chats
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Customers can update their own chats (e.g. to close them)
DROP POLICY IF EXISTS "Customers update own chats" ON public.support_chats;
CREATE POLICY "Customers update own chats" ON public.support_chats
  FOR UPDATE USING (customer_id = auth.uid());

-- Internal staff can view chats (logic for closed chats will be filtered in UI/frontend queries)
DROP POLICY IF EXISTS "Staff view chats" ON public.support_chats;
CREATE POLICY "Staff view chats" ON public.support_chats
  FOR SELECT USING (public.is_internal_staff());

-- Staff can update chats (to assign, resolve, close)
DROP POLICY IF EXISTS "Staff update chats" ON public.support_chats;
CREATE POLICY "Staff update chats" ON public.support_chats
  FOR UPDATE USING (public.is_internal_staff());

-- Staff can insert chats (rare, but allowed)
DROP POLICY IF EXISTS "Staff insert chats" ON public.support_chats;
CREATE POLICY "Staff insert chats" ON public.support_chats
  FOR INSERT WITH CHECK (public.is_internal_staff());

-- 4. Support Messages RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Select messages if you are the customer OR staff
DROP POLICY IF EXISTS "View support messages" ON public.support_messages;
CREATE POLICY "View support messages" ON public.support_messages
  FOR SELECT USING (
    sender_id = auth.uid() OR 
    public.is_internal_staff() OR
    EXISTS (SELECT 1 FROM public.support_chats c WHERE c.id = chat_id AND c.customer_id = auth.uid())
  );

-- Insert messages if you are the customer of the chat OR staff
DROP POLICY IF EXISTS "Insert support messages" ON public.support_messages;
CREATE POLICY "Insert support messages" ON public.support_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND (
      public.is_internal_staff() OR
      EXISTS (SELECT 1 FROM public.support_chats c WHERE c.id = chat_id AND c.customer_id = auth.uid())
    )
  );

-- 5. Helper function for inserting activity logs from the backend easily if needed
CREATE OR REPLACE FUNCTION public.log_activity(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_actor_email TEXT;
BEGIN
  SELECT email INTO v_actor_email FROM auth.users WHERE id = auth.uid();
  
  INSERT INTO public.activity_logs (actor_id, actor_email, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), v_actor_email, p_action, p_resource_type, p_resource_id, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
