import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import * as babelParser from '@babel/parser';
import traverseModule from '@babel/traverse';
import generatorModule from '@babel/generator';
import * as diff from 'diff';
import { config } from '../config.js';

const traverse = traverseModule.default || traverseModule;
const generate = generatorModule.default || generatorModule;

const SWAP = {
  '<': '<=',
  '<=': '<',
  '>': '>=',
  '>=': '>',
  '===': '!==',
  '!==': '===',
  '==': '!=',
  '!=': '=='
};

function parseCode(source) {
  return babelParser.parse(source, {
    sourceType: 'unambiguous',
    plugins: ['jsx', 'typescript']
  });
}

export function countPoints(source) {
  try {
    const ast = parseCode(source);
    let count = 0;
    traverse(ast, {
      BinaryExpression(p) {
        if (SWAP[p.node.operator]) {
          count++;
        }
      }
    });
    return count;
  } catch {
    return 0;
  }
}

export function mutate(source, targetIndex) {
  const ast = parseCode(source);
  let currentIndex = -1;
  let applied = null;

  traverse(ast, {
    BinaryExpression(p) {
      if (SWAP[p.node.operator]) {
        currentIndex++;
        if (currentIndex === targetIndex) {
          const oldOp = p.node.operator;
          const newOp = SWAP[oldOp];
          p.node.operator = newOp;
          const line = p.node.loc?.start?.line || '?';
          applied = `line ${line}: ${oldOp} -> ${newOp}`;
        }
      }
    }
  });

  const output = generate(ast, {}, source);
  return { mutated: output.code, applied };
}

export function runTests(workdir, timeout = 60000) {
  if (config.sandboxMode === 'off') {
    return { status: 'error', output: 'sandbox disabled on this host' };
  }

  let cmd;
  let args;

  if (config.sandboxMode === 'docker') {
    cmd = 'docker';
    args = [
      'run',
      '--rm',
      '--network',
      'none',
      '--memory',
      '256m',
      '--cpus',
      '0.5',
      '--pids-limit',
      '128',
      '--read-only',
      '--tmpfs',
      '/tmp',
      '-v',
      `${workdir}:/work:ro`,
      '-w',
      '/work',
      'proofpath-sandbox-node',
      'node',
      '--test'
    ];
  } else {
    // local execution
    cmd = process.execPath; // node
    args = ['--test'];
  }

  try {
    const r = spawnSync(cmd, args, {
      cwd: workdir,
      timeout,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    if (r.error) {
      if (r.error.code === 'ETIMEDOUT') {
        return { status: 'error', output: 'timeout' };
      }
      return { status: 'error', output: String(r.error.message) };
    }

    const out = ((r.stdout || '') + (r.stderr || '')).slice(-1500);

    if (r.status === 0) {
      return { status: 'pass', output: out };
    }
    if (r.status === 1) {
      // tests ran and caught the failure!
      return { status: 'fail', output: out };
    }

    return { status: 'error', output: out };
  } catch (err) {
    return { status: 'error', output: String(err.message) };
  }
}

export function pickSourceFile(repoDir) {
  if (!fs.existsSync(repoDir)) return null;

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (['.git', 'node_modules', 'dist', 'build', 'test', 'tests'].includes(entry.name)) {
          continue;
        }
        const found = walk(fullPath);
        if (found) return found;
      } else if (entry.isFile()) {
        const name = entry.name.toLowerCase();
        if (
          (name.endsWith('.js') || name.endsWith('.mjs') || name.endsWith('.cjs') || name.endsWith('.ts')) &&
          !name.includes('test') &&
          !name.includes('spec') &&
          !name.includes('config')
        ) {
          try {
            const stats = fs.statSync(fullPath);
            if (stats.size < 30000) {
              const code = fs.readFileSync(fullPath, 'utf-8');
              if (countPoints(code) > 0) {
                return fullPath;
              }
            }
          } catch {
            continue;
          }
        }
      }
    }
    return null;
  }

  return walk(repoDir);
}

export function verifiedMutants(repoDir, srcPath, limit = 1) {
  if (!srcPath || !fs.existsSync(srcPath)) return [];

  const source = fs.readFileSync(srcPath, 'utf-8');
  const baseline = runTests(repoDir);

  if (baseline.status !== 'pass') {
    // baseline must be green, otherwise the signal means nothing
    return [];
  }

  const found = [];
  const points = countPoints(source);

  for (let i = 0; i < points; i++) {
    const { mutated, applied } = mutate(source, i);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofpath-mutate-'));

    try {
      const dstRepo = path.join(tmpDir, 'repo');
      fs.cpSync(repoDir, dstRepo, {
        recursive: true,
        filter: (src) => !src.includes('.git') && !src.includes('node_modules')
      });

      const relPath = path.relative(repoDir, srcPath);
      fs.writeFileSync(path.join(dstRepo, relPath), mutated, 'utf-8');

      const mutantRun = runTests(dstRepo);
      if (mutantRun.status === 'fail') {
        const patch = diff.createTwoFilesPatch(
          `a/${relPath}`,
          `b/${relPath}`,
          source,
          mutated,
          '',
          '',
          { context: 2 }
        );

        found.push({
          file: relPath,
          change: applied,
          diff: patch,
          test_output: mutantRun.output.slice(-600)
        });

        if (found.length >= limit) break;
      }
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  }

  return found;
}
