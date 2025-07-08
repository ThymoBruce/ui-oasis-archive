import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings, 
  Zap, 
  Database, 
  Users, 
  BarChart3,
  RefreshCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Play,
  Plus,
  Trash2,
  Power,
  PowerOff
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isScrapingRunning, setIsScrapingRunning] = useState(false);
  const [showAddWebsite, setShowAddWebsite] = useState(false);
  const [newWebsiteName, setNewWebsiteName] = useState('');
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  // Fetch admin stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [contentResult, usersResult, categoriesResult] = await Promise.all([
        supabase.from('content').select('status, content_type'),
        supabase.from('profiles').select('id'),
        supabase.from('categories').select('id'),
      ]);

      const contentStats = {
        total: contentResult.data?.length || 0,
        approved: contentResult.data?.filter(c => c.status === 'approved').length || 0,
        pending: contentResult.data?.filter(c => c.status === 'pending').length || 0,
        byType: {
          design: contentResult.data?.filter(c => c.content_type === 'design').length || 0,
          component_library: contentResult.data?.filter(c => c.content_type === 'component_library').length || 0,
          ui_component: contentResult.data?.filter(c => c.content_type === 'ui_component').length || 0,
          website: contentResult.data?.filter(c => c.content_type === 'website').length || 0,
        }
      };

      return {
        content: contentStats,
        users: usersResult.data?.length || 0,
        categories: categoriesResult.data?.length || 0,
      };
    },
  });

  // Fetch auto-scrape websites
  const { data: autoScrapeWebsites, refetch: refetchWebsites } = useQuery({
    queryKey: ['auto-scrape-websites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auto_scrape_websites')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent content for moderation
  const { data: pendingContent, refetch: refetchPending } = useQuery({
    queryKey: ['pending-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content')
        .select(`
          *,
          categories(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const addWebsite = useMutation({
    mutationFn: async () => {
      if (!newWebsiteName || !newWebsiteUrl) throw new Error('Name and URL required');
      
      const { error } = await supabase
        .from('auto_scrape_websites')
        .insert({
          name: newWebsiteName,
          url: newWebsiteUrl
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Website added",
        description: "Website has been added to the auto-scrape list.",
      });
      
      setNewWebsiteName('');
      setNewWebsiteUrl('');
      setShowAddWebsite(false);
      refetchWebsites();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const toggleWebsiteActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('auto_scrape_websites')
        .update({ is_active: !isActive })
        .eq('id', id);
      
      if (error) throw error;
      return { isActive };
    },
    onSuccess: ({ isActive }) => {
      toast({
        title: "Website updated",
        description: `Website has been ${isActive ? 'disabled' : 'enabled'}.`,
      });
      refetchWebsites();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const removeWebsite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('auto_scrape_websites')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Website removed",
        description: "Website has been removed from the auto-scrape list.",
      });
      refetchWebsites();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleAutoScrape = async () => {
    setIsScrapingRunning(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('auto-scrape-designs');

      if (error) throw error;

      toast({
        title: "Auto-scraping completed!",
        description: `${data.results?.successful || 0} websites scraped successfully.`,
      });

      // Refresh stats
      refetchStats();
      refetchPending();
    } catch (error: any) {
      console.error('Auto-scrape error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to run auto-scraping",
        variant: "destructive",
      });
    } finally {
      setIsScrapingRunning(false);
    }
  };

  const approveContent = async (contentId: string) => {
    try {
      const { error } = await supabase
        .from('content')
        .update({ status: 'approved' })
        .eq('id', contentId);

      if (error) throw error;

      toast({
        title: "Content approved",
        description: "Content has been approved and is now live.",
      });

      refetchPending();
      refetchStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const rejectContent = async (contentId: string) => {
    try {
      const { error } = await supabase
        .from('content')
        .update({ status: 'rejected' })
        .eq('id', contentId);

      if (error) throw error;

      toast({
        title: "Content rejected",
        description: "Content has been rejected.",
        variant: "destructive",
      });

      refetchPending();
      refetchStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage content, users, and automated scraping
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Content</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.content.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.content.approved} approved, {stats?.content.pending} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.users}</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.categories}</div>
                <p className="text-xs text-muted-foreground">Content categories</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Auto Scraping</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleAutoScrape} 
                  disabled={isScrapingRunning}
                  className="w-full"
                  size="sm"
                >
                  {isScrapingRunning ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-2" />
                      Run Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Auto Scraping Websites Management */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Auto-Scrape Websites
                  </CardTitle>
                  <CardDescription>
                    Manage the list of websites to automatically scrape for content
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowAddWebsite(!showAddWebsite)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Website
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showAddWebsite && (
                <div className="mb-6 p-4 border rounded-lg bg-muted/20">
                  <h4 className="font-semibold mb-3">Add New Website</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Website Name</label>
                      <Input
                        placeholder="e.g., Dribbble"
                        value={newWebsiteName}
                        onChange={(e) => setNewWebsiteName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Website URL</label>
                      <Input
                        placeholder="https://dribbble.com"
                        value={newWebsiteUrl}
                        onChange={(e) => setNewWebsiteUrl(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      onClick={() => addWebsite.mutate()}
                      disabled={addWebsite.isPending}
                      size="sm"
                    >
                      {addWebsite.isPending ? 'Adding...' : 'Add Website'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddWebsite(false);
                        setNewWebsiteName('');
                        setNewWebsiteUrl('');
                      }}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {autoScrapeWebsites?.map((website) => (
                  <div key={website.id} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{website.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {website.url}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleWebsiteActive.mutate({ id: website.id, isActive: website.is_active })}
                          className="p-1"
                          disabled={toggleWebsiteActive.isPending}
                        >
                          {website.is_active ? (
                            <Power className="h-3 w-3 text-green-500" />
                          ) : (
                            <PowerOff className="h-3 w-3 text-red-500" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeWebsite.mutate(website.id)}
                          className="p-1"
                          disabled={removeWebsite.isPending}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <Badge
                      variant={website.is_active ? "default" : "secondary"}
                      className="mt-2"
                    >
                      {website.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Content Moderation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Content ({pendingContent?.length || 0})
              </CardTitle>
              <CardDescription>
                Review and moderate user-submitted content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingContent?.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">No pending content to review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingContent?.map((content) => (
                    <div key={content.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{content.title}</h4>
                            <Badge variant="outline">{content.content_type}</Badge>
                            {content.categories && (
                              <Badge variant="secondary">{content.categories.name}</Badge>
                            )}
                          </div>
                          
                          {content.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {content.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              By: {content.author_name || 'Anonymous'}
                            </span>
                            <span>
                              {new Date(content.created_at).toLocaleDateString()}
                            </span>
                            {content.url && (
                              <a 
                                href={content.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                View Original
                              </a>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveContent(content.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectContent(content.id)}
                          >
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
