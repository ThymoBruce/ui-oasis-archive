import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Eye, 
  ExternalLink, 
  User, 
  Calendar,
  Bookmark,
  Share2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContentCardProps {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  thumbnail_url?: string;
  content_type: 'design' | 'component_library' | 'ui_component' | 'website';
  url?: string;
  author_name?: string;
  view_count: number;
  like_count: number;
  created_at: string;
  category?: { name: string };
  tags?: { name: string }[];
  isFavorited?: boolean;
}

export function ContentCard({
  id,
  title,
  description,
  image_url,
  thumbnail_url,
  content_type,
  url,
  author_name,
  view_count,
  like_count,
  created_at,
  category,
  tags,
  isFavorited = false
}: ContentCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorited, setFavorited] = useState(isFavorited);
  const [likes, setLikes] = useState(like_count);

  const displayImage = thumbnail_url || image_url || '/placeholder.svg';

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorites.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (favorited) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', id);
        setFavorited(false);
        toast({
          title: "Removed from favorites",
          description: "Item removed from your favorites.",
        });
      } else {
        await supabase
          .from('user_favorites')
          .insert({ user_id: user.id, content_id: id });
        setFavorited(true);
        toast({
          title: "Added to favorites",
          description: "Item saved to your favorites.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorites.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.share({
        title: title,
        text: description,
        url: `${window.location.origin}/content/${id}`,
      });
    } catch (error) {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/content/${id}`);
      toast({
        title: "Link copied",
        description: "Content link copied to clipboard.",
      });
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'component_library':
        return 'Component Library';
      case 'ui_component':
        return 'UI Component';
      case 'design':
        return 'Design';
      case 'website':
        return 'Website';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'component_library':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'ui_component':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'design':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'website':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-card">
      <Link to={`/content/${id}`} className="block">
        <div className="aspect-[16/10] overflow-hidden bg-muted">
          <img
            src={displayImage}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        </div>
        
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <Badge variant="secondary" className={getTypeColor(content_type)}>
              {getTypeLabel(content_type)}
            </Badge>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleFavorite}
              >
                <Heart 
                  className={`h-4 w-4 ${favorited ? 'fill-red-500 text-red-500' : ''}`} 
                />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          
          {description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {description}
            </p>
          )}

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag.name} variant="outline" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{view_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                <span>{likes}</span>
              </div>
            </div>
            
            {author_name && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate max-w-20">{author_name}</span>
              </div>
            )}
          </div>

          {url && (
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(url, '_blank');
                }}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                View Original
              </Button>
            </div>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}