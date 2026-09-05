let llmProvider = null;
let client = null;

function detectProvider() {
  if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-xxx')) {
    return 'anthropic';
  }
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-xxx')) {
    return 'openai';
  }
  return null;
}

function getClient() {
  if (client) return { client, provider: llmProvider };
  
  llmProvider = detectProvider();
  
  if (llmProvider === 'anthropic') {
    const Anthropic = require('@anthropic-ai/sdk');
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  } else if (llmProvider === 'openai') {
    const OpenAI = require('openai');
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  
  return { client, provider: llmProvider };
}

async function chat(systemPrompt, userMessage, options = {}) {
  const { client: llm, provider } = getClient();
  
  if (!llm) {
    // Fallback: generate a reasonable response without LLM
    return generateFallbackResponse(systemPrompt, userMessage);
  }

  try {
    if (provider === 'anthropic') {
      const response = await llm.messages.create({
        model: options.model || 'claude-sonnet-4-20250514',
        max_tokens: options.maxTokens || 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
      return response.content[0].text;
    } else {
      const response = await llm.chat.completions.create({
        model: options.model || 'gpt-4o-mini',
        max_tokens: options.maxTokens || 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      });
      return response.choices[0].message.content;
    }
  } catch (err) {
    console.error(`LLM (${provider}) error:`, err.message);
    return generateFallbackResponse(systemPrompt, userMessage);
  }
}

function generateFallbackResponse(systemPrompt, userMessage) {
  // Rule-based fallback when no LLM is available
  const lower = userMessage.toLowerCase();
  const isDevanagari = /[\u0900-\u097F]/.test(userMessage);
  
  if (isDevanagari) {
    if (lower.includes('दिखाओ') || lower.includes('क्या') || lower.includes('अनमैच्ड')) {
      return 'यह ट्रांजेक्शन मैच नहीं हो सका। कृपया बैंक स्टेटमेंट और लेज़र में इस राशि की जांच करें। (LLM not configured — using rule-based fallback)';
    }
    return 'विश्लेषण पूरा हुआ। अधिक जानकारी के लिए कृपया रिकंसिलिएशन टेबल में ट्रांजेक्शन विवरण की समीक्षा करें। (LLM not configured — using rule-based fallback)';
  }

  if (lower.includes('hisab') || lower.includes('rupay') || lower.includes('kaha')) {
    return 'Is transaction ka hisab check karne ke liye, bank statement aur ledger dono mein ye amount search karein. Agar amount match nahi ho raha, toh bank fees ya timing difference ho sakta hai. (LLM not configured — using rule-based fallback)';
  }

  if (lower.includes('exception') || lower.includes('mismatch') || lower.includes('unmatched')) {
    return 'This transaction could not be matched. Possible reasons: timing difference between bank processing and ledger entry, bank fees deducted but not recorded in ledger, or a data entry discrepancy. Please review the source documents manually. (LLM not configured — using rule-based fallback)';
  }
  
  return 'Analysis complete. Please review the transaction details in the reconciliation table for more information. (LLM not configured — using rule-based response)';
}

const MULTILINGUAL_SYSTEM_PROMPT = `You are a finance operations AI assistant for the ToTally app. 

CRITICAL LANGUAGE INSTRUCTION:
Respond in the same language the user used. If they wrote in Hindi (Devanagari), respond in Hindi. If they wrote in Hinglish (Roman-script Hindi), respond in Hinglish. If they wrote in English, respond in English.
Do not default to English unless the user wrote in English.`;

module.exports = { chat, getClient, detectProvider, MULTILINGUAL_SYSTEM_PROMPT };
