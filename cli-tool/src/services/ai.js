import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { Ollama } from "ollama";

export async function generateAnalysis(diff, config) {
  const provider = config.provider || 'gemini';
  const prompt = `Review this code diff and rate it 1-10. Focus on bugs and security:\n\n${diff}`;

  console.log(`🤖 Consulting ${provider.toUpperCase()}...`);

  try {
    switch (provider) {
      case 'ollama':
        // [FEATURE] Zero-Cloud Local AI
        const ollama = new Ollama({ host: config.url || 'http://127.0.0.1:11434' });
        const response = await ollama.chat({
          model: config.model || 'llama3',
          messages: [{ role: 'user', content: prompt }],
        });
        return response.message.content;

      case 'openai':
        if (!config.openai_key) throw new Error("Missing openai_key");
        const openai = new OpenAI({ apiKey: config.openai_key });
        const chatCompletion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: config.model || 'gpt-4-turbo',
        });
        return chatCompletion.choices[0].message.content;

      case 'claude':
        if (!config.anthropic_key) throw new Error("Missing anthropic_key");
        const anthropic = new Anthropic({ apiKey: config.anthropic_key });
        const message = await anthropic.messages.create({
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
            model: config.model || 'claude-3-opus-20240229',
        });
        return message.content[0].text;

      case 'gemini':
      default:
        if (!config.gemini_key) throw new Error("Missing gemini_key");
        const genAI = new GoogleGenerativeAI(config.gemini_key);
        const model = genAI.getGenerativeModel({ model: config.model || "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        return result.response.text();
    }
  } catch (error) {
    return `❌ AI Provider Error: ${error.message}`;
  }
}
