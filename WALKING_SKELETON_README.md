# Walking Skeleton Test Guide

## Overview

The Walking Skeleton test demonstrates the complete end-to-end data flow from change detection to suggestion acceptance in Codeflow Commander.

## Test Components

### 1. Autonomous Agent Framework
- **Location**: `packages/services/autonomous-agent-network/src/core/AutonomousAgent.ts`
- **Purpose**: Abstract base class for all autonomous agents
- **Features**: Lifecycle methods, policy framework, validation, health monitoring

### 2. Change Queue (Node.js Backend)
- **Location**: `server/change-queue.js`
- **Purpose**: Handles file change events from the daemon
- **Endpoint**: `POST /api/changes/detect`
- **Features**: Queue management, validation, concurrent processing

### 3. Graph Connector (Python Backend)
- **Location**: `server/ekg_connector.py`
- **Purpose**: Enriches change events with EKG context
- **Endpoint**: `POST /api/ekg/context`
- **Features**: MockGraphStore for testing, dependency analysis, ownership mapping

### 4. Frontend Integration
- **Location**: `packages/simulator-ui/components/intelligence/AgentReviewCenter.tsx`
- **Purpose**: User interface for reviewing and accepting suggestions
- **Features**: "Accept" button wired to backend API

### 5. Integration Test
- **Location**: `test-walking-skeleton.js`
- **Purpose**: End-to-end validation of the complete flow
- **Tests**: Change Queue, EKG Context, Frontend Integration, Complete Flow

## Running the Test

### Prerequisites

1. **Node.js Backend** (port 3001):
   ```bash
   cd server
   npm install
   node server.js
   ```

2. **Python Backend** (port 8000):
   ```bash
   cd server
   python ekg_connector.py
   ```

3. **Frontend** (port 3000):
   ```bash
   cd packages/simulator-ui
   npm install
   npm run dev
   ```

### Execute the Test

From the project root directory:

```bash
cd /home/lade/GitHub/codeflow-commander---nexus-gateway
node test-walking-skeleton.js
```

### Expected Output

```
🚀 Starting Walking Skeleton Test

📋 Testing Change Queue (Node.js Backend)
   ✅ Change queued: [change-id]

🧠 Testing EKG Context (Python Backend)
   ✅ Context enriched: 3 dependencies, 2 owners

🌐 Testing Frontend Integration
   ✅ Frontend accessible

🔄 Testing Complete End-to-End Flow
   ✅ Complete flow simulation successful

============================================================
📊 TEST RESULTS SUMMARY
============================================================
✅ Change Queue
   Change [change-id] successfully queued
✅ EKG Context
   Context enriched with 3 dependencies, 2 owners, 2 risk factors
✅ Frontend Integration
   Frontend is accessible
✅ Complete Flow
   End-to-end flow simulation completed successfully

============================================================
📈 SUMMARY: 4 PASS, 0 FAIL, 0 SKIP

🎉 WALKING SKELETON SUCCESSFUL!
✅ Change events can flow from daemon → Node.js backend → Python EKG → Frontend → User acceptance
✅ All core components are integrated and communicating
```

## Test Scenarios

### Scenario 1: Complete Success
All components are running and responding correctly.

### Scenario 2: Backend Only
If frontend is not running, the test will show:
- Change Queue: ✅ PASS
- EKG Context: ✅ PASS  
- Frontend Integration: ⚠️ SKIP
- Complete Flow: ✅ PASS

### Scenario 3: Component Failures
If components are not running, the test will show:
- Change Queue: ❌ FAIL
- EKG Context: ❌ SKIP (due to Change Queue failure)
- Frontend Integration: ⚠️ SKIP
- Complete Flow: ❌ FAIL

## Troubleshooting

### Node.js Backend Not Running
```bash
# Check if port 3001 is available
lsof -i :3001

# Start the backend
cd server
node server.js
```

### Python Backend Not Running
```bash
# Check if port 8000 is available
lsof -i :8000

# Start the backend
cd server
python ekg_connector.py
```

### Frontend Not Running
```bash
# Check if port 3000 is available
lsof -i :3000

# Start the frontend
cd packages/simulator-ui
npm run dev
```

### Missing Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (if needed)
pip install fastapi uvicorn pydantic
```

## Architecture Validation

The Walking Skeleton validates:

1. **Data Flow**: File changes → Change Queue → EKG Context → Agent Analysis → Frontend → User Action
2. **API Contracts**: All endpoints match the specifications in WORKFLOW_SPEC.md
3. **Integration**: Components communicate correctly via HTTP APIs
4. **Error Handling**: Proper error handling and monitoring throughout

## Next Steps

After successful validation:

1. **Component Development**: Build specific agent implementations
2. **Database Integration**: Replace MockGraphStore with real Neo4j
3. **Performance Optimization**: Scale the change queue and agent processing
4. **Monitoring Setup**: Implement comprehensive observability

## Files Created

- `packages/services/autonomous-agent-network/src/core/AutonomousAgent.ts` - Agent framework
- `packages/services/autonomous-agent-network/src/types/agent-types.ts` - Type definitions
- `server/change-queue.js` - Change queue logic
- `server/ekg_connector.py` - Graph connector
- `packages/simulator-ui/components/intelligence/AgentReviewCenter.tsx` - Frontend integration
- `test-walking-skeleton.js` - Integration test
- `docs/ChangesDataLog.md` - Updated with implementation details

The Walking Skeleton is now ready for testing and further development! 🎉