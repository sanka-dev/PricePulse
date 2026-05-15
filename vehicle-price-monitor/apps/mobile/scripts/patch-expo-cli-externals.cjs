const fs = require('fs');
const path = require('path');


const candidateTargets = [
  path.resolve(
    __dirname,
    '../../../node_modules/expo/node_modules/@expo/cli/build/src/start/server/metro/externals.js',
  ),
  path.resolve(
    __dirname,
    '../../../node_modules/@expo/cli/build/src/start/server/metro/externals.js',
  ),
  path.resolve(
    __dirname,
    '../node_modules/@expo/cli/build/src/start/server/metro/externals.js',
  ),
];

function patchFile(targetFile) {
  const original = fs.readFileSync(targetFile, 'utf8');
  if (original.includes('safeModuleId = moduleId.replace(/^node:/, "")')) {
    console.log(`[expo-patch] Already applied: ${targetFile}`);
    return true;
  }

  const before = 'const shimDir = _path.default.join(projectRoot, METRO_EXTERNALS_FOLDER, moduleId);';
  const after = [
    'const safeModuleId = moduleId.replace(/^node:/, "");',
    'const shimDir = _path.default.join(projectRoot, METRO_EXTERNALS_FOLDER, safeModuleId);',
  ].join('\n        ');

  if (!original.includes(before)) {
    return false;
  }

  fs.writeFileSync(targetFile, original.replace(before, after), 'utf8');
  console.log(`[expo-patch] Applied Node external shim fix at: ${targetFile}`);
  return true;
}

function run() {
  let touched = false;
  for (const candidate of candidateTargets) {
    if (!fs.existsSync(candidate)) continue;
    try {
      if (patchFile(candidate)) {
        touched = true;
      }
    } catch (err) {
      console.warn(`[expo-patch] Failed to patch ${candidate}: ${err.message}`);
    }
  }
  if (!touched) {
    console.log('[expo-patch] No patch needed for installed @expo/cli (modern SDK 54+ format).');
  }
}

run();
