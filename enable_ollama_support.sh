#!/bin/bash

# ==============================================================================
# ENABLE LOCAL AI (OLLAMA) SUPPORT FOR CODEFLOW COMMANDER CLI
# ==============================================================================
# Adds 4th AI provider option for zero-cloud, fully-local AI analysis
# Enables running large language models without external API costs/security concerns

echo -e "\033[36m================================================================\033[0m"
echo -e "\033[36m   🧠  ENABLING LOCAL AI (OLLAMA) SUPPORT                     \033[0m"
echo -e "\033[36m   Zero-Cloud Development - No API Keys Required             \033[0m"
echo -e "\033[36m================================================================\033[0m"

echo -e "\n\033[33m🔧 INSTALLING OLLAMA DEPENDENCY...\033[0m"

# Navigate to CLI tool directory and install Ollama
cd cli-tool
if npm install ollama; then
    echo -e "\033[32m✅ Ollama library installed successfully\033[0m"
else
    echo -e "\033[31m❌ Failed to install Ollama library\033[0m"
    exit 1
fi
cd ..

echo -e "\n\033[33m🔄 PATCHING AI SERVICE WITH OLLAMA SUPPORT...\033[0m"

# Target AI service file
AI_SERVICE="cli-tool/src/services/ai.js"

# Backup original file
cp "$AI_SERVICE" "$AI_SERVICE.ollama-backup"

# Create new AI service with Ollama support
cat > "$AI_SERVICE" << 'EOF'
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
        // Local LLM configuration - zero API keys needed
        const ollama = new Ollama({
          host: config.url || 'http://127.0.0.1:11434'
        });

        const response = await ollama.chat({
          model: config.model || 'llama3',
          messages: [{ role: 'user', content: prompt }],
          options: {
            num_predict: 512,
            temperature: 0.3
          }
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
    // Enhanced error handling with provider-specific messages
    if (provider === 'ollama') {
      return `❌ Local AI Error: ${error.message}\n💡 Make sure Ollama is running: 'ollama serve' and model is pulled: 'ollama pull ${config.model || 'llama3'}'`;
    }
    return `❌ AI Provider Error: ${error.message}`;
  }
}

// Export Ollama configuration helper
export function getOllamaModels() {
  return [
    'llama3',
    'llama3:8b',
    'llama3:70b',
    'codellama',
    'mistral',
    'neural-chat',
    'llava',
    'orca-mini',
    'vicuna'
  ];
}
EOF

echo -e "\033[32m✅ Ollama support successfully integrated into AI service\033[0m"

echo -e "\n\033[33m📋 UPDATING CLI CONFIGURATION SYSTEM...\033[0m"

# Update CLI to support Ollama configuration
CLI_BIN="cli-tool/bin/codeflow-hook.js"

# Add Ollama configuration option if not already present
if ! grep -q "ollama.*config\|config.*ollama" "$CLI_BIN"; then
    # Find the configuration command section and add Ollama support
    sed -i '/provider.*gemini/i \ \ \ \ .option('"'"'--provider <type>'"'"', '"'"'AI provider: gemini|openai|claude|ollama [default: gemini]'"'"')\n    .option('"'"'-m, --model <name>'"'"', '"'"'AI model name for Ollama/Local models'"'"')\n    .option('"'"'-u, --url <endpoint>'"'"', '"'"'Ollama server URL [default: http://127.0.0.1:11434]'"'"')' "$CLI_BIN"
fi

echo -e "\n\033[36m================================================================\033[0m"
echo -e "\033[32m✅ OLLAMA LOCAL AI SUPPORT ENABLED\033[0m"
echo -e "\033[36m================================================================\033[0m"

echo -e "\n\033[33m📚 SETUP INSTRUCTIONS:\033[0m"
echo -e "\033[37m1. Install Ollama: https://ollama.ai/\033[0m"
echo -e "\033[37m2. Pull a model: ollama pull llama3\033[0m"
echo -e "\033[37m3. Start server: ollama serve\033[0m"

echo -e "\n\033[33m🚀 USAGE EXAMPLES:\033[0m"
echo -e "\033[37m# Configure for local AI\033[0m"
echo -e "\033[32mcodeflow-hook config --provider ollama --model llama3 --url http://127.0.0.1:11434\033[0m"

echo -e "\n\033[37m# Run analysis with local model\033[0m"
echo -e "\033[32mcodeflow-hook analyze-diff --pr 123\033[0m"

echo -e "\n\033[33m🛡️ SECURITY BENEFITS:\033[0m"
echo -e "\033[37m• Zero API keys required\033[0m"
echo -e "\033[37m• All processing stays on local machine\033[0m"
echo -e "\033[37m• No external data transmission\033[0m"
echo -e "\033[37m• Enterprise compliance friendly\033[0m"

echo -e "\n\033[33m📊 PERFORMANCE:\033[0m"
echo -e "\033[37m• No API rate limits\033[0m"
echo -e "\033[37m• No cloud latency\033[0m"
echo -e "\033[37m• Unlimited concurrent analysis\033[0m"

echo -e "\n\033[36m================================================================\033[0m"
echo -e "\033[32m🎉 LOCAL AI DEVELOPMENT ENABLED!\033[0m"
echo -e "\033[36m================================================================\033[0m"

echo -e "\n\033[35m💡 CodeFlow Commander now supports 4 AI providers:\033[0m"
echo -e "\033[37m• Google Gemini     (gemini)\033[0m"
echo -e "\033[37m• OpenAI GPT-4      (openai)\033[0m"
echo -e "\033[37m• Anthropic Claude  (claude)\033[0m"
echo -e "\033[37m• Local Ollama      (ollama) - NEW!\033[0m"
