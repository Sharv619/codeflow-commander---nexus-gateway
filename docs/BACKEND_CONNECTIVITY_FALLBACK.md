# Backend Connectivity and Fallback Behavior

## Overview

The Codeflow CLI integration service provides EKG (Enterprise Knowledge Graph) enhanced analysis when backend services are available, with graceful fallback to basic analysis when services are unavailable.

## Architecture

### Services
- **CLI Integration Service**: Bridges local CLI commands with EKG backend services
- **Query Service**: GraphQL service running on port 4000 providing EKG data
- **Mock Server**: `test-graphql-server.js` for development/testing

### Configuration
```typescript
interface EKGBackendConfig {
  ingestionServiceUrl: string; // Default: http://localhost:3000
  queryServiceUrl: string;     // Default: http://localhost:4000
  timeout: number;             // Default: 30000ms
  retries: number;             // Default: 3
}
```

## Behavior Comparison

### With Backend Available
```
✅ Diff analyzed with EKG context enhancement
📊 Analysis Summary:
   📁 Files modified: 1
   ➕ Additions: 2
   ➖ Deletions: 0
   🧠 EKG enhanced: Yes

🧠 EKG Context:
   📚 Patterns analyzed: 0
   👥 Similar repositories: 0
   🔍 Repository known to EKG: No

📊 EKG Queries: 3
⏱️  Analysis Time: 206ms
```

### With Backend Unavailable
```
✅ Diff analyzed with EKG context enhancement
📊 Analysis Summary:
   📁 Files modified: 1
   ➕ Additions: 2
   ➖ Deletions: 0
   🧠 EKG enhanced: Yes

🧠 EKG Context:
   📚 Patterns analyzed: 0
   👥 Similar repositories: 0
   🔍 Repository known to EKG: No

📊 EKG Queries: 0
⏱️  Analysis Time: 18341ms
```

## Fallback Mechanism

1. **Retry Logic**: Makes 3 attempts to connect to backend with exponential backoff
2. **Graceful Degradation**: Continues analysis without EKG enhancement
3. **Logging**: Warns about connection failures but doesn't fail the analysis
4. **Performance**: Basic analysis completes successfully even without backend

## EKG Enhancement Benefits

When backend is available, EKG enhancement provides:

- **Repository Intelligence**: Context about the current repository
- **Similar Repositories**: Analysis against similar code patterns
- **Enterprise Patterns**: Established patterns and best practices
- **Enhanced Recommendations**: Context-aware suggestions

## Development Setup

### Using Mock Server (Recommended for Development)
```bash
# Start mock GraphQL server
node test-graphql-server.js

# Test analyze-diff command
npx codeflow-hook analyze-diff "$(cat test-diff.txt)"
```

### Using Docker Services (Production)
```bash
# Start all services
docker-compose up

# Or start specific service
docker-compose up query-service
```

## Troubleshooting

### Backend Connection Issues
- Check if services are running on correct ports
- Verify network connectivity
- Check service logs for errors
- Use mock server for testing

### Performance Issues
- Backend unavailable causes ~10x slower analysis due to retry timeouts
- Consider reducing retry count for faster fallback in development
- Mock server provides instant responses for testing

## Future Improvements

- [ ] Add health check endpoint integration
- [ ] Implement caching for offline EKG data
- [ ] Add configuration for retry behavior
- [ ] Support for multiple backend endpoints
- [ ] Add metrics for backend availability
