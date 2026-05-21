const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function askGemini(prompt){
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY;
  try {
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }]
    });

    // Extract the AI's reply
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    return 'Sorry, the AI agent is unavailable right now.';
  }
}

module.exports = { askGemini };