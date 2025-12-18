const mongoose = require('mongoose');

const llmSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true,
      trim: true,
    },
    generatedContent: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      default: 'gemini-pro',
      enum: ['gpt-3.5-turbo', 'gpt-4', 'claude', 'gemini-pro', 'other'],
    },
    tokens: {
      inputTokens: {
        type: Number,
        default: 0,
      },
      outputTokens: {
        type: Number,
        default: 0,
      },
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    blog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog',
    },
    tone: {
      type: String,
      enum: ['professional', 'casual', 'formal', 'humorous', 'creative'],
      default: 'professional',
    },
    language: {
      type: String,
      default: 'english',
    },
    contentLength: {
      type: String,
      enum: ['short', 'medium', 'long'],
      default: 'medium',
    },
    temperature: {
      type: Number,
      min: 0,
      max: 2,
      default: 0.7,
    },
    maxTokens: {
      type: Number,
      default: 2000,
    },
    usage: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('LLM', llmSchema);
