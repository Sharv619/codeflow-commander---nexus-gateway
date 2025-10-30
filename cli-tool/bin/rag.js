// RAG (Retrieval-Augmented Generation) implementation for codeflow-hook
// Provides local vector storage and semantic search capabilities

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import crypto from 'crypto';

// Vector Store: Simple file-based implementation with cosine similarity
export class LocalVectorStore {
  constructor(projectRoot) {
    this.storePath = path.join(projectRoot, '.codeflow', 'index');
    this.ensureDirectoryExists();
  }

  ensureDirectoryExists() {
    if (!fs.existsSync(this.storePath)) {
      fs.mkdirSync(this.storePath, { recursive: true });
    }
  }

  // Save vectors and metadata to files
  async saveVectors(vectors, metadata) {
    const vectorFile = path.join(this.storePath, 'vectors.json');
    const metadataFile = path.join(this.storePath, 'metadata.json');

    fs.writeFileSync(vectorFile, JSON.stringify(vectors));
    fs.writeFileSync(metadataFile, JSON.stringify(metadata));
  }

  // Load vectors and metadata from files
  async loadVectors() {
    const vectorFile = path.join(this.storePath, 'vectors.json');
    const metadataFile = path.join(this.storePath, 'metadata.json');

    if (!fs.existsSync(vectorFile) || !fs.existsSync(metadataFile)) {
      return { vectors: [], metadata: [] };
    }

    const vectors = JSON.parse(fs.readFileSync(vectorFile, 'utf8'));
    const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));

    return { vectors, metadata };
  }

  // Search for top-k similar vectors using cosine similarity
  search(queryVector, k = 3) {
    const { vectors, metadata } = this.loadVectors();

    if (vectors.length === 0) {
      return [];
    }

    // Calculate cosine similarity for all vectors
    const similarities = vectors.map((vector, index) => ({
      similarity: cosineSimilarity(queryVector, vector),
      metadata: metadata[index],
      index
    }));

    // Sort by similarity (descending) and return top-k
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k)
      .map(item => ({
        similarity: item.similarity,
        ...item.metadata
      }));
  }
}

// Simple implementation of cosine similarity
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must be of same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

// Embedding generation using Gemini API
export class EmbeddingGenerator {
  constructor(config) {
    this.config = config;
  }

  async generateEmbedding(text) {
    try {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=' + this.config.apiKey;

      const response = await axios.post(url, {
        content: {
          parts: [{
            text: text
          }]
        }
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data.embedding.values;
    } catch (error) {
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  // Generate embeddings for batch of texts
  async generateBatchEmbeddings(texts) {
    const embeddings = [];
    for (const text of texts) {
      embeddings.push(await this.generateEmbedding(text));
    }
    return embeddings;
  }
}

// Text chunking utilities
export class TextChunker {
  static chunkText(text, maxChunkSize = 1000, overlap = 200) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
      let end = start + maxChunkSize;

      // Try to find a good breaking point (sentence end)
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf('.', end);
        const lastNewline = text.lastIndexOf('\n', end);

        if (lastPeriod > start && lastPeriod > end - 100) {
          end = lastPeriod + 1;
        } else if (lastNewline > start && lastNewline > end - 100) {
          end = lastNewline;
        }
      }

      chunks.push(text.slice(start, Math.min(end, text.length)));
      start = Math.max(start + maxChunkSize - overlap, 0);
    }

    return chunks;
  }

  static extractMetadata(filePath, content) {
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath);
    const relativePath = filePath.replace(process.cwd() + path.sep, '');

    return {
      filePath: relativePath,
      fileName,
      extension,
      contentLength: content.length,
      id: crypto.createHash('md5').update(relativePath + content).digest('hex')
    };
  }
}

// Main RAG indexer function
export async function indexProject(config, projectRoot = process.cwd()) {
  const store = new LocalVectorStore(projectRoot);
  const embedder = new EmbeddingGenerator(config);

  // Identify key project files
  const keyFiles = await findKeyFiles(projectRoot);

  const allChunks = [];
  const allMetadata = [];

  for (const filePath of keyFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const chunks = TextChunker.chunkText(content);

      for (let i = 0; i < chunks.length; i++) {
        allChunks.push(chunks[i]);
        allMetadata.push({
          ...TextChunker.extractMetadata(filePath, chunks[i]),
          chunkIndex: i,
          totalChunks: chunks.length
        });
      }
    } catch (error) {
      console.warn(`Skipping ${filePath}: ${error.message}`);
    }
  }

  // Generate embeddings
  const embeddings = await embedder.generateBatchEmbeddings(allChunks);

  // Save to vector store
  await store.saveVectors(embeddings, allMetadata);

  return {
    indexedFiles: keyFiles.length,
    totalChunks: allChunks.length
  };
}

// Find key project files for indexing
async function findKeyFiles(projectRoot) {
  const keyFiles = [];
  const keyPatterns = [
    'README.md',
    'ARCHITECTURE.md',
    'package.json',
    'tsconfig.json',
    'jest.config.js',
    'jest.config.cjs',
    'webpack.config.js',
    'Dockerfile'
  ];

  // Check for exact key files
  for (const pattern of keyPatterns) {
    const fullPath = path.join(projectRoot, pattern);
    if (fs.existsSync(fullPath)) {
      keyFiles.push(fullPath);
    }
  }

  // Find source files
  const sourceDirs = ['src', 'components', 'lib', 'utils', 'types'];
  for (const dir of sourceDirs) {
    const fullDir = path.join(projectRoot, dir);
    if (fs.existsSync(fullDir)) {
      keyFiles.push(...findSourceFiles(fullDir));
    }
  }

  // Find interface/config files in root
  const configPatterns = ['*.ts', '*.js', '*.json'].filter(ext => {
    return fs.readdirSync(projectRoot)
      .filter(file => file.endsWith(ext))
      .filter(file => !keyFiles.some(kf => kf.endsWith(file)))
      .map(file => path.join(projectRoot, file));
  });

  keyFiles.push(...configPatterns.flat());

  return [...new Set(keyFiles)]; // Remove duplicates
}

function findSourceFiles(dir) {
  const files = [];
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'];

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...findSourceFiles(fullPath));
    } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

// Context retrieval function
export async function retrieveContext(codeBlock, config, projectRoot = process.cwd(), k = 3) {
  const store = new LocalVectorStore(projectRoot);

  // Check if index exists
  const { vectors } = store.loadVectors();
  if (vectors.length === 0) {
    return ''; // No context available
  }

  const embedder = new EmbeddingGenerator(config);

  try {
    // Generate embedding for the code block
    const queryVector = await embedder.generateEmbedding(codeBlock);

    // Search for similar chunks
    const results = store.search(queryVector, k);

    // Combine top results into context string
    return results
      .map(result => `From ${result.filePath}:\n${result.content}`)
      .join('\n\n---\n\n');

  } catch (error) {
    console.warn(`Context retrieval failed: ${error.message}`);
    return '';
  }
}
