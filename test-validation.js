#!/usr/bin/env node

import axios from 'axios';

// Test the validation call that should fail
async function testGeminiKeyForOpenAI() {
  console.log('Testing Gemini key for OpenAI provider...');

  try {
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer AIzaSyBIEmWx8lRqHveNgiPl3fokbGDdOMUwjms` }
    });
    console.log('❌ UNEXPECTED: API call succeeded when it should fail');
    console.log('Response status:', response.status);
  } catch (error) {
    console.log('✅ EXPECTED: API call failed as expected');
    console.log('Error status:', error.response?.status);
    console.log('Error message:', error.response?.data?.error?.message || error.message);
  }
}

testGeminiKeyForOpenAI();
