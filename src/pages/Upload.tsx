import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload as UploadIcon, 
  Globe, 
  Image, 
  Link as LinkIcon,
  Plus,
  Loader2
} from 'lucide-react';

export default function Upload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Form states
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<'design' | 'component_library' | 'ui_component' | 'website'>('design');
  const [categoryId, setCategoryId] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [authorName, setAuthorName] = useState('');

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleScrapeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-website', {
        body: {
          url,
          content_type: contentType,
          category_id: categoryId || null,
          auto_approve: false
        }
      });

      if (error) throw error;

      toast({
        title: "Website scraped successfully!",
        description: "Your content has been submitted for review.",
      });

      // Reset form
      setUrl('');
      setContentType('design');
      setCategoryId('');
      
      navigate('/my-uploads');
    } catch (error: any) {
      console.error('Scrape error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to scrape website",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('content')
        .insert({
          title,
          description,
          content_type: contentType,
          status: 'pending',
          url: url || null,
          image_url: imageUrl || null,
          author_name: authorName || null,
          submitted_by: user.id,
          category_id: categoryId || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Content submitted successfully!",
        description: "Your content has been submitted for review.",
      });

      // Reset form
      setTitle('');
      setDescription('');
      setUrl('');
      setImageUrl('');
      setAuthorName('');
      setContentType('design');
      setCategoryId('');

      navigate('/my-uploads');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit content",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Share Your Design</h1>
            <p className="text-muted-foreground">
              Add your UI designs, component libraries, or websites to our community collection
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Upload Content
              </CardTitle>
              <CardDescription>
                Choose how you'd like to add your content - scrape from a URL or add manually
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="scrape" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="scrape" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Scrape from URL
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="flex items-center gap-2">
                    <UploadIcon className="h-4 w-4" />
                    Add Manually
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="scrape">
                  <form onSubmit={handleScrapeSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="scrape-url">Website URL *</Label>
                      <Input
                        id="scrape-url"
                        type="url"
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        We'll automatically extract title, description, and images from this URL
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label>Content Type *</Label>
                      <RadioGroup
                        value={contentType}
                        onValueChange={(value) => setContentType(value as any)}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="design" id="scrape-design" />
                          <Label htmlFor="scrape-design">Design</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="component_library" id="scrape-library" />
                          <Label htmlFor="scrape-library">Component Library</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="ui_component" id="scrape-component" />
                          <Label htmlFor="scrape-component">UI Component</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="website" id="scrape-website" />
                          <Label htmlFor="scrape-website">Website</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scrape-category">Category</Label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Scraping...
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 mr-2" />
                          Scrape & Submit
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="manual">
                  <form onSubmit={handleManualSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="manual-title">Title *</Label>
                      <Input
                        id="manual-title"
                        placeholder="Amazing UI Component Library"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-description">Description</Label>
                      <Textarea
                        id="manual-description"
                        placeholder="Describe your design, component library, or website..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Content Type *</Label>
                      <RadioGroup
                        value={contentType}
                        onValueChange={(value) => setContentType(value as any)}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="design" id="manual-design" />
                          <Label htmlFor="manual-design">Design</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="component_library" id="manual-library" />
                          <Label htmlFor="manual-library">Component Library</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="ui_component" id="manual-component" />
                          <Label htmlFor="manual-component">UI Component</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="website" id="manual-website" />
                          <Label htmlFor="manual-website">Website</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-category">Category</Label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-url">URL</Label>
                      <Input
                        id="manual-url"
                        type="url"
                        placeholder="https://example.com (optional)"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-image">Image URL</Label>
                      <Input
                        id="manual-image"
                        type="url"
                        placeholder="https://example.com/image.jpg (optional)"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-author">Author Name</Label>
                      <Input
                        id="manual-author"
                        placeholder="Your name or the original author (optional)"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <UploadIcon className="h-4 w-4 mr-2" />
                          Submit for Review
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">Review Process</h4>
                <p className="text-sm text-muted-foreground">
                  All submissions are reviewed by our team to ensure quality and relevance. 
                  You'll be notified once your content is approved and live on the platform.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}