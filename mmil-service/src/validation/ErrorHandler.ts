import { Logger } from '../utils/logger';

export class ErrorHandler {
  constructor(private logger: Logger) {}

  handleError(error: Error, context?: any) {
    this.logger.error(error.message, { error, context });
  }
}
