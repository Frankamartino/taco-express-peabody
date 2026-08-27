/**
 * Diego — OpenAI Responses API + web_search (same pattern as Massimo).
 * Weather, local alerts, short factual lookups for Peabody / North Shore.
 */
async function runDiegoWebSearch(query) {
  const q = String(query || '').trim();
  if (!q) return 'Need a search query.';

  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    return (
      "I can't search the web right now — search isn't configured. " +
      'Tell the customer honestly; do NOT invent weather or facts.'
    );
  }

  const model = String(process.env.OPENAI_SEARCH_MODEL || '').trim() || 'gpt-4o';

  try {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model,
        tools: [{ type: 'web_search' }],
        tool_choice: 'auto',
        input:
          'Search the web and answer in 2–4 sentences with key facts only. ' +
          'Prefer Peabody MA / North Shore / Boston area when the question is weather, storms, flood, fire, traffic, or local news. ' +
          'If it is a severe weather or emergency alert, say so clearly but calmly — not scary. ' +
          'Do not invent. If search fails, say so. ' +
          'Question: ' +
          q,
      }),
    });

    const bodyText = await r.text();
    if (!r.ok) {
      console.warn('[Diego web_search] HTTP', r.status, bodyText.slice(0, 300));
      if (r.status === 401 || r.status === 403) {
        return (
          "Web search isn't enabled on this API key. Say you can't look that up right now — do NOT guess."
        );
      }
      return "Search failed just now. Don't make up an answer — say you couldn't reach the web.";
    }

    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (e) {
      return "Search returned unreadable data. Don't invent an answer.";
    }

    let text = String(data.output_text || '').trim();
    if (!text && Array.isArray(data.output)) {
      const parts = [];
      data.output.forEach(function (item) {
        if (item && item.type === 'message' && Array.isArray(item.content)) {
          item.content.forEach(function (c) {
            if (c && (c.type === 'output_text' || c.type === 'text') && c.text) {
              parts.push(c.text);
            }
          });
        }
      });
      text = parts.join('\n').trim();
    }

    if (text) return 'Web search for "' + q + '": ' + text;
    return 'I searched for "' + q + '" but didn\'t get a clear answer. Don\'t invent facts.';
  } catch (e) {
    console.warn('[Diego web_search] error:', e);
    return "Search failed just now. Don't make up an answer — say you couldn't reach the web.";
  }
}

module.exports = { runDiegoWebSearch };
