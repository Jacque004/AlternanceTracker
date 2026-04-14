import { spawnSync } from 'node:child_process';

function runAudit(dir) {
  const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
    cwd: dir,
    encoding: 'utf8',
    shell: true,
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const payload = stdout.trim() || stderr.trim();

  if (!payload) {
    throw new Error(`Aucune sortie npm audit pour ${dir}`);
  }

  try {
    return JSON.parse(payload);
  } catch {
    throw new Error(`Impossible de parser le JSON npm audit pour ${dir}`);
  }
}

function fail(message) {
  console.error(`\n[SECURITY] ${message}`);
  process.exit(1);
}

function listHighOrCritical(vulns) {
  return Object.entries(vulns || {}).filter(([, v]) => v.severity === 'high' || v.severity === 'critical');
}

const backendAudit = runAudit('backend');
const frontendAudit = runAudit('frontend');

const backendFindings = listHighOrCritical(backendAudit.vulnerabilities);
if (backendFindings.length > 0) {
  fail(`Backend contient des vulnerabilites high/critical: ${backendFindings.map(([name]) => name).join(', ')}`);
}

const frontendFindings = listHighOrCritical(frontendAudit.vulnerabilities);
const nonAllowedFrontend = frontendFindings.filter(([name]) => name !== 'lodash');
if (nonAllowedFrontend.length > 0) {
  fail(`Frontend contient des vulnerabilites high/critical non autorisees: ${nonAllowedFrontend.map(([name]) => name).join(', ')}`);
}

if (frontendFindings.length === 1 && frontendFindings[0][0] === 'lodash') {
  console.warn('[SECURITY] Exception temporaire acceptee: lodash (transitif via recharts).');
  console.warn('[SECURITY] Action requise: migrer/remplacer recharts pour supprimer ce risque residuel.');
}

console.log('[SECURITY] Audit conforme a la politique du projet.');

