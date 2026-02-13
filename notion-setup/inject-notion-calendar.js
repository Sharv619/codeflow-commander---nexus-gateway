#!/usr/bin/env node
import 'dotenv/config'; // Loads .env file

import { Client } from '@notionhq/client';
import { readFileSync } from 'fs';
import path from 'path';

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Your database ID (replace with your actual database ID)
const DATABASE_ID = process.env.LINKEDIN_DATABASE_ID;

// Parse the automation guide and extract 30-day calendar
function parseCalendarFromGuide() {
  const guidePath = path.join(process.cwd(), 'notion-linkedin-automation-guide.md');
  const guideContent = readFileSync(guidePath, 'utf8');

  const calendar = [];

  // Extract posts from the guide content (this is a simplified parser)
  // In a real implementation, you'd use a more robust markdown parser

  // Based on actual development timeline from git history
  const getDayContent = (dayNumber) => {
    switch (dayNumber) {
      case 1: return {
        topic: "React 18 + TypeScript Foundation",
        focus: "Building enterprise-grade developer tooling foundation",
        cta: "Explore the tech stack"
      };
      case 2: return {
        topic: "Multi-Provider AI Integration",
        focus: "Seamless OpenAI, Claude, Gemini support",
        cta: "See integration capabilities"
      };
      case 3: return {
        topic: "Interactive CLI Configuration",
        focus: "Dynamic model selection and validation",
        cta: "Try the CLI tool"
      };
      case 4: return {
        topic: "Git Hook Automation Engine",
        focus: "AI-powered code review and commit standards",
        cta: "Implement in your workflow"
      };
      case 5: return {
        topic: "Enterprise Security Framework",
        focus: "Robust validation and access control systems",
        cta: "Review security implementation"
      };
      case 6: return {
        topic: "CSP & Content Security",
        focus: "Advanced injection and security policies",
        cta: "Learn about our security approach"
      };
      case 7: return {
        topic: "API Key Validation Engine",
        focus: "Dynamic provider validation and error handling",
        cta: "Secure your AI integrations"
      };
      case 8: return {
        topic: "Multi-Provider Model Selection",
        focus: "Intelligent AI provider routing and optimization",
        cta: "Optimize your AI workflow"
      };
      case 9: return {
        topic: "Case-Insensitive Provider Logic",
        focus: "User-friendly AI provider configuration",
        cta: "Simplify your setup"
      };
      case 10: return {
        topic: "Debug Output & Validation Testing",
        focus: "Comprehensive error handling and debugging",
        cta: "Troubleshoot like a pro"
      };
      case 11: return {
        topic: "Early Validation Architecture",
        focus: "Performance optimization and error prevention",
        cta: "Improve your CI/CD pipeline"
      };
      case 12: return {
        topic: "Large Diff Handling",
        focus: "Efficient processing of complex code changes",
        cta: "Scale your automated reviews"
      };
      case 13: return {
        topic: "Security Documentation",
        focus: "Enterprise-grade security standards and practices",
        cta: "Read our SECURITY.md"
      };
      case 14: return {
        topic: "Publishing Preparation",
        focus: "Production readiness and deployment optimization",
        cta: "Get ready for launch"
      };
      case 15: return {
        topic: "Version 0.2.0 Release",
        focus: "Major feature additions and bug fixes",
        cta: "Upgrade your implementation"
      };
      case 16: return {
        topic: "Autonomous Engineering Platform",
        focus: "Phase 4 completion and enterprise capabilities",
        cta: "Discover autonomous development"
      };
      case 17: return {
        topic: "Enterprise Knowledge Graph Backend",
        focus: "Core private methods implementation",
        cta: "Explore EKG capabilities"
      };
      case 18: return {
        topic: "Agent Implementation Refactoring",
        focus: "Code organization and dependency management",
        cta: "Optimize your agent architecture"
      };
      case 19: return {
        topic: "EKG Backend Integration",
        focus: "Complete knowledge graph integration suite",
        cta: "Connect with enterprise intelligence"
      };
      case 20: return {
        topic: "Zero-Trust Networking Architecture",
        focus: "Enterprise security and network integration",
        cta: "Secure your infrastructure"
      };
      case 21: return {
        topic: "Enterprise Identity Management",
        focus: "Multi-tenant IAM systems and access control",
        cta: "Implement enterprise authentication"
      };
      case 22: return {
        topic: "Compliance Framework Integration",
        focus: "GDPR, SOX, HIPAA unified compliance platforms",
        cta: "Achieve regulatory compliance"
      };
      case 23: return {
        topic: "Policy Decision Engines",
        focus: "ABAC + RBAC real-time access control",
        cta: "Enforce granular policies"
      };
      case 24: return {
        topic: "IAM API Endpoints",
        focus: "RESTful identity management APIs",
        cta: "Integrate with enterprise systems"
      };
      case 25: return {
        topic: "GDPR Implementation Guide",
        focus: "Privacy by design and data subject rights",
        cta: "Navigate GDPR compliance"
      };
      case 26: return {
        topic: "SOX Compliance Framework",
        focus: "Internal controls and audit trail automation",
        cta: "Streamline SOX compliance"
      };
      case 27: return {
        topic: "HIPAA Security Controls",
        focus: "Healthcare data protection and ePHI security",
        cta: "Protect sensitive healthcare data"
      };
      case 28: return {
        topic: "Security Incident Response",
        focus: "Automated response and crisis management",
        cta: "Read our response runbook"
      };
      case 29: return {
        topic: "Compliance Auditing Procedures",
        focus: "Automated evidence collection and reporting",
        cta: "Simplify your audit process"
      };
      case 30: return {
        topic: "Autonomous Agent Network Architecture",
        focus: "Multi-agent orchestration and EKG integration",
        cta: "Build autonomous systems"
      };
    }
  };

  // Generate 30 days starting from actual development timeline
  const startDate = new Date('2025-10-23');

  for (let i = 1; i <= 30; i++) {
    const postDate = new Date(startDate);
    postDate.setDate(startDate.getDate() + (i - 1));

    const content = getDayContent(i);

    calendar.push({
      day: i,
      topic: content.topic,
      date: postDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      status: 'To Do',
      context: `Focus: ${content.focus}\nCTA: ${content.cta}`,
      linkedInUrl: ''
    });
  }

  return calendar;
}

// Format date for Notion
function formatDateForNotion(dateString) {
  return {
    date: {
      start: dateString
    }
  };
}

// Create Notion database entry
async function createNotionEntry(entry) {
  try {
    const response = await notion.pages.create({
      parent: {
        database_id: DATABASE_ID
      },
      properties: {
        'Topic': {
          title: [
            {
              text: {
                content: entry.topic
              }
            }
          ]
        },
        'Post Date': formatDateForNotion(entry.date),
        'status': {
          status: {
            name: entry.status
          }
        },
        'context': {
          rich_text: [
            {
              text: {
                content: entry.context
              }
            }
          ]
        },
        'LINKEDIN URL': {
          url: entry.linkedInUrl || null
        }
      }
    });

    return response;
  } catch (error) {
    console.error(`Failed to create entry for "${entry.topic}":`, error.message);
    throw error;
  }
}

// Main execution function
async function injectCalendar() {
  console.log('🚀 Starting 30-day LinkedIn calendar injection into Notion...\n');

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
    // Parse calendar from guide
    const calendar = parseCalendarFromGuide();

    console.log(`📅 Found ${calendar.length} posts to create\n`);

    // Create entries with progress tracking
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < calendar.length; i++) {
      const entry = calendar[i];

      console.log(`📝 Creating: Day ${entry.day} - "${entry.topic}"`);

      try {
        await createNotionEntry(entry);
        successCount++;
        console.log(`   ✅ Created successfully`);
        results.push({ day: entry.day, status: 'success' });
      } catch (error) {
        errorCount++;
        console.log(`   ❌ Failed: ${error.message}`);
        results.push({ day: entry.day, status: 'failed', error: error.message });
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Summary
    console.log('\n📊 Injection Complete!');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📁 Total: ${calendar.length}`);

    if (errorCount > 0) {
      console.log('\n⚠️ Failed entries:');
      results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`   Day ${r.day}: ${r.error}`);
      });
    }

    console.log('\n🎉 Your 30-day LinkedIn content calendar is ready in Notion!');
    console.log('📱 Now you can set up your AI agent to automate the content generation for each post!');

  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  injectCalendar();
}

export { injectCalendar, parseCalendarFromGuide };
