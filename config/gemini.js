const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDe4UxKwnDmH6lxMRmC9RbiZsLQhnkAX2k';
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

module.exports = model;
