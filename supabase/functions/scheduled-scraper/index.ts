import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Scheduled scraper triggered');

    // Call the auto-scrape-designs function
    const response = await fetch(
      'https://lrhrkwdghhxducjdqbpi.supabase.co/functions/v1/auto-scrape-designs',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ scheduled: true }),
      }
    );

    const result = await response.json();

    console.log('Scheduled scraping completed:', result);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scheduled scraping completed successfully',
        result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Scheduled scraper error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Failed to run scheduled scraping'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});