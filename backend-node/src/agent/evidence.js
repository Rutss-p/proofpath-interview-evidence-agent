import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { config } from '../config.js';

const PREFIX = 'https://github.com/';
const REPO_PART_REGEX = /^[a-zA-Z0-9_\.-]+$/;

export function parseRepo(url) {
  if (!url) return null;
  const trimmed = url.trim();

  if (trimmed.startsWith(PREFIX)) {
    const cleanUrl = trimmed.replace(/\/+$/, '');
    const parts = cleanUrl.slice(PREFIX.length).split('/');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const owner = parts[0];
      const repo = parts[1].replace(/\.git$/, '');
      if (REPO_PART_REGEX.test(owner) && REPO_PART_REGEX.test(repo)) {
        return { owner, repo, kind: 'github_repo' };
      }
    } else if (parts.length === 1 && parts[0] && REPO_PART_REGEX.test(parts[0])) {
      return { owner: parts[0], repo: null, kind: 'github_profile' };
    }
    return null;
  }

  // Support local synthetic demo paths
  if (fs.existsSync(trimmed) && fs.statSync(trimmed).isDirectory()) {
    return { owner: 'local', repo: path.basename(path.resolve(trimmed)), kind: 'local' };
  }

  return null;
}

export async function fetchRepoMeta(url) {
  const parsed = parseRepo(url);
  if (!parsed) {
    throw new Error(`Invalid repository URL: "${url}". Please provide a valid public GitHub repository or profile URL.`);
  }

  const { owner, repo, kind } = parsed;

  if (kind === 'local') {
    const absPath = path.resolve(url);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Local repository path not found: "${url}"`);
    }

    const file_tree = [];
    function walk(dir, rel = '') {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const it of items) {
        if (it.name.startsWith('.') || it.name === 'node_modules') continue;
        const subRel = rel ? `${rel}/${it.name}` : it.name;
        if (it.isDirectory()) {
          walk(path.join(dir, it.name), subRel);
        } else {
          file_tree.push(subRel);
        }
      }
    }
    try { walk(absPath); } catch {}

    let readme = '';
    const readmeFile = file_tree.find(f => /^readme(\.md|\.txt)?$/i.test(f));
    if (readmeFile) {
      try { readme = fs.readFileSync(path.join(absPath, readmeFile), 'utf-8'); } catch {}
    }

    const dependency_files = {};
    if (fs.existsSync(path.join(absPath, 'package.json'))) {
      try { dependency_files['package.json'] = fs.readFileSync(path.join(absPath, 'package.json'), 'utf-8'); } catch {}
    }
    if (fs.existsSync(path.join(absPath, 'requirements.txt'))) {
      try { dependency_files['requirements.txt'] = fs.readFileSync(path.join(absPath, 'requirements.txt'), 'utf-8'); } catch {}
    }

    const languages = { JavaScript: 1000 };
    if (file_tree.some(f => f.endsWith('.ts'))) languages['TypeScript'] = 1000;
    if (file_tree.some(f => f.endsWith('.py'))) languages['Python'] = 1000;
    if (file_tree.some(f => f.endsWith('.go'))) languages['Go'] = 1000;
    if (file_tree.some(f => f.endsWith('.java'))) languages['Java'] = 1000;
    if (file_tree.some(f => f.endsWith('.cs'))) languages['C#'] = 1000;

    let topics = ['javascript', 'testing', 'nodejs'];
    if (dependency_files['package.json']) {
      try {
        const pkg = JSON.parse(dependency_files['package.json']);
        if (pkg.keywords && Array.isArray(pkg.keywords)) topics.push(...pkg.keywords);
      } catch {}
    }

    return {
      url,
      repo: repo || path.basename(absPath),
      languages,
      language: Object.keys(languages)[0] || 'JavaScript',
      topics: Array.from(new Set(topics)),
      description: `Local test repository ${repo}`,
      created_at: '2026-01-01T00:00:00Z',
      pushed_at: '2026-10-19T00:00:00Z',
      file_tree,
      readme,
      dependency_files,
      size_kb: 50
    };
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ProofPath-Agent'
  };
  if (config.githubToken) {
    headers.Authorization = `Bearer ${config.githubToken}`;
  }

  // Handle GitHub Profile URL (e.g. https://github.com/Rutss-p)
  if (kind === 'github_profile') {
    let repos = [];
    try {
      const res = await fetch(`https://api.github.com/users/${owner}/repos?sort=pushed&per_page=15`, {
        headers,
        signal: AbortSignal.timeout(20000)
      });
      if (res.status === 404) {
        throw new Error(`GitHub user or profile not found: https://github.com/${owner}`);
      }
      if (!res.ok) {
        throw new Error(`GitHub API returned status ${res.status} for profile https://github.com/${owner}`);
      }
      repos = await res.json();
    } catch (err) {
      throw new Error(`Failed to fetch GitHub profile "${url}": ${err.message}`);
    }

    if (!Array.isArray(repos) || repos.length === 0) {
      return {
        url,
        repo: `${owner} (Profile)`,
        language: 'Unknown',
        languages: {},
        topics: ['github-profile'],
        description: `Public GitHub profile for ${owner} with 0 public repositories`,
        created_at: new Date().toISOString(),
        pushed_at: new Date().toISOString(),
        file_tree: [],
        readme: '',
        dependency_files: {},
        size_kb: 0
      };
    }

    const languages = {};
    const topics = [];
    const repoSummaries = [];
    const file_tree = [];

    for (const r of repos) {
      if (r.language) {
        languages[r.language] = (languages[r.language] || 0) + (r.size || 100);
      }
      if (Array.isArray(r.topics)) {
        topics.push(...r.topics);
      }
      if (r.name) {
        file_tree.push(`repo: ${r.name}`);
      }
      repoSummaries.push(`${r.name} (${r.language || 'Code'}${r.description ? ': ' + r.description : ''})`);
    }

    const topRepo = repos[0];
    let readme = '';
    const dependency_files = {};

    try {
      const rmRes = await fetch(`https://api.github.com/repos/${owner}/${topRepo.name}/readme`, {
        headers,
        signal: AbortSignal.timeout(10000)
      });
      if (rmRes.ok) {
        const rmData = await rmRes.json();
        if (rmData.content) {
          readme = Buffer.from(rmData.content, 'base64').toString('utf-8');
        }
      }
    } catch {}

    for (const depFile of ['package.json', 'requirements.txt']) {
      try {
        const depRes = await fetch(`https://api.github.com/repos/${owner}/${topRepo.name}/contents/${depFile}`, {
          headers,
          signal: AbortSignal.timeout(10000)
        });
        if (depRes.ok) {
          const depData = await depRes.json();
          if (depData.content) {
            dependency_files[depFile] = Buffer.from(depData.content, 'base64').toString('utf-8');
          }
        }
      } catch {}
    }

    return {
      url,
      repo: `${owner} (Profile: ${repos.length} public repositories)`,
      language: topRepo.language || Object.keys(languages)[0] || 'JavaScript',
      languages,
      topics: Array.from(new Set(topics)),
      description: `GitHub public repositories for ${owner}: ${repoSummaries.slice(0, 10).join('; ')}`,
      created_at: topRepo.created_at,
      pushed_at: topRepo.pushed_at,
      file_tree,
      readme,
      dependency_files,
      size_kb: repos.reduce((acc, r) => acc + (r.size || 0), 0)
    };
  }

  // Handle GitHub Specific Repository URL
  let repoData = null;
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      signal: AbortSignal.timeout(20000)
    });
    if (res.status === 404) {
      throw new Error(`Repository not found or private: https://github.com/${owner}/${repo}`);
    }
    if (!res.ok) {
      throw new Error(`GitHub API returned status ${res.status} for repository https://github.com/${owner}/${repo}`);
    }
    repoData = await res.json();
  } catch (err) {
    throw new Error(`Failed to fetch GitHub repository "${url}": ${err.message}`);
  }

  let languages = {};
  try {
    const langRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, {
      headers,
      signal: AbortSignal.timeout(10000)
    });
    if (langRes.ok) {
      languages = await langRes.json();
    }
  } catch {}

  let file_tree = [];
  try {
    const branch = repoData.default_branch || 'main';
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
      headers,
      signal: AbortSignal.timeout(15000)
    });
    if (treeRes.ok) {
      const treeJson = await treeRes.json();
      if (Array.isArray(treeJson.tree)) {
        file_tree = treeJson.tree.map(t => t.path);
      }
    }
  } catch {}

  let readme = '';
  try {
    const rmRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers,
      signal: AbortSignal.timeout(10000)
    });
    if (rmRes.ok) {
      const rmData = await rmRes.json();
      if (rmData.content) {
        readme = Buffer.from(rmData.content, 'base64').toString('utf-8');
      }
    }
  } catch {}

  const dependency_files = {};
  for (const depFile of ['package.json', 'requirements.txt']) {
    try {
      const depRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${depFile}`, {
        headers,
        signal: AbortSignal.timeout(10000)
      });
      if (depRes.ok) {
        const depData = await depRes.json();
        if (depData.content) {
          dependency_files[depFile] = Buffer.from(depData.content, 'base64').toString('utf-8');
        }
      }
    } catch {}
  }

  return {
    url,
    repo,
    language: repoData.language || Object.keys(languages)[0] || 'Unknown',
    languages,
    topics: repoData.topics || [],
    description: repoData.description || '',
    created_at: repoData.created_at,
    pushed_at: repoData.pushed_at,
    file_tree,
    readme,
    dependency_files,
    size_kb: repoData.size || 0
  };
}

export function cloneRepo(url, destDir) {
  const parsed = parseRepo(url);
  if (!parsed) return null;

  const { owner, kind } = parsed;
  const target = path.join(destDir, 'repo');

  if (kind === 'local' && fs.existsSync(url)) {
    fs.cpSync(url, target, {
      recursive: true,
      filter: (src) => !src.includes('.git') && !src.includes('node_modules')
    });
    return target;
  }

  let cloneUrl = url;
  if (kind === 'github_profile') {
    if (parsed.repo) {
      cloneUrl = `https://github.com/${owner}/${parsed.repo}.git`;
    } else {
      return null;
    }
  }

  try {
    execSync(`git clone --depth 1 -- "${cloneUrl}" "${target}"`, {
      timeout: 60000,
      stdio: 'pipe'
    });
    return target;
  } catch {
    return null;
  }
}
