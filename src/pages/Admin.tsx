import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Play
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [isScrapingRunning, setIsScrapingRunning] = useState(false);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

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

          {/* Content Type Breakdown */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Content Breakdown by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {stats?.content.byType.design}
                  </div>
                  <div className="text-sm text-muted-foreground">Designs</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {stats?.content.byType.component_library}
                  </div>
                  <div className="text-sm text-muted-foreground">Libraries</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {stats?.content.byType.ui_component}
                  </div>
                  <div className="text-sm text-muted-foreground">Components</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {stats?.content.byType.website}
                  </div>
                  <div className="text-sm text-muted-foreground">Websites</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto Scraping Info */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Automated Content Scraping
              </CardTitle>
              <CardDescription>
                Automatically scrape content from top 25 design websites to populate the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/20">
                  <h4 className="font-semibold mb-2">What gets scraped:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Dribbble, Behance, UI8, Figma Community</li>
                    <li>• Material-UI, Ant Design, Chakra UI, Mantine</li>
                    <li>• Tailwind UI, shadcn/ui, NextUI, Headless UI</li>
                    <li>• Framer Motion, Styled Components, Radix UI</li>
                    <li>• React Bootstrap, Blueprint, Semantic UI</li>
                  </ul>
                </div>
                
                <Button 
                  onClick={handleAutoScrape}
                  disabled={isScrapingRunning}
                  size="lg"
                  className="w-full"
                >
                  {isScrapingRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scraping Top 25 Design Websites...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Start Auto-Scraping (25 Websites)
                    </>
                  )}
                </Button>
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