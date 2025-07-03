import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import FirecrawlApp from 'https://esm.sh/@mendable/firecrawl-js@1.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Top 25 design websites to scrape
const TOP_DESIGN_WEBSITES = [
  {
    url: 'https://dribbble.com/shots/popular',
    type: 'design',
    category: 'ui-kits',
    name: 'Dribbble Popular'
  },
  {
    url: 'https://www.behance.net/galleries/ui-ux',
    type: 'design', 
    category: 'ui-kits',
    name: 'Behance UI/UX'
  },
  {
    url: 'https://ui8.net/categories/ui-kits',
    type: 'ui_component',
    category: 'ui-kits', 
    name: 'UI8 UI Kits'
  },
  {
    url: 'https://www.figma.com/community/file/ui-kits',
    type: 'ui_component',
    category: 'ui-kits',
    name: 'Figma Community UI Kits'
  },
  {
    url: 'https://material-ui.com/components/',
    type: 'component_library',
    category: 'component-libraries',
    name: 'Material-UI Components'
  },
  {
    url: 'https://ant.design/components/overview/',
    type: 'component_library', 
    category: 'component-libraries',
    name: 'Ant Design Components'
  },
  {
    url: 'https://chakra-ui.com/docs/components',
    type: 'component_library',
    category: 'component-libraries', 
    name: 'Chakra UI Components'
  },
  {
    url: 'https://mantine.dev/core/button/',
    type: 'component_library',
    category: 'component-libraries',
    name: 'Mantine Components'
  },
  {
    url: 'https://headlessui.dev/',
    type: 'component_library',
    category: 'component-libraries',
    name: 'Headless UI'
  },
  {
    url: 'https://tailwindui.com/components', 
    type: 'ui_component',
    category: 'component-libraries',
    name: 'Tailwind UI Components'
  },
  {
    url: 'https://ui.shadcn.com/docs/components',
    type: 'component_library',
    category: 'component-libraries',
    name: 'shadcn/ui Components'
  },
  {
    url: 'https://nextui.org/docs/components',
    type: 'component_library', 
    category: 'component-libraries',
    name: 'NextUI Components'
  },
  {
    url: 'https://www.framer.com/motion/',
    type: 'component_library',
    category: 'component-libraries',
    name: 'Framer Motion'
  },
  {
    url: 'https://styled-components.com/',
    type: 'component_library',
    category: 'component-libraries', 
    name: 'Styled Components'
  },
  {
    url: 'https://stitches.dev/',
    type: 'component_library',
    category: 'component-libraries',
    name: 'Stitches CSS-in-JS'
  },
  {
    url: 'https://www.radix-ui.com/primitives',
    type: 'component_library',
    category: 'component-libraries',
    name: 'Radix UI Primitives'
  },
  {
    url: 'https://arco.design/react/components/overview',
    type: 'component_library',
    category: 'component-libraries',
    name: 'Arco Design'
  },
  {
    url: 'https://react-bootstrap.github.io/components/',
    type: 'component_library',
    category: 'component-libraries', 
    name: 'React Bootstrap'
  },
  {
    url: 'https://grommet.io/components',
    type: 'component_library',
    category: 'component-libraries',
    name: 'Grommet Components'
  },
  {
    url: 'https://evergreen.segment.com/components',
    type: 'component_library',
    category: 'component-libraries',
    name: 'Evergreen Components' 
  },
  {
    url: 'https://blueprint.palantir.com/docs/',
    type: 'component_library',
    category: 'component-libraries',
    name: 'Blueprint Components'
  },
  {
    url: 'https://reactstrap.github.io/components/',
    type: 'component_library', 
    category: 'component-libraries',
    name: 'Reactstrap Components'
  },
  {
    url: 'https://semantic-ui-react.github.io/collections/',
    type: 'component_library',
    category: 'component-libraries',
    name: 'Semantic UI React'
  },
  {
    url: 'https://rebassjs.org/components/',
    type: 'component_library',
    category: 'component-libraries', 
    name: 'Rebass Components'
  },
  {
    url: 'https://theme-ui.com/components/',
    type: 'component_library',
    category: 'component-libraries',
    name: 'Theme UI Components'
  }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting automated scraping of top design websites...');

    // Get Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use service role for admin operations
    );

    // Initialize Firecrawl
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      throw new Error('Firecrawl API key not configured');
    }

    const app = new FirecrawlApp({ apiKey });

    // Get categories mapping
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name');

    const categoryMap = new Map();
    categories?.forEach(cat => {
      const normalizedName = cat.name.toLowerCase().replace(/\s+/g, '-');
      categoryMap.set(normalizedName, cat.id);
      
      // Add some mapping variations
      if (cat.name === 'Component Libraries') {
        categoryMap.set('component-libraries', cat.id);
      }
      if (cat.name === 'UI Kits') {
        categoryMap.set('ui-kits', cat.id);
      }
    });

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process websites in batches to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < TOP_DESIGN_WEBSITES.length; i += batchSize) {
      const batch = TOP_DESIGN_WEBSITES.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (website) => {
          try {
            console.log(`Scraping ${website.name}: ${website.url}`);

            // Scrape the website
            const scrapeResult = await app.scrapeUrl(website.url, {
              formats: ['markdown', 'html'],
              onlyMainContent: true,
              includeTags: ['title', 'meta', 'img'],
              excludeTags: ['script', 'style', 'nav', 'footer'],
              waitFor: 2000, // Wait 2 seconds for dynamic content
            });

            if (!scrapeResult.success) {
              console.error(`Failed to scrape ${website.name}:`, scrapeResult.error);
              results.errors.push(`${website.name}: ${scrapeResult.error}`);
              results.failed++;
              return;
            }

            const { data } = scrapeResult;
            
            // Extract useful information
            const title = data.metadata?.title || website.name;
            const description = data.metadata?.description || 
              `${website.name} - Curated design resources and components`;
            
            // Try to find images in the scraped content
            let image_url = data.metadata?.ogImage || data.metadata?.image;
            
            // Extract first image from content if no og:image found
            if (!image_url && data.html) {
              const imgRegex = /<img[^>]+src="([^">]+)"/i;
              const imgMatch = data.html.match(imgRegex);
              if (imgMatch && imgMatch[1]) {
                image_url = imgMatch[1];
                // Make relative URLs absolute
                if (image_url.startsWith('/')) {
                  const urlObj = new URL(website.url);
                  image_url = `${urlObj.protocol}//${urlObj.host}${image_url}`;
                }
              }
            }

            // Get category ID
            const category_id = categoryMap.get(website.category) || null;

            // Check if content already exists
            const { data: existing } = await supabase
              .from('content')
              .select('id')
              .eq('url', website.url)
              .single();

            if (existing) {
              console.log(`Content already exists for ${website.name}, skipping...`);
              results.successful++;
              return;
            }

            // Insert content into database
            const { error: insertError } = await supabase
              .from('content')
              .insert({
                title,
                description,
                content_type: website.type,
                status: 'approved', // Auto-approve scraped content from trusted sources
                url: website.url,
                image_url,
                source_website: new URL(website.url).hostname,
                author_name: website.name,
                submitted_by: null, // System-generated content
                category_id,
                scraped_data: {
                  metadata: data.metadata,
                  markdown: data.markdown?.substring(0, 5000), // Limit size
                  scraped_at: new Date().toISOString(),
                  original_url: website.url,
                  scraper_source: 'automated-top-25'
                },
                view_count: Math.floor(Math.random() * 1000) + 100, // Random initial views
                like_count: Math.floor(Math.random() * 100) + 10, // Random initial likes
              });

            if (insertError) {
              console.error(`Database insert error for ${website.name}:`, insertError);
              results.errors.push(`${website.name}: Database error - ${insertError.message}`);
              results.failed++;
              return;
            }

            // Auto-create tags from website type and category
            const tags = [website.type.replace('_', '-'), website.category, 'curated', 'popular'];
            
            for (const tagName of tags) {
              if (tagName && tagName.length > 2) {
                const { data: tag } = await supabase
                  .from('tags')
                  .upsert({ name: tagName.toLowerCase() }, { onConflict: 'name' })
                  .select()
                  .single();

                if (tag) {
                  // Get the content ID we just inserted
                  const { data: newContent } = await supabase
                    .from('content')
                    .select('id')
                    .eq('url', website.url)
                    .single();

                  if (newContent) {
                    await supabase
                      .from('content_tags')
                      .upsert({
                        content_id: newContent.id,
                        tag_id: tag.id
                      }, { onConflict: 'content_id,tag_id' });
                  }
                }
              }
            }

            console.log(`Successfully scraped and saved: ${website.name}`);
            results.successful++;

          } catch (error) {
            console.error(`Error processing ${website.name}:`, error);
            results.errors.push(`${website.name}: ${error.message}`);
            results.failed++;
          }
        })
      );

      // Add delay between batches to be respectful to APIs
      if (i + batchSize < TOP_DESIGN_WEBSITES.length) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
      }
    }

    console.log('Automated scraping completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Automated scraping completed. ${results.successful} successful, ${results.failed} failed.`,
        results,
        totalProcessed: TOP_DESIGN_WEBSITES.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Automated scraping function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Failed to complete automated scraping process'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});