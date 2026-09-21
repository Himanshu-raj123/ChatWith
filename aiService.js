const axios = require('axios');
require('dotenv').config();

const cleanEnv = (val) => (typeof val === 'string' ? val.trim().replace(/^["']|["']$/g, '') : val);

// Supported active production models on Groq (with fallback order)
const DEFAULT_MODELS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];

async function askGroq(prompt) {
  const apiKey = cleanEnv(process.env.GROQ_API_KEY);
  if (!apiKey) {
    console.error('Groq API error: GROQ_API_KEY is not set in environment variables or .env');
    return 'Sorry, the AI agent is not configured properly (missing API key).';
  }

  const preferredModel = cleanEnv(process.env.GROQ_MODEL);
  const modelsToTry = [
    ...(preferredModel ? [preferredModel] : []),
    ...DEFAULT_MODELS.filter((m) => m !== preferredModel)
  ];

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const messages = [
    {
      role: 'system',
      content:
        'You are Swayam, a friendly, intelligent, and helpful AI assistant for the ChatWith messaging platform. Keep your answers concise, clear, and engaging.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const response = await axios.post(
        url,
        {
          model: model,
          messages: messages,
          reasoning_format: 'hidden'
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 25000
        }
      );

      let content = response.data?.choices?.[0]?.message?.content;
      if (content) {
        // Strip out any raw thinking tags if returned
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        return content;
      }
    } catch (error) {
      lastError = error;
      console.error(`Groq API error with model '${model}':`, error.response?.data || error.message);
    }
  }

  return 'Sorry, the AI agent is unavailable right now. Please try again in a moment.';
}

module.exports = { askGroq };