/**
 * cli-tool/tests/jest-esm.loader.mjs
 * ESM loader configuration for Jest with ES modules
 */

export async function resolve(specifier, context, defaultResolve) {
  // Handle ES module imports
  if (specifier.startsWith('@/')) {
    const newSpecifier = specifier.replace('@/', './src/');
    return defaultResolve(newSpecifier, context);
  }

  try {
    return defaultResolve(specifier, context);
  } catch (error) {
    // Try with .js extension for ES modules
    if (error.code === 'ERR_MODULE_NOT_FOUND' && !specifier.endsWith('.js')) {
      try {
        return defaultResolve(specifier + '.js', context);
      } catch {
        throw error;
      }
    }
    throw error;
  }
}

export async function getFormat(url, context, defaultGetFormat) {
  if (url.endsWith('.mjs')) {
    return { format: 'module' };
  }
  return defaultGetFormat(url, context, defaultGetFormat);
}
