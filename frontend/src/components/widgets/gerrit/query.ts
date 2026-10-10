/** Gerrit query builders for the "Recent changes" widget config (project/branch globs). */

function globToRegex(value: string): string {
  const escaped = value.replace(/[.+?{}()|[\]\\]/g, '\\$&');
  return `^${escaped.replace(/\*/g, '.*')}`;
}

function toGerritProject(project: string): string {
  if (project.startsWith('^')) return project;
  return project.includes('*') ? globToRegex(project) : project;
}

/** "openstack/octavia, openstack/octavia-*" → "(project:openstack/octavia OR project:^openstack/octavia-.*)" */
export function buildProjectQuery(projectInput: string): string {
  const projects = projectInput.split(',').map((p) => p.trim()).filter(Boolean);
  if (projects.length === 0) return '';
  const formatted = projects.map((p) => `project:${toGerritProject(p)}`);
  if (formatted.length === 1) return formatted[0];
  return `(${formatted.join(' OR ')})`;
}

/** "stable/*" → "branch:^stable/.*" */
export function buildBranchQuery(branchInput: string): string {
  const branch = (branchInput || '').trim();
  if (!branch) return '';
  return branch.includes('*') ? `branch:${globToRegex(branch)}` : `branch:${branch}`;
}
