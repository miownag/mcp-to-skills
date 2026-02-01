/**
 * Build script for creating cross-platform binaries
 */

import type { Target } from 'bun';

const targets = [
  'bun-darwin-arm64',
  'bun-darwin-x64',
  'bun-linux-x64',
  'bun-linux-arm64',
  'bun-windows-x64',
] as const;

async function build() {
  console.log('Building m2s binaries...\n');

  const { mkdirSync, existsSync } = await import('node:fs');

  // Ensure bin directory exists
  if (!existsSync('./bin')) {
    mkdirSync('./bin', { recursive: true });
  }

  for (const target of targets) {
    const outfile = `./bin/m2s-${target.replace('bun-', '')}`;

    console.log(`Building ${target}...`);

    try {
      const result = await Bun.build({
        entrypoints: ['./src/index.ts'],
        compile: {
          target,
          outfile, // .exe added automatically
        },
      });

      if (result.success) {
        console.log(`  ✓ ${outfile}`);
      } else {
        console.error(`  ✗ Failed to build ${target}`);
        for (const log of result.logs) {
          console.error(`    ${log}`);
        }
      }
    } catch (error) {
      console.error(`  ✗ Error building ${target}: ${error}`);
    }
  }

  console.log('\nDone!');
}

build();
