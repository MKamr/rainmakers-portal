#!/usr/bin/env node

// Simple wrapper to run vite build
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Try to find vite in different locations
const possiblePaths = [
  path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js'),
  path.join(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js'),
  require.resolve('vite/bin/vite.js')
];

let vitePath = null;
for (const possiblePath of possiblePaths) {
  try {
    if (fs.existsSync(possiblePath)) {
      vitePath = possiblePath;
      break;
    }
  } catch (e) {
    // Continue searching
  }
}

if (!vitePath) {
  console.error('Could not find vite. Make sure vite is installed.');
  process.exit(1);
}

// Run vite build
const vite = spawn('node', [vitePath, 'build'], {
  stdio: 'inherit',
  cwd: __dirname
});

vite.on('close', (code) => {
  process.exit(code || 0);
});

vite.on('error', (err) => {
  console.error('Error running vite:', err);
  process.exit(1);
});

