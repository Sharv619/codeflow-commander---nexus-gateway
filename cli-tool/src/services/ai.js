import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export async function generateAnalysis(diff, config) {
  const provider = config.provider || 'gemini';
  const prompt = `You are an expert code reviewer. Analyze this code diff and provide a rating (1-10), brief summary, and specific recommendations for improvement. Use this format:

⭐ **Rating:** [X]/10
📝 **Summary:** [Brief description]
⚠️ **Issues:** [List with bullets]
💡 **Recommendations:** [List with bullets]

Code diff:
${diff}`;

  console.log(`🤖 Consulting ${provider.toUpperCase()}...`);

  try {
    switch (provider) {
      case 'openai':
        if (!config.openai_key) throw new Error("Missing openai_key");
        const openai = new OpenAI({ apiKey: config.openai_key });
        const chatCompletion = await openai.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'gpt-4-turbo-preview',
          temperature: 0.1,
          max_tokens: 2048
        });
        return chatCompletion.choices[0].message.content;

      case 'claude':
        if (!config.anthropic_key) throw new Error("Missing anthropic_key");
        const anthropic = new Anthropic({ apiKey: config.anthropic_key });
        const message = await anthropic.messages.create({
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
          model: 'claude-3-opus-20240229',
          temperature: 0.1
        });
        return message.content[0].text;

      case 'gemini':
      default:
        // Gemini implementation
        if (!config.gemini_key) throw new Error("Missing gemini_key");
        const genAI = new GoogleGenerativeAI(config.gemini_key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        return result.response.text();
    }
  } catch (error) {
    return `❌ AI Provider Error: ${error.message}`;
  }
}
