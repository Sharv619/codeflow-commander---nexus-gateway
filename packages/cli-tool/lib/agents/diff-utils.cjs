function getChangedFiles(diff) {
  const files = [];
  const seen = new Set();
  const lines = (diff || '').split(/\r?\n/);

  for (const line of lines) {
    if (!line.startsWith('+++ b/')) {
      continue;
    }

    const fileName = line.replace('+++ b/', '').trim();
    if (fileName === '/dev/null' || seen.has(fileName)) {
      continue;
    }

    seen.add(fileName);
    files.push(fileName);
  }

  return files;
}

function getAddedLinesByFile(diff) {
  const files = new Map();
  let currentFile = null;
  const lines = (diff || '').split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith('+++ b/')) {
      currentFile = line.replace('+++ b/', '').trim();
      if (!files.has(currentFile)) {
        files.set(currentFile, []);
      }
      continue;
    }

    if (!currentFile || !line.startsWith('+') || line.startsWith('+++')) {
      continue;
    }

    files.get(currentFile).push({
      line: index + 1,
      text: line.slice(1)
    });
  }

  return files;
}

function hasPackageManifestChange(file) {
  return /(^|\/)package\.json$/.test(file) || /(^|\/)package-lock\.json$/.test(file) || /(^|\/)pnpm-lock\.yaml$/.test(file) || /(^|\/)yarn\.lock$/.test(file);
}

module.exports = {
  getChangedFiles,
  getAddedLinesByFile,
  hasPackageManifestChange
};
