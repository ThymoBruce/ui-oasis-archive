import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { ContentCard } from '@/components/ContentCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Sparkles, 
  TrendingUp, 
  Palette, 
  Code, 
  Globe,
  ArrowRight,
  Upload,
  Heart,
  Star
} from 'lucide-react';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch featured content
  const { data: featuredContent, isLoading } = useQuery({
    queryKey: ['featured-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content')
        .select(`
          *,
          categories(name),
          content_tags(tags(name))
        `)
        .eq('status', 'approved')
        .order('view_count', { ascending: false })
        .limit(8);

      if (error) throw error;
      return data;
    },
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .limit(6);

      if (error) throw error;
      return data;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container py-20 text-center">
          <div className="mx-auto max-w-4xl space-y-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center">
                <Palette className="h-7 w-7 text-primary-foreground" />
              </div>
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Discover & Share
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Beautiful UI Designs
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The ultimate collection of web designs, component libraries, and UI elements. 
              Find inspiration, save favorites, and contribute to the community.
            </p>

            <form onSubmit={handleSearch} className="max-w-lg mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search designs, libraries, components..."
                  className="pl-12 pr-4 h-14 text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button 
                  type="submit" 
                  size="lg" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                >
                  Search
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button asChild variant="outline" size="lg">
                <Link to="/browse">
                  <Globe className="h-5 w-5 mr-2" />
                  Browse All
                </Link>
              </Button>
              <Button asChild size="lg">
                <Link to="/upload">
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Design
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-muted/20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Browse by Category</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore curated collections of designs organized by type and purpose
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories?.map((category) => (
              <Link
                key={category.id}
                to={`/categories/${encodeURIComponent(category.name)}`}
                className="group p-6 bg-card rounded-lg border hover:border-primary/50 transition-all duration-300 hover:shadow-md hover:-translate-y-1"
              >
                <div className="text-center">
                  <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                    <Code className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Content */}
      <section className="py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-primary" />
                Trending Designs
              </h2>
              <p className="text-muted-foreground">
                Most popular designs and components from our community
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/browse">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[16/10] bg-muted rounded-lg mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredContent?.map((content) => (
                <ContentCard
                  key={content.id}
                  id={content.id}
                  title={content.title}
                  description={content.description}
                  image_url={content.image_url}
                  thumbnail_url={content.thumbnail_url}
                  content_type={content.content_type}
                  url={content.url}
                  author_name={content.author_name}
                  view_count={content.view_count}
                  like_count={content.like_count}
                  created_at={content.created_at}
                  category={content.categories}
                  tags={content.content_tags?.map((ct: any) => ct.tags)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/20">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">10,000+</div>
              <div className="text-muted-foreground">UI Designs</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">500+</div>
              <div className="text-muted-foreground">Component Libraries</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">50,000+</div>
              <div className="text-muted-foreground">Community Members</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container">
          <div className="text-center bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-12">
            <h2 className="text-3xl font-bold mb-4">Join the Community</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Share your designs, discover inspiration, and connect with designers worldwide. 
              Start building something amazing today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/auth">
                  <Star className="h-5 w-5 mr-2" />
                  Get Started Free
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/upload">
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Your Design
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
