import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, BookOpen, Users, Lock, Globe } from 'lucide-react';

export default function Collections() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: publicCollections, isLoading: loadingPublic } = useQuery({
    queryKey: ['collections', 'public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_collections')
        .select(`
          *,
          profiles(full_name, username),
          collection_items(count)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: myCollections, isLoading: loadingMy } = useQuery({
    queryKey: ['collections', 'my', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_collections')
        .select(`
          *,
          collection_items(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const filteredPublicCollections = publicCollections?.filter(collection =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMyCollections = myCollections?.filter(collection =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const CollectionCard = ({ collection, showAuthor = true }: { collection: any, showAuthor?: boolean }) => (
    <Card className="group transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">
              {collection.name}
            </CardTitle>
            <CardDescription className="text-sm mb-3">
              {collection.description || 'A curated collection of design resources'}
            </CardDescription>
            {showAuthor && collection.profiles && (
              <p className="text-xs text-muted-foreground">
                by {collection.profiles.full_name || collection.profiles.username || 'Anonymous'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {collection.is_public ? (
              <Globe className="h-4 w-4 text-green-500" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
            <BookOpen className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            {collection.collection_items?.[0]?.count || 0} items
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/collections/${collection.id}`}>
              View Collection
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Collections
              </h1>
              <p className="text-muted-foreground text-lg">
                Discover and create curated collections of design resources
              </p>
            </div>
            {user && (
              <Button asChild>
                <Link to="/profile?tab=collections">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Collection
                </Link>
              </Button>
            )}
          </div>

          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search collections..."
              className="pl-10 py-3"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Tabs defaultValue="public" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="public" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Public Collections
              </TabsTrigger>
              <TabsTrigger value="my" className="flex items-center gap-2" disabled={!user}>
                <BookOpen className="h-4 w-4" />
                My Collections
              </TabsTrigger>
            </TabsList>

            <TabsContent value="public" className="space-y-6">
              {loadingPublic ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-6 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-full"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-8 bg-muted rounded w-20"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPublicCollections?.map((collection) => (
                    <CollectionCard key={collection.id} collection={collection} />
                  ))}
                </div>
              )}

              {filteredPublicCollections?.length === 0 && !loadingPublic && (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No public collections found</h3>
                  <p className="text-muted-foreground">
                    Be the first to create and share a collection!
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="my" className="space-y-6">
              {!user ? (
                <div className="text-center py-12">
                  <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Sign in required</h3>
                  <p className="text-muted-foreground mb-4">
                    Sign in to view and manage your personal collections.
                  </p>
                  <Button asChild>
                    <Link to="/auth">Sign In</Link>
                  </Button>
                </div>
              ) : loadingMy ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-6 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-full"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-8 bg-muted rounded w-20"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMyCollections?.map((collection) => (
                    <CollectionCard key={collection.id} collection={collection} showAuthor={false} />
                  ))}
                </div>
              )}

              {filteredMyCollections?.length === 0 && !loadingMy && user && (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No collections yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start building your first collection of design resources.
                  </p>
                  <Button asChild>
                    <Link to="/profile?tab=collections">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Collection
                    </Link>
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}