import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import FirecrawlApp from 'https://esm.sh/@mendable/firecrawl-js@1.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScrapeRequest {
  url: string;
  content_type: 'design' | 'component_library' | 'ui_component' | 'website';
  category_id?: string;
  auto_approve?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } }
      }
    );

    // Get user from auth
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { url, content_type, category_id, auto_approve = false }: ScrapeRequest = await req.json();

    if (!url) {
      throw new Error('URL is required');
    }

    console.log(`Starting scrape for URL: ${url}`);

    // Initialize Firecrawl
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      throw new Error('Firecrawl API key not configured');
    }

    const app = new FirecrawlApp({ apiKey });

    // Scrape the website
    const scrapeResult = await app.scrapeUrl(url, {
      formats: ['markdown', 'html'],
      onlyMainContent: true,
      includeTags: ['title', 'meta', 'img'],
      excludeTags: ['script', 'style'],
    });

    if (!scrapeResult.success) {
      throw new Error(`Failed to scrape website: ${scrapeResult.error}`);
    }

    console.log('Scrape successful, processing data...');

    const { data } = scrapeResult;
    
    // Extract useful information
    const title = data.metadata?.title || new URL(url).hostname;
    const description = data.metadata?.description || data.markdown?.substring(0, 200) + '...';
    const author_name = data.metadata?.author || new URL(url).hostname;
    
    // Try to find images in the scraped content
    let image_url = data.metadata?.ogImage || data.metadata?.image;
    
    // Extract images from content if no og:image found
    if (!image_url && data.html) {
      const imgRegex = /<img[^>]+src="([^">]+)"/i;
      const imgMatch = data.html.match(imgRegex);
      if (imgMatch) {
        image_url = imgMatch[1];
        // Make relative URLs absolute
        if (image_url.startsWith('/')) {
          const urlObj = new URL(url);
          image_url = `${urlObj.protocol}//${urlObj.host}${image_url}`;
        }
      }
    }

    // Insert content into database
    const { data: insertedContent, error: insertError } = await supabase
      .from('content')
      .insert({
        title,
        description,
        content_type,
        status: auto_approve ? 'approved' : 'pending',
        url,
        image_url,
        source_website: new URL(url).hostname,
        author_name,
        submitted_by: user.id,
        category_id,
        scraped_data: {
          metadata: data.metadata,
          markdown: data.markdown?.substring(0, 5000), // Limit size
          scraped_at: new Date().toISOString(),
          original_url: url
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    console.log('Content successfully saved to database');

    // Auto-create tags from metadata keywords
    if (data.metadata?.keywords) {
      const keywords = data.metadata.keywords.split(',').map((k: string) => k.trim()).slice(0, 5);
      
      for (const keyword of keywords) {
        if (keyword && keyword.length > 2) {
          // Insert tag if it doesn't exist
          const { data: tag } = await supabase
            .from('tags')
            .upsert({ name: keyword.toLowerCase() }, { onConflict: 'name' })
            .select()
            .single();

          if (tag) {
            // Link tag to content
            await supabase
              .from('content_tags')
              .insert({
                content_id: insertedContent.id,
                tag_id: tag.id
              })
              .onConflict('content_id,tag_id')
              .ignoreDuplicates();
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: insertedContent,
        message: auto_approve ? 'Content scraped and approved' : 'Content scraped and pending approval'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Scrape function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});