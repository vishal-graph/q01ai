const fs = require('fs');
const path = require('path');

const registryPath = path.resolve(process.env.CHARACTER_REGISTRY_PATH || './config/characters.json');

try {
  const content = fs.readFileSync(registryPath, 'utf8');
  const parsed = JSON.parse(content);
  console.log('Successfully parsed characters.json:', Object.keys(parsed.characters));
} catch (error) {
  console.error('Error parsing characters.json:', error.message);
  if (error instanceof SyntaxError) {
    const content = fs.readFileSync(registryPath, 'utf8');
    const errorPos = error.message.match(/position (\d+)/);
    if (errorPos && errorPos[1]) {
      const pos = parseInt(errorPos[1], 10);
      console.error('Context around error:', content.substring(pos - 50, pos + 50));
    }
  }
}
