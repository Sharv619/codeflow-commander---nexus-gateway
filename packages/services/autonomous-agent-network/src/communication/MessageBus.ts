// ------------------------------------------------------------------------------
// Phase 5: Communication Layer - Message Bus Implementation
// Handles inter-agent communication with priority routing and delivery guarantees
// ------------------------------------------------------------------------------
import { EventEmitter } from 'events';
import { v4 as generateUuid } from 'uuid';

import {
  AgentMessage,
  MessageType
} from '../types/agent.js';

export class MessageBus extends EventEmitter {
  private subscribers: Map<string, Set<(msg: AgentMessage) => void>> = new Map();
  private messageQueue: AgentMessage[] = [];
  private processingEnabled: boolean = true;

  constructor() {
    super();
  }

  async publish(message: AgentMessage): Promise<void> {
    message.messageId = message.messageId || generateUuid();
    message.createdAt = message.createdAt || new Date();

    this.messageQueue.push(message);

    if (this.processingEnabled) {
      setImmediate(() => this.processQueue());
    }
  }

  async broadcast(message: AgentMessage): Promise<void> {
    message.to = undefined; // Clear recipient for broadcast
    await this.publish(message);
  }

  subscribe(
    messageType: MessageType | string,
    callback: (message: AgentMessage) => Promise<void>,
    agentId?: string
  ): { unsubscribe: () => void; messageType: MessageType | string; agentId?: string } {
    const key = agentId ? `${agentId}:${messageType}` : messageType;

    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }

    this.subscribers.get(key)!.add(callback);

    return {
      unsubscribe: () => this.unsubscribe(messageType, callback, agentId),
      messageType,
      agentId
    };
  }

  private unsubscribe(
    messageType: MessageType | string,
    callback: (msg: AgentMessage) => void,
    agentId?: string
  ): void {
    const key = agentId ? `${agentId}:${messageType}` : messageType;
    const subscribers = this.subscribers.get(key);

    if (subscribers) {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        this.subscribers.delete(key);
      }
    }
  }

  private async processQueue(): Promise<void> {
    while (this.messageQueue.length > 0 && this.processingEnabled) {
      const message = this.messageQueue.shift()!;
      await this.deliverMessage(message);
    }
  }

  private async deliverMessage(message: any): Promise<void> {
    const recipientKeys: string[] = [];

    // Direct message
    if (message.to) {
      recipientKeys.push(`${message.to}:${message.type}`);
      recipientKeys.push(message.to);
    }

    // Broadcast messages
    recipientKeys.push(message.type);
    recipientKeys.push('*'); // Catch-all

    let delivered = false;

    for (const key of recipientKeys) {
      const subscribers = this.subscribers.get(key);
      if (subscribers) {
        for (const callback of subscribers) {
          try {
            await callback(message);
            delivered = true;
          } catch (error) {
            console.error(`Message delivery error for key ${key}:`, error);
          }
        }
      }
    }

    if (!delivered) {
      console.warn(`No subscribers found for message ${message.messageId}`);
    }
  }

  pauseProcessing(): void {
    this.processingEnabled = false;
  }

  resumeProcessing(): void {
    this.processingEnabled = true;
    this.processQueue();
  }
}
