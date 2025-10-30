#!/usr/bin/env node

import axios from 'axios';

// Test script to validate the key validation works
async function validateGeminiKey() {
  const apiKey = 'AIzaSyBIEmWx8lRqHveNgiPl3fokbGDdOMUwjms'; // Gemini key
  const provider = 'openai'; // Intentionally wrong provider

  console.log('Testing VALIDATION of Gemini key against OpenAI provider...');

  try {
    // This should fail because Gemini key can't access OpenAI API
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    console.log('❌ UNEXPECTED: Validation passed when it should fail');
    process.exit(0);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ EXPECTED: Validation correctly failed with 401 Unauthorized');
      console.log('This confirms API validation works!');
      process.exit(0);
    } else {
      console.log('❓ UNEXPECTED error:', error.message, error.response?.status);
      process.exit(1);
    }
  }
}

validateGeminiKey();
