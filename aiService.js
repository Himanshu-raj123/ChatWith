const axios = require('axios');

const cleanEnv = (val) => (typeof val === 'string' ? val.replace(/^["']|["']$/g, '').trim() : val);

const CANDIDATE_MODELS = [
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b'
];

async function askGroq(prompt) {
  const apiKey = cleanEnv(process.env.GROQ_API_KEY);
  if (!apiKey) {
    console.error("GROQ_API_KEY is not configured in environment variables.");
    return "Sorry, the AI agent is not configured properly (missing API key).";
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const selectedModel = cleanEnv(process.env.GROQ_MODEL) || CANDIDATE_MODELS[0];
  const modelsToTry = [selectedModel, ...CANDIDATE_MODELS.filter(m => m !== selectedModel)];

  for (const model of modelsToTry) {
    try {
      const response = await axios.post(
        url,
        {
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are Swayam, a friendly, intelligent, and helpful AI assistant for the ChatWith platform.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error(`Groq API error with model [${model}]:`, error.response?.data || error.message);
      // Try next model if model not found or decommissioned
      continue;
    }
  }

  return 'Sorry, the AI agent is unavailable right now. Please try again in a moment.';
}

module.exports = { askGroq };