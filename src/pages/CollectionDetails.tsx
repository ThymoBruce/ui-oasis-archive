import { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { ContentCard } from '@/components/ContentCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, User, Calendar, Globe, Lock, Trash2, Plus } from 'lucide-react';

export default function CollectionDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: collection, isLoading } = useQuery({
    queryKey: ['collection', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_collections')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: collectionItems } = useQuery({
    queryKey: ['collection-items', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_items')
        .select(`
          *,
          content(
            *,
            categories(name)
          )
        `)
        .eq('collection_id', id)
        .order('added_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const removeFromCollection = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('collection_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Item removed",
        description: "Item has been removed from the collection.",
      });
      queryClient.invalidateQueries({ queryKey: ['collection-items', id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-6 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!collection) {
    return <Navigate to="/collections" replace />;
  }

  const canEdit = user && user.id === collection.user_id;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {collection.name}
                </h1>
                <p className="text-muted-foreground text-lg mb-4">
                  {collection.description || 'A curated collection of design resources'}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>Collection Owner</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(collection.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {collection.is_public ? (
                      <>
                        <Globe className="h-4 w-4 text-green-500" />
                        <span>Public</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        <span>Private</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {canEdit && (
                <Button asChild>
                  <Link to="/browse">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Items
                  </Link>
                </Button>
              )}
            </div>

            <Badge variant="secondary">
              <BookOpen className="h-3 w-3 mr-1" />
              {collectionItems?.length || 0} items
            </Badge>
          </div>

          {collectionItems?.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No items in this collection</h3>
              <p className="text-muted-foreground mb-4">
                {canEdit ? "Start adding items to build your collection." : "This collection doesn't have any items yet."}
              </p>
              {canEdit && (
                <Button asChild>
                  <Link to="/browse">
                    <Plus className="h-4 w-4 mr-2" />
                    Browse Content
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collectionItems?.map((item) => (
                <div key={item.id} className="relative group">
                  <ContentCard {...item.content} />
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFromCollection.mutate(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}