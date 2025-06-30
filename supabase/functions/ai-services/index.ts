import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Create a Supabase client with the service role key
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// Handle OpenAI API requests
async function handleOpenAI(req: Request) {
  try {
    const { endpoint, data } = await req.json();
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if streaming is requested
    const isStreaming = data.stream === true;

    console.log(`OpenAI request to endpoint: ${endpoint}`);
    console.log(`Streaming: ${isStreaming}`);

    // Forward the request to OpenAI
    const openaiResponse = await fetch(`https://api.openai.com/v1/${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    console.log(`OpenAI response status: ${openaiResponse.status}`);

    // If streaming is requested, pipe the response directly
    if (isStreaming) {
      return new Response(openaiResponse.body, {
        status: openaiResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        }
      });
    }

    // For regular responses, parse and return JSON
    const responseData = await openaiResponse.json();
    
    return new Response(
      JSON.stringify(responseData),
      { 
        status: openaiResponse.status, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("OpenAI API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process OpenAI request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// Handle ElevenLabs API requests
async function handleElevenLabs(req: Request) {
  try {
    const { endpoint, data, method = "POST" } = await req.json();
    const elevenlabsKey = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!elevenlabsKey) {
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`ElevenLabs request to endpoint: ${endpoint}`);
    console.log(`Method: ${method}`);
    console.log(`Data: ${JSON.stringify(data).substring(0, 100)}...`);

    // Forward the request to ElevenLabs
    const elevenlabsResponse = await fetch(`https://api.elevenlabs.io/v1/${endpoint}`, {
      method,
      headers: {
        "xi-api-key": elevenlabsKey,
        "Content-Type": "application/json",
      },
      body: method !== "GET" ? JSON.stringify(data) : undefined,
    });

    console.log(`ElevenLabs response status: ${elevenlabsResponse.status}`);
    console.log(`ElevenLabs response content-type: ${elevenlabsResponse.headers.get("content-type")}`);

    // For audio responses, we need to handle binary data
    if (elevenlabsResponse.headers.get("content-type")?.includes("audio/")) {
      const audioBuffer = await elevenlabsResponse.arrayBuffer();
      console.log(`Received audio buffer of size: ${audioBuffer.byteLength} bytes`);
      
      return new Response(audioBuffer, { 
        status: elevenlabsResponse.status, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": elevenlabsResponse.headers.get("content-type") || "audio/mpeg",
          "Content-Length": audioBuffer.byteLength.toString()
        } 
      });
    }

    // For JSON responses
    const responseData = await elevenlabsResponse.json();
    
    return new Response(
      JSON.stringify(responseData),
      { 
        status: elevenlabsResponse.status, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("ElevenLabs API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process ElevenLabs request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// Handle DALL-E API requests
async function handleDallE(req: Request) {
  try {
    const { prompt } = await req.json();
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`DALL-E request with prompt: ${prompt.substring(0, 50)}...`);

    // Forward the request to OpenAI's DALL-E endpoint
    const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: "1024x1024"
      }),
    });

    console.log(`DALL-E response status: ${dalleResponse.status}`);
    
    const responseData = await dalleResponse.json();
    console.log(`DALL-E response data: ${JSON.stringify(responseData).substring(0, 100)}...`);
    
    return new Response(
      JSON.stringify(responseData),
      { 
        status: dalleResponse.status, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("DALL-E API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process DALL-E request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Parse the request body to determine which service to route to
  try {
    const body = await req.json();
    const service = body.service;

    console.log(`Request received for service: ${service}`);

    // Route to the appropriate service handler based on the service field
    if (service === "openai") {
      // Create a new request with the modified body for OpenAI
      const newReq = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify({
          endpoint: body.endpoint,
          data: body.data
        })
      });
      return handleOpenAI(newReq);
    } else if (service === "elevenlabs") {
      // Create a new request with the modified body for ElevenLabs
      const newReq = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify({
          endpoint: body.endpoint,
          data: body.data,
          method: body.method
        })
      });
      return handleElevenLabs(newReq);
    } else if (service === "dalle") {
      // Create a new request with the modified body for DALL-E
      const newReq = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify({
          prompt: body.prompt
        })
      });
      return handleDallE(newReq);
    }

    // If no service matches
    return new Response(
      JSON.stringify({ error: "Invalid service requested" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Request parsing error:", error);
    return new Response(
      JSON.stringify({ error: "Invalid request format" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});