const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function askGroq(prompt){
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  try {
    const response = await axios.post(url, {
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }]
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Groq API error:', error.response?.data || error.message);
    return 'Sorry, the AI agent is unavailable right now.';
  }
}

module.exports = { askGroq };