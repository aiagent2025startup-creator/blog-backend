const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDe4UxKwnDmH6lxMRmC9RbiZsLQhnkAX2k';
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // The SDK doesn't have a direct listModels, but we can try to use the underlying fetch or a known model
        console.log('Attempting to list models via a dummy request or checking common names...');

        // Actually, let's try a different approach. We'll try 'gemini-1.5-flash' and 'gemini-1.5-pro' again but with more logging.
        // Or better, let's try to use the REST API directly via fetch to list models.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log('Available Models:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
