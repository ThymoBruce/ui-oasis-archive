-- Create enum for content types
CREATE TYPE public.content_type AS ENUM ('design', 'component_library', 'ui_component', 'website');

-- Create enum for content status
CREATE TYPE public.content_status AS ENUM ('pending', 'approved', 'rejected');

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create content table (main table for designs, libraries, components)
CREATE TABLE public.content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content_type public.content_type NOT NULL,
  status public.content_status NOT NULL DEFAULT 'pending',
  url TEXT,
  image_url TEXT,
  thumbnail_url TEXT,
  source_website TEXT,
  author_name TEXT,
  author_url TEXT,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  scraped_data JSONB,
  metadata JSONB DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create content_tags junction table
CREATE TABLE public.content_tags (
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, tag_id)
);

-- Create user_favorites table
CREATE TABLE public.user_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- Create user_collections table
CREATE TABLE public.user_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create collection_items table
CREATE TABLE public.collection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.user_collections(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(collection_id, content_id)
);

-- Create profiles table for additional user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories (public read, admin write)
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);

-- RLS Policies for tags (public read, anyone can create)
CREATE POLICY "Tags are viewable by everyone" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for content (public read for approved, users can CRUD their own)
CREATE POLICY "Approved content is viewable by everyone" ON public.content FOR SELECT USING (status = 'approved' OR submitted_by = auth.uid());
CREATE POLICY "Users can create content" ON public.content FOR INSERT WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Users can update their own content" ON public.content FOR UPDATE USING (auth.uid() = submitted_by);
CREATE POLICY "Users can delete their own content" ON public.content FOR DELETE USING (auth.uid() = submitted_by);

-- RLS Policies for content_tags (inherit from content)
CREATE POLICY "Content tags viewable if content is viewable" ON public.content_tags FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.content WHERE id = content_id AND (status = 'approved' OR submitted_by = auth.uid()))
);
CREATE POLICY "Users can manage tags for their content" ON public.content_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM public.content WHERE id = content_id AND submitted_by = auth.uid())
);

-- RLS Policies for user_favorites
CREATE POLICY "Users can view their own favorites" ON public.user_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own favorites" ON public.user_favorites FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_collections
CREATE POLICY "Users can view public collections and their own" ON public.user_collections FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage their own collections" ON public.user_collections FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for collection_items
CREATE POLICY "Users can view items in accessible collections" ON public.collection_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_collections WHERE id = collection_id AND (is_public = true OR user_id = auth.uid()))
);
CREATE POLICY "Users can manage items in their own collections" ON public.collection_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_collections WHERE id = collection_id AND user_id = auth.uid())
);

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON public.content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_collections_updated_at BEFORE UPDATE ON public.user_collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some default categories
INSERT INTO public.categories (name, description) VALUES
  ('UI Kits', 'Complete user interface design kits and systems'),
  ('Component Libraries', 'Reusable component libraries and frameworks'),
  ('Landing Pages', 'Website landing page designs and templates'),
  ('Dashboard Designs', 'Admin panels and dashboard interfaces'),
  ('Mobile Apps', 'Mobile application designs and interfaces'),
  ('E-commerce', 'Online store and shopping designs'),
  ('Portfolio Sites', 'Portfolio and personal website designs'),
  ('SaaS Interfaces', 'Software as a Service application designs'),
  ('Design Systems', 'Complete design systems and style guides'),
  ('Icons & Illustrations', 'Icon sets and illustration collections');