import { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Heart, 
  Eye, 
  ExternalLink, 
  User, 
  Calendar, 
  Tag,
  Share2,
  Plus,
  ArrowLeft,
  Globe
} from 'lucide-react';

export default function ContentDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [favorited, setFavorited] = useState(false);

  const { data: content, isLoading } = useQuery({
    queryKey: ['content', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content')
        .select(`
          *,
          categories(name),
          content_tags(
            tags(name)
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Check if favorited by current user
      if (user) {
        const { data: favorite } = await supabase
          .from('user_favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('content_id', id)
          .single();
        
        setFavorited(!!favorite);
      }
      
      // Increment view count
      await supabase
        .from('content')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', id);
      
      return data;
    }
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      if (favorited) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', id);
      } else {
        await supabase
          .from('user_favorites')
          .insert({ user_id: user.id, content_id: id });
      }
    },
    onSuccess: () => {
      setFavorited(!favorited);
      toast({
        title: favorited ? "Removed from favorites" : "Added to favorites",
        description: favorited 
          ? "Item removed from your favorites." 
          : "Item saved to your favorites.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleShare = async () => {
    try {
      await navigator.share({
        title: content?.title,
        text: content?.description,
        url: window.location.href,
      });
    } catch (error) {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Content link copied to clipboard.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="max-w-4xl mx-auto animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-muted rounded mb-6"></div>
            <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return <Navigate to="/browse" replace />;
  }

  const displayImage = content.thumbnail_url || content.image_url || '/placeholder.svg';
  const tags = content.content_tags?.map(ct => ct.tags).filter(Boolean) || [];

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'component_library': return 'Component Library';
      case 'ui_component': return 'UI Component';
      case 'design': return 'Design';
      case 'website': return 'Website';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            asChild
            className="mb-6"
          >
            <Link to="/browse">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Browse
            </Link>
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted mb-4">
                <img
                  src={displayImage}
                  alt={content.title}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              </div>
              
              {content.url && (
                <Button
                  onClick={() => window.open(content.url, '_blank')}
                  className="w-full"
                  size="lg"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original
                </Button>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <Badge variant="secondary">
                    {getTypeLabel(content.content_type)}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => user ? toggleFavorite.mutate() : toast({
                        title: "Sign in required",
                        description: "Please sign in to save favorites.",
                        variant: "destructive",
                      })}
                    >
                      <Heart className={`h-4 w-4 mr-2 ${favorited ? 'fill-red-500 text-red-500' : ''}`} />
                      {favorited ? 'Favorited' : 'Favorite'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>

                <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {content.title}
                </h1>

                {content.description && (
                  <p className="text-muted-foreground text-lg mb-6">
                    {content.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>{content.view_count || 0} views</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    <span>{content.like_count || 0} likes</span>
                  </div>
                  {content.author_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{content.author_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(content.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {content.categories && (
                  <div className="mb-4">
                    <Link 
                      to={`/categories/${content.categories.name}`}
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Globe className="h-4 w-4" />
                      {content.categories.name}
                    </Link>
                  </div>
                )}

                {tags.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Tag className="h-4 w-4" />
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag.name} variant="outline">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}