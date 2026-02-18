// File: src/state/index.ts
// Hierarchical State Management Layer implementing Data Model blueprint
// Provides Global → Project → Session state architecture with synchronization
import { defaultLogger } from '../utils/logger.js';
import { ErrorHandler } from '../validation/index.js';
/**
 * State Manager - Unified interface for hierarchical state management
 * Coordinates Global, Project, and Session state operations
 * Handles synchronization, persistence, and consistency
 */
export class StateManager {
    constructor(logger) {
        this.projectStates = new Map();
        this.sessionStates = new Map();
        this.logger = logger || defaultLogger;
        this.errorHandler = new ErrorHandler(this.logger);
        this.initializeGlobalState();
    }
    /**
     * Initialize global state from persisted configuration
     */
    initializeGlobalState() {
        // Implementation would load from ~/.codeflow-cli/config/global.json
        // For now, provide default structure
        this.globalState = this.createDefaultGlobalState();
    }
    /**
     * Create default global state structure
     */
    createDefaultGlobalState() {
        return {
            userId: this.generateUserId(),
            schemaVersion: '3.0.0',
            lastUpdated: new Date(),
            ai: {
                providers: {},
                defaultProvider: 'gemini',
                modelPreferences: {},
                safety: this.createDefaultSafetyControls()
            },
            learning: {
                patternLibrary: {},
                globalPreferences: {
                    autoApplyThreshold: 0.85,
                    aggressivenessLevel: 0.7,
                    preferredCategories: ['security', 'performance', 'architecture'],
                    feedbackFrequency: 'milestone'
                },
                adaptabilityProfile: {
                    riskTolerance: 0.5,
                    styleAlignment: ['typescript', 'modular', 'typed'],
                    domainExpertise: []
                }
            },
            system: {
                performance: {
                    maxMemory: 500 * 1024 * 1024, // 500MB
                    maxConcurrency: 4,
                    enableCaching: true,
                    cacheSize: 100
                },
                telemetry: {
                    enabled: true,
                    anonymized: true,
                    dataRetention: 90
                },
                updatePolicy: 'stable'
            },
            extensions: {
                installed: {},
                globalConfig: {}
            }
        };
    }
    /**
     * Create default safety controls based on risk mitigation
     */
    createDefaultSafetyControls() {
        return {
            confidenceThresholds: {
                low: 0.95, // Extra cautious for new deployments
                medium: 0.90, // Balanced for established projects
                high: 0.85 // Aggressive for mature systems
            },
            riskAssessment: {
                criticalPath: true,
                highImpact: true,
                securityRelated: true,
                breakingChanges: true
            },
            operationalLimits: {
                maxSuggestionsPerSession: 50,
                maxAutoApplyPerHour: 10,
                requireRollbackCapability: true,
                forceSequentialApplication: false
            },
            emergencyMode: {
                enabled: true,
                triggerConditions: ['high_error_rate', 'feedback_decline', 'system_unstable'],
                fallbackBehavior: 'conservative-validation'
            }
        };
    }
    /**
     * Generate unique user identifier
     */
    generateUserId() {
        // Implementation would create stable user ID
        // For now, return placeholder
        return `user_${Date.now()}`;
    }
    /**
     * Get global state (read-only)
     */
    getGlobalState() {
        return this.globalState;
    }
    /**
     * Update global state with validation
     */
    async updateGlobalState(updates) {
        try {
            // Validate updates
            const updatedState = { ...this.globalState, ...updates };
            // Persist changes
            await this.persistState('global', updatedState);
            // Update in-memory state
            this.globalState = updatedState;
            this.logger.info('Global state updated successfully');
        }
        catch (error) {
            this.errorHandler.handleError(error, { operation: 'updateGlobalState' });
            throw error;
        }
    }
    /**
     * Get or create project state
     */
    getProjectState(projectId) {
        if (!this.projectStates.has(projectId)) {
            // Load from storage or create new
            const projectState = this.createDefaultProjectState(projectId);
            this.projectStates.set(projectId, projectState);
        }
        return this.projectStates.get(projectId);
    }
    /**
     * Update project state
     */
    async updateProjectState(projectId, updates) {
        try {
            const currentState = this.getProjectState(projectId);
            const updatedState = { ...currentState, ...updates, lastUpdated: new Date() };
            // Validate consistency with global state
            await this.validateProjectStateConsistency(updatedState);
            // Persist changes
            await this.persistState(`project_${projectId}`, updatedState);
            // Update in-memory state
            this.projectStates.set(projectId, updatedState);
            this.logger.debug(`Project state updated for ${projectId}`);
        }
        catch (error) {
            this.errorHandler.handleError(error, { operation: 'updateProjectState', projectId });
            throw error;
        }
    }
    /**
     * Create default project state
     */
    createDefaultProjectState(projectId) {
        return {
            projectId,
            globalUserId: this.globalState.userId,
            schemaVersion: '3.0.0',
            createdAt: new Date(),
            lastUpdated: new Date(),
            config: {
                path: '', // Set by caller
                name: '',
                type: 'other',
                framework: [],
                language: []
            },
            overrides: {},
            sessions: {
                active: [],
                recent: [],
                background: [],
                totalAnalyzed: 0
            },
            learning: {
                confidenceOverrides: {},
                patternAcceptance: {},
                developerPreferences: {},
                feedbackHistory: []
            },
            performance: {
                averageSessionTime: 0,
                totalSuggestionsGenerated: 0,
                acceptanceRate: 0,
                autoApplyRate: 0,
                errorRate: 0
            },
            persistence: {
                lastVectorStoreUpdate: new Date(),
                lastKnowledgeUpdate: new Date(),
                syncTimestamp: new Date(),
                dirty: false
            }
        };
    }
    /**
     * Validate project state consistency with global state
     */
    async validateProjectStateConsistency(projectState) {
        // Ensure overrides are compatible with global settings
        // Check for conflicts between local and global configurations
        // Validation would be more comprehensive in real implementation
    }
    /**
     * Get session state
     */
    getSessionState(sessionId) {
        return this.sessionStates.get(sessionId);
    }
    /**
     * Create new session state
     */
    createSessionState(sessionId, projectId, type, context) {
        const sessionState = {
            sessionId,
            projectId,
            type,
            status: 'initializing',
            startedAt: new Date(),
            lastActivityAt: new Date(),
            context,
            processing: {
                currentPhase: 'initializing',
                progress: 0,
                stepsCompleted: [],
                stepsTotal: 0,
                concurrencyLevel: 1,
                activeOperations: {}
            },
            data: {
                suggestions: new Map(),
                feedback: [],
                knowledge: {},
                analytics: {
                    tokensUsed: 0,
                    apiCalls: 0,
                    cacheHits: 0,
                    processingTime: 0
                }
            },
            coordination: {
                childSessions: [],
                dependencies: [],
                locks: []
            },
            errors: {
                warnings: [],
                errors: [],
                recoveryActions: []
            },
            persistence: {
                autoSave: true,
                cleanupRequired: false,
                resourcesAllocated: []
            }
        };
        this.sessionStates.set(sessionId, sessionState);
        // Register with project state
        const projectState = this.getProjectState(projectId);
        if (!projectState.sessions.active.includes(sessionId)) {
            projectState.sessions.active.push(sessionId);
        }
        this.logger.debug(`Session state created: ${sessionId}`);
        return sessionState;
    }
    /**
     * Update session state
     */
    async updateSessionState(sessionId, updates) {
        const sessionState = this.sessionStates.get(sessionId);
        if (!sessionState) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        try {
            const updatedState = {
                ...sessionState,
                ...updates,
                lastActivityAt: new Date()
            };
            // Update status based on processing
            if (updates.processing?.progress === 1.0) {
                updatedState.status = 'completed';
            }
            this.sessionStates.set(sessionId, updatedState);
            // Auto-save if enabled
            if (updatedState.persistence.autoSave) {
                await this.persistState(`session_${sessionId}`, updatedState);
            }
        }
        catch (error) {
            this.errorHandler.handleError(error, { operation: 'updateSessionState', sessionId });
            throw error;
        }
    }
    /**
     * Cleanup session state (when session completes)
     */
    async cleanupSessionState(sessionId) {
        const sessionState = this.sessionStates.get(sessionId);
        if (!sessionState)
            return;
        try {
            // Move to completed sessions list
            const projectState = this.getProjectState(sessionState.projectId);
            projectState.sessions.active = projectState.sessions.active.filter(id => id !== sessionId);
            projectState.sessions.recent.unshift(sessionId);
            // Trim recent sessions to limit
            if (projectState.sessions.recent.length > 30) {
                const removed = projectState.sessions.recent.splice(30);
                // Cleanup removed session data
                removed.forEach(id => {
                    this.sessionStates.delete(id);
                    // Remove persisted data if exists
                });
            }
            // Final persistence
            await this.updateProjectState(sessionState.projectId, projectState);
            this.logger.debug(`Session cleaned up: ${sessionId}`);
        }
        catch (error) {
            this.errorHandler.handleError(error, { operation: 'cleanupSessionState', sessionId });
            // Don't throw - cleanup failures shouldn't break session completion
        }
    }
    /**
     * Persist state to storage (stub implementation)
     * In real implementation, would use file system or database
     */
    async persistState(scope, data) {
        // Implementation would save to appropriate storage location
        // Global state -> ~/.codeflow-cli/global/state.json
        // Project state -> .codeflow/state.json
        // Session state -> temporary or database storage
        // For now, just update timestamp
        if (data.lastUpdated) {
            data.lastUpdated = new Date();
        }
        // In production, would use:
        // - SQLite for complex data
        // - JSON files for configuration
        // - Cache systems for hot data
    }
    /**
     * Synchronize project state with global state
     */
    async synchronizeProjectState(projectId) {
        const projectState = this.getProjectState(projectId);
        // Update sync timestamp
        projectState.persistence.syncTimestamp = new Date();
        projectState.persistence.dirty = false;
        await this.updateProjectState(projectId, projectState);
        this.logger.debug(`Project state synchronized: ${projectId}`);
    }
}
/**
 * Export singleton state manager instance
 */
export const stateManager = new StateManager();
