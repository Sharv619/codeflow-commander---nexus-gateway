/**
 * Change Queue Service
 * 
 * Implements the Change Queue logic as specified in docs/WORKFLOW_SPEC.md
 * Handles file change events from the daemon and manages the analysis pipeline
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

/**
 * Change Queue Manager
 * 
 * Manages the queue of file change events and coordinates with the analysis pipeline
 */
class ChangeQueueManager extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.processing = new Set();
    this.maxConcurrency = 5;
    this.processedCount = 0;
    this.errorCount = 0;
    
    // Start processing queue
    this.startProcessing();
  }

  /**
   * Add a change event to the queue
   * @param {ChangeEvent} changeEvent The change event to queue
   * @returns {Promise<QueueResult>} Result of queueing the change
   */
  async enqueueChange(changeEvent) {
    try {
      // Validate change event
      const validationResult = this.validateChangeEvent(changeEvent);
      if (!validationResult.valid) {
        throw new Error(`Invalid change event: ${validationResult.errors.join(', ')}`);
      }

      // Generate unique ID if not provided
      const changeWithId = {
        ...changeEvent,
        id: changeEvent.id || uuidv4(),
        timestamp: changeEvent.timestamp || new Date().toISOString(),
        status: 'queued',
        queuedAt: new Date().toISOString()
      };

      // Add to queue
      this.queue.push(changeWithId);
      
      // Emit queue event for monitoring
      this.emit('change_queued', changeWithId);
      
      console.log(`Change queued: ${changeWithId.id} - ${changeWithId.file}`);
      
      return {
        success: true,
        changeId: changeWithId.id,
        status: 'queued',
        estimatedProcessingTime: this.estimateProcessingTime()
      };
    } catch (error) {
      console.error('Error enqueueing change:', error);
      this.errorCount++;
      this.emit('queue_error', { error: error.message, changeEvent });
      
      return {
        success: false,
        error: error.message,
        status: 'failed'
      };
    }
  }

  /**
   * Process the queue continuously
   */
  async startProcessing() {
    while (true) {
      try {
        await this.processNextChange();
        // Small delay to prevent CPU spinning
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Error in queue processing:', error);
        // Continue processing despite errors
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Process the next change in the queue
   */
  async processNextChange() {
    // Check if we can process more changes
    if (this.processing.size >= this.maxConcurrency) {
      return;
    }

    // Get next change from queue
    const change = this.queue.shift();
    if (!change) {
      return;
    }

    // Mark as processing
    this.processing.add(change.id);
    change.status = 'processing';
    change.processedAt = new Date().toISOString();

    try {
      // Emit processing start event
      this.emit('change_processing', change);

      // Process the change (this would trigger the analysis pipeline)
      const result = await this.processChange(change);
      
      // Mark as completed
      this.processing.delete(change.id);
      this.processedCount++;
      change.status = 'completed';
      change.completedAt = new Date().toISOString();
      change.result = result;

      // Emit completion event
      this.emit('change_completed', change);

      console.log(`Change completed: ${change.id} - ${change.file}`);
    } catch (error) {
      // Mark as failed
      this.processing.delete(change.id);
      this.errorCount++;
      change.status = 'failed';
      change.error = error.message;
      change.failedAt = new Date().toISOString();

      // Emit error event
      this.emit('change_failed', { change, error });

      console.error(`Change failed: ${change.id} - ${error.message}`);
    }
  }

  /**
   * Process a single change event
   * @param {ChangeEvent} change The change to process
   * @returns {Promise<ProcessingResult>} Processing result
   */
  async processChange(change) {
    const startTime = Date.now();
    
    try {
      // This would integrate with the analysis pipeline
      // For now, we'll simulate the processing
      const processingResult = {
        changeId: change.id,
        status: 'completed',
        processingTime: Date.now() - startTime,
        analysisTriggered: true,
        estimatedCompletion: new Date(Date.now() + 5000).toISOString()
      };

      // Emit analysis triggered event
      this.emit('analysis_triggered', {
        changeId: change.id,
        file: change.file,
        repository: change.repository
      });

      return processingResult;
    } catch (error) {
      throw new Error(`Processing failed: ${error.message}`);
    }
  }

  /**
   * Validate change event
   * @param {ChangeEvent} changeEvent The change event to validate
   * @returns {ValidationResult} Validation result
   */
  validateChangeEvent(changeEvent) {
    const errors = [];

    if (!changeEvent.file) {
      errors.push('file is required');
    }

    if (!changeEvent.repository) {
      errors.push('repository is required');
    }

    if (!changeEvent.changeType || !['modify', 'create', 'delete'].includes(changeEvent.changeType)) {
      errors.push('changeType must be one of: modify, create, delete');
    }

    if (changeEvent.fileSize && (typeof changeEvent.fileSize !== 'number' || changeEvent.fileSize < 0)) {
      errors.push('fileSize must be a non-negative number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Estimate processing time based on queue length
   * @returns {number} Estimated processing time in milliseconds
   */
  estimateProcessingTime() {
    const queueLength = this.queue.length;
    const processingTime = queueLength * 2000; // 2 seconds per change
    return Math.max(processingTime, 1000); // Minimum 1 second
  }

  /**
   * Get queue statistics
   * @returns {QueueStats} Current queue statistics
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      processingCount: this.processing.size,
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      maxConcurrency: this.maxConcurrency,
      utilization: (this.processing.size / this.maxConcurrency) * 100
    };
  }

  /**
   * Get current queue status
   * @returns {Array<ChangeEvent>} Current queue items
   */
  getQueueStatus() {
    return this.queue.map(change => ({
      id: change.id,
      file: change.file,
      repository: change.repository,
      status: change.status,
      queuedAt: change.queuedAt
    }));
  }
}

// Create global change queue instance
const changeQueue = new ChangeQueueManager();

// Express router for change detection endpoint
const router = express.Router();

/**
 * POST /api/changes/detect
 * 
 * Endpoint to receive file change events from the daemon
 * Based on the specification in docs/WORKFLOW_SPEC.md
 */
router.post('/api/changes/detect', async (req, res) => {
  try {
    const changeEvent = req.body;

    console.log('Change detection request received:', changeEvent);

    // Enqueue the change
    const result = await changeQueue.enqueueChange(changeEvent);

    if (result.success) {
      res.status(202).json({
        status: 'queued',
        changeId: result.changeId,
        estimatedProcessingTime: result.estimatedProcessingTime,
        message: 'Change event successfully queued for analysis'
      });
    } else {
      res.status(400).json({
        status: 'failed',
        error: result.error,
        message: 'Failed to queue change event'
      });
    }
  } catch (error) {
    console.error('Error processing change detection request:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      message: 'Internal server error while processing change event'
    });
  }
});

/**
 * GET /api/changes/stats
 * 
 * Get queue statistics for monitoring
 */
router.get('/api/changes/stats', (req, res) => {
  try {
    const stats = changeQueue.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting queue stats:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * GET /api/changes/queue
 * 
 * Get current queue status
 */
router.get('/api/changes/queue', (req, res) => {
  try {
    const queueStatus = changeQueue.getQueueStatus();
    res.json({
      queue: queueStatus,
      stats: changeQueue.getStats()
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Event listeners for monitoring
changeQueue.on('change_queued', (change) => {
  console.log(`[MONITORING] Change queued: ${change.id}`);
});

changeQueue.on('change_processing', (change) => {
  console.log(`[MONITORING] Change processing: ${change.id}`);
});

changeQueue.on('change_completed', (change) => {
  console.log(`[MONITORING] Change completed: ${change.id}`);
});

changeQueue.on('change_failed', ({ change, error }) => {
  console.log(`[MONITORING] Change failed: ${change.id} - ${error.message}`);
});

changeQueue.on('analysis_triggered', (event) => {
  console.log(`[MONITORING] Analysis triggered: ${event.changeId} for ${event.file}`);
});

changeQueue.on('queue_error', (event) => {
  console.log(`[MONITORING] Queue error: ${event.error}`);
});

module.exports = {
  changeQueue,
  router
};