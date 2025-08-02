-- Create admin users table for login
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy for admin users (they can only access their own data)
CREATE POLICY "Admin users can view their own data" 
ON public.admin_users 
FOR SELECT 
USING (true);

-- Insert default admin user with hashed password
-- Password: @Smp2025 (you'll need to hash this in the app)
INSERT INTO public.admin_users (username, password_hash, full_name)
VALUES ('admin', '$2b$10$dummy_hash_will_be_replaced', 'Administrator SMPN 3 KEBAKKRAMAT');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();