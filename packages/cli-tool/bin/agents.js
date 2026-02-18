// Specialized AI Agents for code review
// Implements agentic workflow with structured outputs

import { callAIProvider } from './ai-provider.js';

// Security Review Agent
export async function securityReview(codeBlock, context, config) {
  const prompt = `You are a Security Code Review Specialist. Your mission is to identify security vulnerabilities in the provided code changes.

ANALYSIS SCOPE:
- SQL injection vulnerabilities
- Cross-site scripting (XSS) attacks
- Cross-site request forgery (CSRF)
- Insecure dependencies or outdated packages
- Key exposure or credential leaks
- Authentication bypass vulnerabilities
- Directory traversal attacks
- Path manipulation flaws
- Deprecation warnings that could indicate security risks

INPUT CODE:
\`\`\`
${codeBlock}
\`\`\`

CONTEXT (Reference Code from Project Knowledge Base):
${context}

You MUST respond with valid JSON in this format. Be thorough but concise:
[
  {
    "type": "SECURITY",
    "severity": "CRITICAL|HIGH|MEDIUM|LOW",
    "description": "Clear description of the vulnerability",
    "line": "Line number or range where issue occurs, or 'N/A' if not specific"
  }
]

If no security issues found, return an empty array: []`;

  try {
    const response = await callAIProvider(config, prompt);
    const parsed = parseAgentResponse(response);
    return parsed;
  } catch (error) {
    console.warn(`Security review failed: ${error.message}`);
    return [];
  }
}

// Architecture Review Agent
export async function architectureReview(codeBlock, context, config) {
  const prompt = `You are an Architecture Code Review Specialist. Your mission is to evaluate architectural adherence and code organization.

ANALYSIS SCOPE:
- Design pattern violations or misuse
- Separation of concerns breaches
- Business logic in inappropriate layers (e.g., controllers, views)
- Missing dependency injection where needed
- Tight coupling between components
- Cyclomatic complexity issues (>10 branches)
- Large functions/methods (>50 lines)
- Singleton pattern misuse
- Data access patterns and ORM usage
- Error handling architecture

INPUT CODE:
\`\`\`
${codeBlock}
\`\`\`

CONTEXT (Reference Code from Project Knowledge Base):
${context}

You MUST respond with valid JSON in this format. Be thorough but concise:
[
  {
    "type": "ARCHITECTURE",
    "severity": "CRITICAL|HIGH|MEDIUM|LOW",
    "description": "Clear description of the architectural issue",
    "line": "Line number or range where issue occurs, or 'N/A' if not specific"
  }
]

If no architectural issues found, return an empty array: []`;

  try {
    const response = await callAIProvider(config, prompt);
    const parsed = parseAgentResponse(response);
    return parsed;
  } catch (error) {
    console.warn(`Architecture review failed: ${error.message}`);
    return [];
  }
}

// Style and Documentation Review Agent
export async function styleAndDocReview(codeBlock, context, config) {
  const prompt = `You are a Code Style and Documentation Review Specialist. Your mission is to assess maintainability, readability, and documentation quality.

ANALYSIS SCOPE:
- Missing or inadequate JSDoc/TypeScript documentation
- Poor variable/function naming conventions
- Inconsistent code formatting
- Missing error handling documentation
- Inadequate function comments for complex logic
- Violation of language-specific style guides
- Long parameter lists (>4 parameters)
- Magic numbers without constants
- Inconsistent spacing or indentation
- Missing type annotations (TypeScript)

INPUT CODE:
\`\`\`
${codeBlock}
\`\`\`

CONTEXT (Reference Code from Project Knowledge Base):
${context}

You MUST respond with valid JSON in this format. Be thorough but concise:
[
  {
    "type": "MAINTAINABILITY",
    "severity": "CRITICAL|HIGH|MEDIUM|LOW",
    "description": "Clear description of the style/documentation issue",
    "line": "Line number or range where issue occurs, or 'N/A' if not specific"
  }
]

If no issues found, return an empty array: []`;

  try {
    const response = await callAIProvider(config, prompt);
    const parsed = parseAgentResponse(response);
    return parsed;
  } catch (error) {
    console.warn(`Style/Doc review failed: ${error.message}`);
    return [];
  }
}

// Utility function to parse agent responses
function parseAgentResponse(response) {
  try {
    // Extract JSON from response (agents may add extra text)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : [];
    }

    // Try parsing the whole response
    const parsed = JSON.parse(response);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`Failed to parse agent response: ${error.message}`);
    return [];
  }
}

// Code decomposition utilities
export class CodeDecomposer {
  static decomposeDiff(diffContent) {
    const scopes = [];
    const lines = diffContent.split('\n');

    let currentFile = null;
    let currentHunk = null;
    let hunkLines = [];

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        // New file
        const fileMatch = line.match(/b\/(.+)/);
        if (fileMatch) {
          currentFile = fileMatch[1];
        }
      } else if (line.startsWith('@@')) {
        // New hunk
        if (currentHunk && hunkLines.length > 0) {
          scopes.push(this.analyzeHunk(currentFile, currentHunk, hunkLines));
        }
        currentHunk = line;
        hunkLines = [];
      } else if (line.startsWith('+') || line.startsWith('-')) {
        // Changed line
        hunkLines.push(line);
      }
    }

    // Process final hunk
    if (currentHunk && hunkLines.length > 0) {
      scopes.push(this.analyzeHunk(currentFile, currentHunk, hunkLines));
    }

    return scopes;
  }

  static analyzeHunk(filePath, hunkHeader, lines) {
    const addedLines = lines.filter(line => line.startsWith('+')).map(line => line.substring(1));
    const removedLines = lines.filter(line => line.startsWith('-')).map(line => line.substring(1));

    // Parse hunk header for line numbers
    const lineMatch = hunkHeader.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    const startLine = lineMatch ? parseInt(lineMatch[1]) : 1;

    // Group lines into logical scopes
    return this.groupIntoScopes(addedLines, removedLines, startLine, filePath);
  }

  static groupIntoScopes(addedLines, removedLines, startLine, filePath) {
    const scopes = [];

    // For simplicity, we'll treat all changes as one scope per hunk
    // In a more advanced implementation, we could parse AST to identify functions/classes
    const scope = {
      filePath,
      startLine,
      endLine: startLine + addedLines.length,
      code: addedLines.join('\n'),
      addedLines,
      removedLines,
      type: this.inferScopeType(filePath, addedLines.join('\n'))
    };

    scopes.push(scope);
    return scopes;
  }

  static inferScopeType(filePath, code) {
    if (code.includes('function ') || code.includes('=>') || code.includes('const ') && code.includes('= (')) {
      return 'function';
    }
    if (code.includes('class ')) {
      return 'class';
    }
    if (code.includes('import ')) {
      return 'imports';
    }
    if (code.includes('interface ') || code.includes('type ')) {
      return 'type_definition';
    }
    return 'general';
  }
}

// Main orchestration function
export async function orchestrateReview(diffContent, config, projectRoot = process.cwd()) {
  const { decomposeDiff } = CodeDecomposer;

  // Import retrieveContext dynamically to avoid circular imports
  const { retrieveContext } = await import('./rag.js');

  // Decompose diff into scopes
  const scopes = decomposeDiff(diffContent);
  const allResults = [];

  for (const scope of scopes) {
    if (!scope.code.trim()) continue;

    // Retrieve context for this scope
    const context = await retrieveContext(scope.code, config, projectRoot, 3);

    // Run all specialized reviews in parallel
    const [securityResults, architectureResults, styleResults] = await Promise.all([
      securityReview(scope.code, context, config),
      architectureReview(scope.code, context, config),
      styleAndDocReview(scope.code, context, config)
    ]);

    // Combine and annotate results
    const scopeResults = [
      ...this.annotateResults(securityResults, scope),
      ...this.annotateResults(architectureResults, scope),
      ...this.annotateResults(styleResults, scope)
    ];

    allResults.push(...scopeResults);
  }

  return allResults;
}

// Annotate results with scope information
function annotateResults(results, scope) {
  return results.map(result => ({
    ...result,
    file: scope.filePath,
    lineRange: `${scope.startLine}-${scope.endLine}`,
    scopeType: scope.type
  }));
}

// Version without RAG context retrieval
export async function orchestrateReviewWithoutRAG(diffContent, config, projectRoot = process.cwd()) {
  const scopes = CodeDecomposer.decomposeDiff(diffContent);
  const allResults = [];

  for (const scope of scopes) {
    if (!scope.code.trim()) continue;

    // Skip context retrieval - use empty context
    const context = '';

    // Run all specialized reviews in parallel
    const [securityResults, architectureResults, styleResults] = await Promise.all([
      securityReview(scope.code, context, config),
      architectureReview(scope.code, context, config),
      styleAndDocReview(scope.code, context, config)
    ]);

    // Combine and annotate results
    const scopeResults = [
      ...annotateResults(securityResults, scope),
      ...annotateResults(architectureResults, scope),
      ...annotateResults(styleResults, scope)
    ];

    allResults.push(...scopeResults);
  }

  return allResults;
}
