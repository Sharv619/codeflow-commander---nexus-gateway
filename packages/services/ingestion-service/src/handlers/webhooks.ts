import { Webhooks } from '@octokit/webhooks';
import { Request, Response } from 'express';

/**
 * Webhook handler middleware factory
 * Returns an Express middleware that processes GitHub webhooks
 */
export function webhookHandler(webhooks: Webhooks) {
  return async (req: Request, res: Response) => {
    try {
      // Extract the webhook event and payload
      const signature = req.get('X-Hub-Signature-256') || '';
      const event = req.get('X-GitHub-Event') || '';
      const deliveryId = req.get('X-GitHub-Delivery') || '';

      console.log(`Received webhook: ${event} (delivery: ${deliveryId})`);

      // Allow GitHub's webhook verification to handle the request
      const rawBody = JSON.stringify(req.body);
      webhooks.verify(rawBody, signature);

      // Process webhook based on event type
      // The actual event processing is handled in server.ts by hooking into webhooks.on()
      // This handler just acknowledges receipt
      res.status(200).json({
        status: 'received',
        event: event,
        delivery: deliveryId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(400).json({
        status: 'error',
        message: 'Invalid webhook signature or payload',
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Authentication failed'
      });
    }
  };
}

/**
 * Generic webhook error handler
 */
export function webhookErrorHandler(error: unknown, _req: Request, _res: Response) {
  const isError = error instanceof Error;
  const errorName = isError ? error.name : 'UnknownError';

  if (errorName === 'WebhookVerificationError') {
    console.warn('Invalid webhook signature received');
    return _res.status(401).json({
      status: 'unauthorized',
      message: 'Invalid webhook signature',
      timestamp: new Date().toISOString()
    });
  }

  if (errorName === 'JSONParseError') {
    console.warn('Invalid JSON in webhook payload');
    return _res.status(400).json({
      status: 'bad_request',
      message: 'Invalid JSON payload',
      timestamp: new Date().toISOString()
    });
  }

  console.error('Unexpected webhook error:', error);
  return _res.status(500).json({
    status: 'internal_error',
    message: 'Internal server error',
    timestamp: new Date().toISOString(),
    error: process.env.NODE_ENV === 'development' && isError ? error.message : undefined
  });
}
