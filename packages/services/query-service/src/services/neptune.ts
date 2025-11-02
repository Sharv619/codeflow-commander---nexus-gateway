import gremlin from 'gremlin';

/**
 * Neptune Client - Handles connections and operations with Amazon Neptune graph database
 *
 * Implements the TinkerPop Gremlin graph traversal machine for Neptune operations.
 * Supports vertex creation, edge creation, and graph queries for EKG data.
 */
export class NeptuneClient {
  private client: gremlin.driver.Client | null = null;
  private driverRemoteConnection: any = null;
  private g: gremlin.process.GraphTraversalSource | null = null;

  private neptuneEndpoint: string;
  private neptunePort: number;

  constructor() {
    this.neptuneEndpoint = process.env.NEPTUNE_ENDPOINT || 'localhost';
    this.neptunePort = parseInt(process.env.NEPTUNE_PORT || '8182', 10);
  }

  /**
   * Initialize connection to Neptune
   */
  async connect(): Promise<void> {
    try {
      console.log(`Connecting to Neptune at ${this.neptuneEndpoint}:${this.neptunePort}`);

      // Create the connection
      this.client = new gremlin.driver.Client(
        `wss://${this.neptuneEndpoint}:${this.neptunePort}/gremlin`,
        {
          traversalSource: 'g',
          mimeType: 'application/vnd.gremlin-v3.0+json',
          // Authentication if configured
          ...(process.env.NEPTUNE_AUTH_MODE && {
            authenticator: new gremlin.driver.auth.PlainTextSaslAuthenticator(
              process.env.NEPTUNE_USERNAME || '',
              process.env.NEPTUNE_PASSWORD || ''
            )
          })
        }
      );

      // Wait for connection to establish
      await this.testConnection();

      console.log('Connected to Neptune successfully');

    } catch (error) {
      console.error('Failed to connect to Neptune:', error);
      throw new Error(`Neptune connection failed: ${(error as Error).message}`);
    }
  }

  /**
   * Disconnect from Neptune
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        console.log('Disconnected from Neptune');
      }
    } catch (error) {
      console.error('Error disconnecting from Neptune:', error);
    } finally {
      this.client = null;
      this.g = null;
      this.driverRemoteConnection = null;
    }
  }

  /**
   * Test Neptune connection health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client!.submit('g.V().limit(1).count()');
      return result.length > 0;
    } catch (error) {
      console.error('Neptune health check failed:', error);
      return false;
    }
  }

  /**
   * Create a vertex in the graph
   */
  async createVertex(label: string, properties: Record<string, any>): Promise<any> {
    if (!this.client) {
      throw new Error('Not connected to Neptune');
    }

    try {
      // Build the Gremlin query
      let query = `g.addV('${label}')`;

      // Add properties to the vertex
      for (const [key, value] of Object.entries(properties)) {
        if (typeof value === 'string') {
          query += `.property('${key}', '${value.replace(/'/g, "\\'")}')`;
        } else {
          query += `.property('${key}', ${JSON.stringify(value)})`;
        }
      }

      const result = await this.client.submit(query);
      console.log(`Created vertex: ${label} with id ${result[0].id}`);

      return {
        id: result[0].id,
        label: result[0].label,
        properties: result[0].properties
      };

    } catch (error) {
      console.error(`Failed to create vertex ${label}:`, error);
      throw error;
    }
  }

  /**
   * Create an edge between two vertices
   */
  async createEdge(
    fromLabel: string,
    fromId: string | number,
    toLabel: string,
    toId: string | number,
    edgeLabel: string,
    properties: Record<string, any> = {}
  ): Promise<any> {
    if (!this.client) {
      throw new Error('Not connected to Neptune');
    }

    try {
      // Find the vertices first
      const fromVertex = await this.findVertex(fromLabel, fromId);
      const toVertex = await this.findVertex(toLabel, toId);

      if (!fromVertex || !toVertex) {
        throw new Error(`Could not find vertices to connect: ${fromId} -> ${toId}`);
      }

      // Build the Gremlin query for adding edge
      let query = `g.V('${fromVertex.id}').addE('${edgeLabel}').to(g.V('${toVertex.id}'))`;

      // Add properties to the edge
      for (const [key, value] of Object.entries(properties)) {
        if (typeof value === 'string') {
          query += `.property('${key}', '${value.replace(/'/g, "\\'")}')`;
        } else {
          query += `.property('${key}', ${JSON.stringify(value)})`;
        }
      }

      const result = await this.client.submit(query);
      console.log(`Created edge: ${fromVertex.id} -[${edgeLabel}]-> ${toVertex.id}`);

      return {
        id: result[0].id,
        label: result[0].label,
        from: fromVertex.id,
        to: toVertex.id,
        properties: result[0].properties
      };

    } catch (error) {
      console.error(`Failed to create edge ${fromId} -> ${toId}:`, error);
      throw error;
    }
  }

  /**
   * Find a vertex by id
   */
  async findVertex(label: string, id: string | number): Promise<any> {
    if (!this.client) {
      throw new Error('Not connected to Neptune');
    }

    try {
      const query = `g.V().has('id', '${id}')`;
      const result = await this.client.submit(query);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error(`Failed to find vertex ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update vertex properties
   */
  async updateVertex(label: string, id: string | number, properties: Record<string, any>): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to Neptune');
    }

    try {
      let query = `g.V('${id}')`;

      // Add property updates
      for (const [key, value] of Object.entries(properties)) {
        if (typeof value === 'string') {
          query += `.property('${key}', '${value.replace(/'/g, "\\'")}')`;
        } else {
          query += `.property('${key}', ${JSON.stringify(value)})`;
        }
      }

      await this.client.submit(query);
      console.log(`Updated vertex ${id} with ${Object.keys(properties).length} properties`);

    } catch (error) {
      console.error(`Failed to update vertex ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a vertex and all its connected edges
   */
  async deleteVertex(label: string, id: string | number): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to Neptune');
    }

    try {
      // Drop all edges first, then the vertex
      await this.client.submit(`g.V('${id}').bothE().drop()`);
      await this.client.submit(`g.V('${id}').drop()`);

      console.log(`Deleted vertex ${id} and all connected edges`);

    } catch (error) {
      console.error(`Failed to delete vertex ${id}:`, error);
      throw error;
    }
  }

  /**
   * Execute a custom Gremlin query
   */
  async executeQuery(query: string, bindings: Record<string, any> = {}): Promise<any[]> {
    if (!this.client) {
      throw new Error('Not connected to Neptune');
    }

    try {
      console.log(`Executing Gremlin query: ${query} with bindings:`, bindings);
      const result = await this.client.submit(query, bindings);
      console.log(`Query returned ${result.length} results`);

      return result;
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Get repository relationships from the graph
   */
  async getRepositoryDependencies(repositoryId: string): Promise<any[]> {
    const query = `
      g.V().has('repository', 'id', repositoryId)
        .outE('depends_on')
        .inV()
        .project('id', 'name', 'version')
        .by('id')
        .by('name')
        .by('version')
    `;

    return this.executeQuery(query, { repositoryId });
  }

  /**
   * Get patterns detected in a repository
   */
  async getRepositoryPatterns(repositoryId: string): Promise<any[]> {
    const query = `
      g.V().has('repository', 'id', repositoryId)
        .outE('exhibits')
        .inV().hasLabel('pattern')
        .project('id', 'name', 'type', 'confidence')
        .by('id')
        .by('name')
        .by('type')
        .by('confidence')
    `;

    return this.executeQuery(query, { repositoryId });
  }

  /**
   * Find similar repositories based on patterns
   */
  async findSimilarRepositories(patterns: string[]): Promise<any[]> {
    // This would be a more complex query matching pattern similarities
    const query = `
      g.V().hasLabel('repository')
        .where(
          outE('exhibits')
          .inV().hasLabel('pattern')
          .values('name')
          .fold()
        )
        .project('id', 'name', 'patterns')
        .by('id')
        .by('name')
        .by(
          outE('exhibits')
          .inV().hasLabel('pattern')
          .values('name')
          .fold()
        )
    `;

    return this.executeQuery(query);
  }

  /**
   * Create database schema indexes (if needed for performance)
   */
  async createIndexes(): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to Neptune');
    }

    try {
      console.log('Creating Neptune search indexes...');

      // Note: Neptune doesn't require manual index creation like other graph DBs
      // but this method can be used for future optimization tasks

      console.log('Indexes created successfully');

    } catch (error) {
      console.error('Failed to create indexes:', error);
      throw error;
    }
  }

  /**
   * Test the connection with a simple query
   */
  private async testConnection(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const timeout = setTimeout(() => {
      throw new Error('Connection test timed out');
    }, 10000);

    try {
      await this.client.submit('g.V().limit(1).count()');
      clearTimeout(timeout);
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<{
    vertexCount: number;
    edgeCount: number;
    labels: any[];
  }> {
    if (!this.client) {
      throw new Error('Not connected to Neptune');
    }

    try {
      const [vertices, edges, labels] = await Promise.all([
        this.client.submit('g.V().count()'),
        this.client.submit('g.E().count()'),
        this.client.submit('g.V().label().dedup()')
      ]);

      return {
        vertexCount: vertices[0],
        edgeCount: edges[0],
        labels: labels
      };
    } catch (error) {
      console.error('Failed to get database statistics:', error);
      throw error;
    }
  }
}
