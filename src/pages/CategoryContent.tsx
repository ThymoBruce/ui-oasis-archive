import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { ContentCard } from '@/components/ContentCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, SortAsc, Package } from 'lucide-react';

export default function CategoryContent() {
  const { name } = useParams<{ name: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [contentType, setContentType] = useState('all');

  const { data: category } = useQuery({
    queryKey: ['category', name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('name', decodeURIComponent(name || ''))
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: content, isLoading } = useQuery({
    queryKey: ['category-content', name, searchQuery, sortBy, contentType],
    queryFn: async () => {
      let query = supabase
        .from('content')
        .select(`
          *,
          categories(name),
          content_tags(
            tags(name)
          )
        `)
        .eq('status', 'approved')
        .eq('categories.name', decodeURIComponent(name || ''));

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      if (contentType !== 'all') {
        query = query.eq('content_type', contentType);
      }

      const orderDirection = sortBy === 'title' ? { ascending: true } : { ascending: false };
      query = query.order(sortBy, orderDirection);

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    }
  });

  if (!category && !isLoading) {
    return <Navigate to="/categories" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {decodeURIComponent(name || '')}
            </h1>
            <p className="text-muted-foreground text-lg mb-6">
              {category?.description || 'Explore amazing designs and resources in this category'}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search content..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Content Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="design">Designs</SelectItem>
                  <SelectItem value="component_library">Component Libraries</SelectItem>
                  <SelectItem value="ui_component">UI Components</SelectItem>
                  <SelectItem value="website">Websites</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-48">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Newest</SelectItem>
                  <SelectItem value="view_count">Most Viewed</SelectItem>
                  <SelectItem value="like_count">Most Liked</SelectItem>
                  <SelectItem value="title">Title A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-48 bg-muted rounded"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-6 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : content?.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No content found</h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Try adjusting your search terms or filters." 
                  : "No content available in this category yet."
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content?.map((item) => (
                <ContentCard
                  key={item.id}
                  {...item}
                  category={item.categories}
                  tags={item.content_tags?.map(ct => ct.tags).filter(Boolean)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}