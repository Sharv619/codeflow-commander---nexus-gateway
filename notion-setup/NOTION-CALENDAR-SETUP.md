# 🚀 Notion LinkedIn Calendar Setup Guide

This guide will help you set up your Notion database and inject the 30-day Codeflow Commander LinkedIn content calendar.

---

## **Important Clarification:**

You can definitely run this script, but to be clear on the terminology: you don't "inject" it inside Notion (like a browser extension or a macro). Instead, you run this script on your computer, and it sends instructions to Notion's API to redesign your database for you. It saves you from manually clicking "Add Property" five times.

Here's the exact guide to setup and run everything automatically.

## 📋 Prerequisites

### 1. Notion API Setup
1. **Get your Notion API key:**
   - Go to https://www.notion.com/my-integrations
   - Create a new integration called "Codeflow LinkedIn Calendar"
   - Copy the "Internal Integration Token"

2. **Get your Database ID:**
   - Open your LinkedIn Content Calendar database in Notion
   - Look at the URL: `https://www.notion.so/[workspace]/[database-id]?v=[view-id]`
   - Copy the `database-id` part

3. **Share database with your integration:**
   - Click the "..." menu on your database
   - Click "Add connections"
   - Find and select your "Codeflow LinkedIn Calendar" integration

### 2. Environment Variables Setup

Create a `.env` file in your project root:

```bash
# Notion API Configuration
NOTION_API_KEY=secret_your_notion_api_key_here
LINKEDIN_DATABASE_ID=your_database_id_here
```

### 3. Quick Manual Setup (Most Reliable Method)

#### **CSV Import (Even Simpler!):**
1. **Download** the prepared CSV file: `codeflow-linkedin-calendar-import.csv`
2. **Go to your Notion database**
3. **Click "Import" button** (bottom right of database)
4. **Choose "CSV" import**
5. **Upload** the `codeflow-linkedin-calendar-import.csv` file
6. **✅ Done! 30 days loaded instantly with perfect formatting**

#### **Alternative: JSON Import**
1. **Download** the prepared JSON file: `codeflow-linkedin-calendar-import.json`
2. **Go to your Notion database**
3. **Click "Import" button** (bottom right of database)
4. **Choose "JSON" import**
5. **Upload** the `codeflow-linkedin-calendar-import.json` file
6. **Map the properties** during import

CSV is **easier** than JSON - no property mapping needed!

### Alternate: Install Dependencies (Optional)

If you prefer automated API injection:

```bash
npm install @notionhq/client
```

## 🎯 Running the Injection Script

### Execute the script:

```bash
# Run the calendar injection
node inject-notion-calendar.js
```

### Expected Output:
```
🚀 Starting 30-day LinkedIn calendar injection into Notion...

📅 Found 30 posts to create

📝 Creating: Day 1 - "Zero-Trust Network Introduction"
   ✅ Created successfully

📝 Creating: Day 2 - "Identity Management Deep Dive"
   ✅ Created successfully

[... continues for all 30 days ...]

📊 Injection Complete!
✅ Successful: 30
❌ Failed: 0
📁 Total: 30

🎉 Your 30-day LinkedIn content calendar is ready in Notion!
```

## 🗄️ Database Structure Verification

Your Notion database should have these exact properties (in your exact format):

- **Topic** (Title) - The post topic/content title
- **Post Date** (Date) - When to post
- **Status** (Select) - Must include "To Do", "Posted", "Error"
- **Context** (Text) - Will contain Focus and CTA details
- **LinkedIn URL** (URL) - Empty for now

## 🤖 Next Steps: AI Agent Integration

Once your calendar is in Notion, set up your AI agent to:

1. **Read from database** - Query "To Do" items daily
2. **Generate content** - Use the Context field to guide AI writing
3. **Create LinkedIn posts** - Use Buffer, Hootsuite, or LinkedIn API
4. **Update status** - Change Status to "Posted" and add URL
5. **Performance tracking** - Log engagement metrics

### Example AI Agent Prompt:

```
You are a LinkedIn content specialist for Codeflow Commander.

Database Context:
Topic: [from Notion]
Focus: [from Context field]
CTA: [from Context field]

Task: Write a professional LinkedIn post (200-300 chars) about this topic for enterprise technology leaders. Include technical depth, business value, and specific details about Codeflow Commander's capabilities. End with an engaging question or call-to-action.
```

## 🔧 Troubleshooting

### Common Issues:

**"NOTION_API_KEY environment variable not set"**
- Ensure your `.env` file exists and has the correct API key
- Restart your terminal/command prompt

**"LINKEDIN_DATABASE_ID environment variable not set"**
- Double-check your database ID in the Notion URL
- Ensure there are no extra characters

**"Failed to create entry: API rate limit exceeded"**
- Notion has rate limits; add a longer delay in the script
- Edit line: `await new Promise(resolve => setTimeout(resolve, 200));`
- Change 200 to 1000 (1 second delay between requests)

**"Failed to create entry: Database not found"**
- Verify the database ID is correct
- Ensure the integration has access to the database

**"Properties don't match"**
- Check that your database properties exactly match the format described above
- The property names must be: "Topic", "Post Date", "Status", "Context", "LinkedIn URL"

### Debug Mode:

Add this to see detailed API responses:
```javascript
// Temporarily uncomment these in inject-notion-calendar.js
console.log('API Response:', response);
console.log('Properties sent:', {
  'Topic': entry.topic,
  'Post Date': entry.date,
  // ... etc
});
```

## 🎯 Success Verification

After running the script successfully:

1. **Check Notion**: Your database should have 30 new entries
2. **Verify data**: Each entry should have correct Topic, Date, Status, and Context
3. **Test AI agent**: Set up your agent to read "Status='To Do'" items

## 📈 Scaling to 60+ Days

To expand beyond 30 days:

1. **Modify the script**: Change `for (let i = 1; i <= 30; i++)` to `for (let i = 1; i <= 60; i++)`
2. **Update getDayContent()**: Add cases for days 31-60
3. **Adjust dates**: Change `const startDate = new Date('2025-11-22');` to your desired start date

## 💡 Pro Tips

- **Batch processing**: Run during off-hours to avoid rate limits
- **Backup first**: Export your Notion database before bulk operations
- **Test small**: First run with days 1-5 to verify everything works
- **Monitor rates**: Notion allows ~3 requests/second; space them out
- **Error recovery**: Failed entries can be manually created or re-run script

Now you have a fully automated LinkedIn content system! 🎉
