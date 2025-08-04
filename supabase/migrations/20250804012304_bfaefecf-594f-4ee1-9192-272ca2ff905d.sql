-- Remove unnecessary columns from students table
ALTER TABLE public.students 
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS parent_name,
DROP COLUMN IF EXISTS parent_phone;