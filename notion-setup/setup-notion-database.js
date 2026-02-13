#!/usr/bin/env node

import 'dotenv/config'; // Loads .env file
import { Client } from '@notionhq/client';

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Your database ID (replace with your actual database ID)
const DATABASE_ID = process.env.LINKEDIN_DATABASE_ID;

async function setupDatabaseProperties() {
  console.log('🏗️ Setting up Notion database properties...\n');

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
    console.log('📝 Adding required properties to database...\n');

    // Properties to add
    const properties = {
      'Topic': {
        title: {}
      },
      'Post Date': {
        date: {}
      },
      'status': {
        status: {
          options: [
            {
              name: 'To Do',
              color: 'blue'
            },
            {
              name: 'Posted',
              color: 'green'
            },
            {
              name: 'Error',
              color: 'red'
            }
          ]
        }
      },
      'context': {
        rich_text: {}
      },
      'LINKEDIN URL': {
        url: {}
      }
    };

    // Update database with new properties
    const response = await notion.databases.update({
      database_id: DATABASE_ID,
      properties: properties,
      title: [
        {
          type: 'text',
          text: {
            content: 'Codeflow Commander LinkedIn Calendar'
          }
        }
      ]
    });

    console.log('✅ Database properties added successfully!');
    console.log(`📊 Database renamed to: "${response.title[0]?.plain_text || 'Codeflow Commander LinkedIn Calendar'}"`);

    console.log('\n📋 Added Properties:');
    console.log('='.repeat(50));

    if (response.properties && typeof response.properties === 'object') {
      const propertyNames = Object.keys(response.properties);
      propertyNames.forEach((propName, index) => {
        const prop = response.properties[propName];
        console.log(`${index + 1}. ${propName} (${prop.type})`);

        if (prop.type === 'status' && prop.status?.options) {
          const options = prop.status.options.map(opt => opt.name).join(', ');
          console.log(`   └─ Options: ${options}`);
        }
      });
    } else {
      console.log('   └─ Properties updated successfully (details not available in response)')
    }

    console.log('\n🎉 Database setup complete!');
    console.log('\n🚀 Now you can run the calendar injection:');
    console.log('   node inject-notion-calendar.js');

  } catch (error) {
    console.error('❌ Error setting up database properties:', error.message);

    if (error.message.includes('unauthorized')) {
      console.error('\n💡 Check your integration permissions - make sure:')
      console.error('   • The integration is shared with the database')
      console.error('   • API key is correct and active')
    }

    if (error.message.includes('Database not found')) {
      console.error('\n💡 Check your database ID - make sure it\'s correct');
    }

    console.error('\n🔧 Alternative: Manually add these properties to your Notion database:');
    console.error('   1. Topic (Title) - required');
    console.error('   2. Post Date (Date) - required');
    console.error('   3. status (Status) with options: To Do, Posted, Error');
    console.error('   4. context (Text) - optional, can be renamed to match your preference');
    console.error('   5. LINKEDIN URL (URL) - optional, can be renamed');

    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabaseProperties();
}

export { setupDatabaseProperties };
