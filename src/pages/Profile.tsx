import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ContentCard } from '@/components/ContentCard';
import { 
  User, 
  Settings, 
  Upload, 
  Heart, 
  Eye, 
  Calendar,
  Edit,
  Save,
  X,
  Loader2,
  Star
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    username: '',
    full_name: '',
    bio: '',
    website_url: '',
  });

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setProfileData({
          username: data.username || '',
          full_name: data.full_name || '',
          bio: data.bio || '',
          website_url: data.website_url || '',
        });
      }
      
      return data;
    },
  });

  // Fetch user's content
  const { data: userContent } = useQuery({
    queryKey: ['user-content', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content')
        .select(`
          *,
          categories(name),
          content_tags(tags(name))
        `)
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch user's favorites
  const { data: favorites } = useQuery({
    queryKey: ['user-favorites', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          content_id,
          content:content_id(
            *,
            categories(name),
            content_tags(tags(name))
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data?.map(fav => ({
        ...fav.content,
        isFavorited: true
      }));
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...data,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const getInitials = (name?: string) => {
    if (!name) return user.email?.[0]?.toUpperCase() || 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStats = () => ({
    uploads: userContent?.length || 0,
    favorites: favorites?.length || 0,
    totalViews: userContent?.reduce((sum, content) => sum + content.view_count, 0) || 0,
    totalLikes: userContent?.reduce((sum, content) => sum + content.like_count, 0) || 0,
  });

  const stats = getStats();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-start gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h1 className="text-2xl font-bold">
                        {profile?.full_name || 'Your Name'}
                      </h1>
                      {profile?.username && (
                        <p className="text-muted-foreground">@{profile.username}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(!isEditing)}
                      disabled={updateProfileMutation.isPending}
                    >
                      {isEditing ? (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {profile?.bio && (
                    <p className="text-muted-foreground mb-4">{profile.bio}</p>
                  )}
                  
                  {profile?.website_url && (
                    <a
                      href={profile.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {profile.website_url}
                    </a>
                  )}
                  
                  <div className="flex items-center gap-6 mt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{stats.uploads}</div>
                      <div className="text-sm text-muted-foreground">Uploads</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{stats.favorites}</div>
                      <div className="text-sm text-muted-foreground">Favorites</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{stats.totalViews}</div>
                      <div className="text-sm text-muted-foreground">Total Views</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{stats.totalLikes}</div>
                      <div className="text-sm text-muted-foreground">Total Likes</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            {isEditing && (
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profileData.username}
                        onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="your-username"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website_url">Website</Label>
                    <Input
                      id="website_url"
                      type="url"
                      value={profileData.website_url}
                      onChange={(e) => setProfileData(prev => ({ ...prev, website_url: e.target.value }))}
                      placeholder="https://your-website.com"
                    />
                  </div>
                  
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            )}
          </Card>

          {/* Content Tabs */}
          <Tabs defaultValue="uploads" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="uploads" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                My Uploads ({stats.uploads})
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Favorites ({stats.favorites})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="uploads">
              {userContent?.length === 0 ? (
                <div className="text-center py-12">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No uploads yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Share your first design or component library with the community
                  </p>
                  <Button asChild>
                    <a href="/upload">Upload Your First Design</a>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userContent?.map((content) => (
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
            </TabsContent>

            <TabsContent value="favorites">
              {favorites?.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start exploring and save designs you love
                  </p>
                  <Button asChild>
                    <a href="/browse">Browse Designs</a>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favorites?.map((content) => (
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
                      tags={Array.isArray(content.content_tags) ? content.content_tags?.map((ct: any) => ct.tags) : []}
                      isFavorited={content.isFavorited}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}