#!/usr/bin/env node

import { Client } from '@notionhq/client';

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Your database ID (replace with your actual database ID)
const DATABASE_ID = process.env.LINKEDIN_DATABASE_ID;

async function checkDatabaseProperties() {
  console.log('🔍 Checking Notion database properties...\n');

  // Check environment variables
  if (!process.env.NOTION_API_KEY) {
    console.error('❌ NOTION_API_KEY environment variable not set');
    process.exit(1);
  }

  if (!process.env.LINKEDIN_DATABASE_ID) {
    console.error('❌ LINKEDIN_DATABASE_ID environment variable not set');
    console.error('💡 Get your database ID from the Notion URL: https://www.notion.so/[workspace]/[database-id]?v=[view-id]');
    process.exit(1);
  }

  try {
    // Query the database to see its structure
    const response = await notion.databases.retrieve({
      database_id: DATABASE_ID,
    });

    console.log('✅ Database connected successfully!');
    console.log(`📊 Database Name: ${response.title && response.title[0] ? response.title[0].plain_text : 'Untitled'}\n`);

    console.log('📋 Current Properties:');
    console.log('='.repeat(50));

    const properties = response.properties;
    if (!properties) {
      console.log('❌ No properties found in database response!');
      console.log('Database response:', JSON.stringify(response, null, 2));
      return;
    }

    const propertyNames = Object.keys(properties);

    if (propertyNames.length === 0) {
      console.log('❌ No properties found in database!');
      return;
    }

    propertyNames.forEach((propName, index) => {
      const prop = properties[propName];
      console.log(`${index + 1}. ${propName} (${prop.type})`);

      // Show additional details for select properties (like Status)
      if (prop.type === 'select' && prop.select?.options) {
        const options = prop.select.options.map(opt => opt.name).join(', ');
        console.log(`   └─ Options: ${options}`);
      }

      if (prop.type === 'status' && prop.status?.options) {
        const options = prop.status.options.map(opt => opt.name).join(', ');
        console.log(`   └─ Options: ${options}`);
      }
    });

    console.log('\n' + '='.repeat(50));
    console.log('🤔 Expected properties for LinkedIn calendar:');
    console.log('   • Title (title) - The post topic');
    console.log('   • Date (date) - When to post');
    console.log('   • Status (select) - "To Do", "Posted", "Error"');
    console.log('   • Context (rich_text) - Focus and CTA details');
    console.log('   • LinkedIn URL (url) - Post URL when published');

    console.log('\n🔧 Analysis:');
    const hasTitle = propertyNames.some(name => properties[name].type === 'title');
    const hasDate = propertyNames.some(name =>
      properties[name].type === 'date' ||
      name.toLowerCase().includes('date')
    );
    const hasStatusOrSelect = propertyNames.some(name =>
      properties[name].type === 'status' ||
      properties[name].type === 'select'
    );
    const hasRichText = propertyNames.some(name =>
      properties[name].type === 'rich_text' ||
      name.toLowerCase().includes('context')
    );
    const hasUrl = propertyNames.some(name =>
      properties[name].type === 'url' ||
      name.toLowerCase().includes('url')
    );

    console.log(`   ✅ Title property: ${hasTitle ? '✓' : '✗'}`);
    console.log(`   ✅ Date property: ${hasDate ? '✓' : '✗'}`);
    console.log(`   ✅ Status/Select property: ${hasStatusOrSelect ? '✓' : '✗'}`);
    console.log(`   ✅ Rich text property: ${hasRichText ? '✓' : '✗'}`);
    console.log(`   ✅ URL property: ${hasUrl ? '✓' : '✗'}`);

    const allPresent = hasTitle && hasDate && hasStatusOrSelect && hasRichText && hasUrl;
    if (!allPresent) {
      console.log('\n⚠️  Property mismatch detected!');
      console.log('💡 Need to either:');
      console.log('   1. Adjust database properties to match expected names');
      console.log('   2. Update the script to use existing property names');
    }

  } catch (error) {
    console.error('❌ Error checking database properties:', error.message);
    console.error('\nPossible issues:');
    console.error('• Wrong database ID');
    console.error('• Integration not shared with database');
    console.error('• API key expired/invalid');

    if (error.message.includes('Database not found')) {
      console.error('\n💡 Check your database ID - it should look like: 123456789abcdef0abcd123456789abcd');
    }

    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkDatabaseProperties();
}

export { checkDatabaseProperties };
