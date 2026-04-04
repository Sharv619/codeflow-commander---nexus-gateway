import { RAGService } from '../src/services/rag';
import { StorageManager } from '../src/storage';

describe('RAGService', () => {
  let service: RAGService;
  let storageManager: StorageManager;

  beforeEach(() => {
    storageManager = new StorageManager();
    service = new RAGService('test-project', storageManager);
  });

  describe('extractEntitiesFromContent', () => {
    it('should extract a function with correct line numbers', () => {
      const content = `export function hello() {
  console.log("hello");
  console.log("hello");
}
export function world() {
  console.log("world");
}
`;
      const entities = (service as any).extractEntitiesFromContent(content, 'test.ts');
      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].lineStart).toBe(1);
      expect(entities[0].lineEnd).toBe(4);
    });

    it('should extract a class entity', () => {
      const content = `class Foo {
  bar() {
    return 1;
  }
}
`;
      const entities = (service as any).extractEntitiesFromContent(content, 'test.ts');
      expect(entities.length).toBeGreaterThan(0);
      const classEntity = entities.find((e: any) => e.type === 'class');
      expect(classEntity).toBeDefined();
      expect(classEntity.name).toBe('Foo');
      expect(classEntity.lineStart).toBe(1);
    });

    it('should handle duplicate lines correctly (not use indexOf)', () => {
      const content = `function a() {
  return null;
}
function b() {
  return null;
}
`;
      const entities = (service as any).extractEntitiesFromContent(content, 'test.ts');
      expect(entities.length).toBe(2);
      expect(entities[0].lineStart).toBe(1);
      expect(entities[1].lineStart).toBe(4);
    });

    it('should extract methods from classes', () => {
      const content = `class MyClass {
  doSomething() {
    return 1;
  }
  doAnother() {
    return 2;
  }
}
`;
      const entities = (service as any).extractEntitiesFromContent(content, 'test.ts');
      const methods = entities.filter((e: any) => e.type === 'method');
      expect(methods.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-code content', () => {
      const content = `just some text
no functions here
nothing to extract`;
      const entities = (service as any).extractEntitiesFromContent(content, 'test.txt');
      expect(entities).toEqual([]);
    });
  });

  describe('getOllamaConfig', () => {
    it('should return null when config file does not exist', () => {
      const config = (service as any).getOllamaConfig();
      expect(config).toBeNull();
    });
  });
});
