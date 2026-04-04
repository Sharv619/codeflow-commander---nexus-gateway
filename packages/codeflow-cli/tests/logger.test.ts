import { Logger, defaultLogger } from '../src/utils/logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  describe('defaultLogger', () => {
    it('should export a default logger instance', () => {
      expect(defaultLogger).toBeDefined();
      expect(defaultLogger).toBeInstanceOf(Logger);
    });
  });

  describe('logging methods', () => {
    it('should have info method', () => {
      expect(() => logger.info('test')).not.toThrow();
    });

    it('should have warn method', () => {
      expect(() => logger.warn('test')).not.toThrow();
    });

    it('should have error method', () => {
      expect(() => logger.error('test')).not.toThrow();
    });

    it('should have debug method', () => {
      expect(() => logger.debug('test')).not.toThrow();
    });

    it('should accept metadata parameter', () => {
      expect(() => logger.info('test', { key: 'value' })).not.toThrow();
    });
  });
});
