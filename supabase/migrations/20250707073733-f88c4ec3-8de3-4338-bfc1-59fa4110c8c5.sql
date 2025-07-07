-- Create auto_scrape_websites table for managing websites to scrape
CREATE TABLE public.auto_scrape_websites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.auto_scrape_websites ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access only
CREATE POLICY "Admins can manage auto scrape websites" 
ON public.auto_scrape_websites 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_auto_scrape_websites_updated_at
BEFORE UPDATE ON public.auto_scrape_websites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default websites to scrape
INSERT INTO public.auto_scrape_websites (name, url) VALUES
('Dribbble', 'https://dribbble.com'),
('Behance', 'https://behance.net'),
('UI8', 'https://ui8.net'),
('Figma Community', 'https://figma.com/community'),
('Material-UI', 'https://mui.com'),
('Ant Design', 'https://ant.design'),
('Chakra UI', 'https://chakra-ui.com'),
('Mantine', 'https://mantine.dev'),
('Tailwind UI', 'https://tailwindui.com'),
('shadcn/ui', 'https://ui.shadcn.com'),
('NextUI', 'https://nextui.org'),
('Headless UI', 'https://headlessui.com'),
('Framer Motion', 'https://framer.com/motion'),
('Styled Components', 'https://styled-components.com'),
('Radix UI', 'https://radix-ui.com'),
('React Bootstrap', 'https://react-bootstrap.github.io'),
('Blueprint', 'https://blueprintjs.com'),
('Semantic UI React', 'https://react.semantic-ui.com');