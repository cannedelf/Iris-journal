// Thin wrapper around the GitHub Contents API.
// Used to read and write the data file (and photos) straight back to the repo,
// so every change is committed with full version history — your data can't be lost.

const LS_TOKEN = 'sunnyside.token';
const LS_REPO = 'sunnyside.repo'; // "owner/repo"
const LS_BRANCH = 'sunnyside.branch';

// Auto-detect owner/repo/branch from the GitHub Pages URL where possible.
// e.g. https://cannedelf.github.io/iris-journal/  ->  owner "cannedelf", repo "iris-journal".
function detectRepo() {
  const host = location.hostname; // cannedelf.github.io
  const m = host.match(/^([^.]+)\.github\.io$/);
  if (m) {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length) return `${m[1]}/${parts[0]}`;
  }
  return 'cannedelf/iris-journal';
}

export const gh = {
  get token() { return localStorage.getItem(LS_TOKEN) || ''; },
  set token(v) { v ? localStorage.setItem(LS_TOKEN, v.trim()) : localStorage.removeItem(LS_TOKEN); },

  get repo() { return localStorage.getItem(LS_REPO) || detectRepo(); },
  set repo(v) { localStorage.setItem(LS_REPO, v.trim()); },

  get branch() { return localStorage.getItem(LS_BRANCH) || 'main'; },
  set branch(v) { localStorage.setItem(LS_BRANCH, v.trim()); },

  get configured() { return !!this.token; },

  async _api(path, opts = {}) {
    const res = await fetch(`https://api.github.com/repos/${this.repo}/contents/${path}`, {
      ...opts,
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${this.token}`,
        ...(opts.headers || {})
      }
    });
    return res;
  },

  // Returns { contentText, sha } or null if the file does not exist.
  async getFile(path) {
    const res = await this._api(`${path}?ref=${encodeURIComponent(this.branch)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub read failed (${res.status}): ${await res.text()}`);
    const json = await res.json();
    return { contentText: decodeURIComponent(escape(atob(json.content.replace(/\n/g, '')))), sha: json.sha };
  },

  // Returns just the blob sha for a path, without decoding the content.
  // Safe for binary files (photos) where the text decode in getFile would throw.
  async getSha(path) {
    const res = await this._api(`${path}?ref=${encodeURIComponent(this.branch)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub read failed (${res.status}): ${await res.text()}`);
    return (await res.json()).sha;
  },

  // Create or update a file. base64Content must already be base64. Returns the new sha.
  async putFile(path, base64Content, message, sha) {
    const body = { message, content: base64Content, branch: this.branch };
    if (sha) body.sha = sha;
    const res = await this._api(path, { method: 'PUT', body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`GitHub write failed (${res.status}): ${await res.text()}`);
    return (await res.json()).content.sha;
  },

  // Quick credential check — verifies the token can see the repo.
  async verify() {
    const res = await fetch(`https://api.github.com/repos/${this.repo}`, {
      headers: { 'Authorization': `Bearer ${this.token}`, 'Accept': 'application/vnd.github+json' }
    });
    if (!res.ok) throw new Error(`Could not reach ${this.repo} (${res.status}). Check the token and repo name.`);
    return await res.json();
  }
};

// UTF-8 safe base64 encoder for JSON content.
export function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
