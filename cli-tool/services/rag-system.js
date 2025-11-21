import { VectorStore } from './vector-store.js';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

class RAGSystem {
  constructor() {
    this.vectorStore = new VectorStore();
    this.chunkSize = 1000; // Characters per chunk
    this.overlap = 200;    // Overlap between chunks
  }

  async initialize() {
    await this.vectorStore.initialize();
  }

  /**
   * Index a repository for RAG
   */
  async indexRepository(repoPath = '.', options = {}) {
    const {
      includePatterns = ['**/*.js', '**/*.ts', '**/*.tsx', '**/*.jsx', '**/*.json', '**/*.md'],
      excludePatterns = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
      dryRun = false
    } = options;

    console.log(`🔍 Indexing repository: ${repoPath}`);
    console.log(`📁 Include patterns: ${includePatterns.join(', ')}`);

    // Find all files matching patterns
    const allFiles = [];
    for (const pattern of includePatterns) {
      const files = await glob(pattern, {
        cwd: repoPath,
        ignore: excludePatterns,
        absolute: true
      });
      allFiles.push(...files);
    }

    // Remove duplicates
    const uniqueFiles = [...new Set(allFiles)];
    console.log(`📋 Found ${uniqueFiles.length} files to process`);

    if (dryRun) {
      console.log('🔍 Dry run - files that would be indexed:');
      uniqueFiles.forEach(file => console.log(`  ${file}`));
      return { files: uniqueFiles, chunks: 0, vectors: 0 };
    }

    // Process files and create chunks
    const allChunks = [];
    const fileMetadata = [];

    for (const filePath of uniqueFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const chunks = this.chunkText(content);

        chunks.forEach((chunk, index) => {
          allChunks.push(chunk);
          fileMetadata.push({
            filePath: path.relative(repoPath, filePath),
            absolutePath: filePath,
            chunkIndex: index,
            totalChunks: chunks.length,
            language: this.detectLanguage(filePath),
            fileSize: content.length,
            lastModified: fs.statSync(filePath).mtime.toISOString()
          });
        });

        console.log(`✅ Processed ${path.relative(repoPath, filePath)} (${chunks.length} chunks)`);
      } catch (error) {
        console.warn(`⚠️ Failed to process ${filePath}: ${error.message}`);
      }
    }

    // Generate embeddings for all chunks
    console.log(`🧮 Generating embeddings for ${allChunks.length} chunks...`);
    const embeddings = [];

    for (let i = 0; i < allChunks.length; i++) {
      const embedding = await this.vectorStore.generateEmbedding(allChunks[i]);
      embeddings.push(embedding);

      if ((i + 1) % 10 === 0) {
        console.log(`📊 Generated ${i + 1}/${allChunks.length} embeddings`);
      }
    }

    // Store in vector database
    await this.vectorStore.addVectors(embeddings, fileMetadata);

    const result = {
      files: uniqueFiles.length,
      chunks: allChunks.length,
      vectors: embeddings.length,
      indexPath: this.vectorStore.indexPath
    };

    console.log(`✅ Repository indexed successfully!`);
    console.log(`📊 Stats: ${result.files} files, ${result.chunks} chunks, ${result.vectors} vectors`);

    return result;
  }

  /**
   * Retrieve relevant context for a query
   */
  async retrieveContext(query, options = {}) {
    const {
      limit = 5,
      minScore = 0.7,
      includeMetadata = true
    } = options;

    console.log(`🔍 Retrieving context for: "${query}"`);

    // Generate embedding for the query
    const queryEmbedding = await this.vectorStore.generateEmbedding(query);

    // Search for similar vectors
    const results = await this.vectorStore.searchSimilar(queryEmbedding, limit * 2); // Get more for filtering

    // Filter by score and format results
    const filteredResults = results
      .filter(result => result.score >= minScore)
      .slice(0, limit);

    console.log(`📋 Found ${filteredResults.length} relevant chunks (min score: ${minScore})`);

    if (includeMetadata) {
      return filteredResults.map(result => ({
        content: result.vector, // This should be the original text, but we need to store it
        metadata: result.metadata,
        score: result.score,
        filePath: result.metadata.filePath,
        language: result.metadata.language
      }));
    }

    return filteredResults.map(result => result.vector);
  }

  /**
   * Analyze code with RAG context
   */
  async analyzeWithContext(code, query = null, options = {}) {
    const contextQuery = query || this.generateContextQuery(code);

    console.log(`🧠 Analyzing code with RAG context...`);
    console.log(`🔍 Context query: "${contextQuery}"`);

    // Retrieve relevant context
    const context = await this.retrieveContext(contextQuery, options);

    // Combine context with code for analysis
    const enhancedPrompt = this.buildEnhancedPrompt(code, context);

    return {
      originalCode: code,
      contextQuery,
      retrievedContext: context,
      enhancedPrompt,
      analysis: null // Will be filled by AI provider
    };
  }

  /**
   * Chunk text into smaller pieces for embedding
   */
  chunkText(text, chunkSize = this.chunkSize, overlap = this.overlap) {
    if (text.length <= chunkSize) {
      return [text];
    }

    const chunks = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;

      // Try to end at a natural break point
      if (end < text.length) {
        // Look for sentence endings within the last 100 characters
        const lastPeriod = text.lastIndexOf('.', end);
        const lastNewline = text.lastIndexOf('\n', end);

        if (lastPeriod > end - 100) {
          end = lastPeriod + 1;
        } else if (lastNewline > end - 100) {
          end = lastNewline;
        }
      }

      const chunk = text.slice(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // Move start position with overlap
      start = Math.max(start + chunkSize - overlap, end);
    }

    return chunks;
  }

  /**
   * Detect programming language from file extension
   */
  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.cs': 'csharp',
      '.json': 'json',
      '.md': 'markdown',
      '.yml': 'yaml',
      '.yaml': 'yaml'
    };

    return languageMap[ext] || 'unknown';
  }

  /**
   * Generate a context query from code
   */
  generateContextQuery(code) {
    // Extract key elements from code to create a meaningful search query
    const lines = code.split('\n').slice(0, 10); // First 10 lines
    const keywords = [];

    // Look for function definitions, class declarations, imports
    for (const line of lines) {
      if (line.includes('function ') || line.includes('class ') ||
          line.includes('import ') || line.includes('export ')) {
        keywords.push(line.trim());
      }
    }

    if (keywords.length > 0) {
      return keywords.slice(0, 3).join(' ');
    }

    // Fallback: use first non-empty line
    const firstLine = lines.find(line => line.trim().length > 0);
    return firstLine ? firstLine.trim() : 'code analysis';
  }

  /**
   * Build enhanced prompt with retrieved context
   */
  buildEnhancedPrompt(code, context) {
    const contextText = context.map(ctx =>
      `File: ${ctx.filePath}\n${ctx.content}`
    ).join('\n\n---\n\n');

    return `You are analyzing code with additional context from the codebase.

RELEVANT CODEBASE CONTEXT:
${contextText}

CODE TO ANALYZE:
${code}

Please provide a comprehensive analysis considering the codebase context above.`;
  }

  /**
   * Get system statistics
   */
  getStats() {
    return {
      vectorStore: this.vectorStore.getStats(),
      chunkSize: this.chunkSize,
      overlap: this.overlap
    };
  }

  /**
   * Clear the RAG index
   */
  async clearIndex() {
    await this.vectorStore.clearIndex();
    console.log('🗑️ RAG index cleared');
  }
}

export { RAGSystem };
