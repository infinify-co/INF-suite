exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'OPENAI_API_KEY not configured' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { messages, prompt, model } = body;

    // Allow either `messages` array or single `prompt`
    const payload = messages && Array.isArray(messages)
      ? { model: model || 'gpt-4o-mini', messages }
      : { model: model || 'gpt-4o-mini', messages: [{ role: 'user', content: String(prompt || '') }] };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    return {
      statusCode: r.ok ? 200 : r.status,
      headers: corsHeaders(),
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Server error', detail: String(err && err.message ? err.message : err) })
    };
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}


