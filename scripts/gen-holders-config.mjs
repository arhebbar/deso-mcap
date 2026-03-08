import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, 'holders-to-add.json'), 'utf8'));
const lines = data.map((e) => `  { username: '', displayName: '${e.displayName}', classification: 'DESO_BULL', publicKeyBase58Check: '${e.publicKeyBase58Check}' },`);
writeFileSync(join(__dirname, 'holders-config.txt'), lines.join('\n'));
