-- Allow users to insert their personal override in exercise_templates
CREATE POLICY "Allow insert for own exercise_templates" 
  ON public.exercise_templates
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow users to update only their personal exercise_templates
CREATE POLICY "Allow update for own exercise_templates" 
  ON public.exercise_templates
  FOR UPDATE
  USING (user_id = auth.uid());



ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;

ALTER TABLE exercise_templates
ADD CONSTRAINT exercise_templates_name_user_id_unique UNIQUE (name, user_id);