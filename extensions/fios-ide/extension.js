const vscode = require('vscode');

class QueueProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.items = [];
  }
  refresh(items) {
    this.items = items || [];
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(el) {
    const item = new vscode.TreeItem(el.label, vscode.TreeItemCollapsibleState.None);
    item.description = el.description;
    item.tooltip = el.tooltip;
    return item;
  }
  getChildren() {
    return this.items;
  }
}

async function fetchQueue(apiBase, token) {
  if (!apiBase || !token) return [{ label: 'Configure Fios: Set API Base + Token', description: '' }];
  // Prefer SaaS cards due endpoint via Supabase-backed study — fallback message
  try {
    const res = await fetch(`${apiBase.replace(/\/+$/, '')}/api/study/due-preview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return [{ label: `Queue unavailable (${res.status})`, description: 'Open web app to review' }];
    }
    const data = await res.json();
    const cards = data.cards || data.due || [];
    if (!cards.length) return [{ label: 'All caught up', description: '0 due' }];
    return cards.slice(0, 40).map((c) => ({
      label: String(c.question || c.front || 'Card').slice(0, 80),
      description: c.deckTitle || c.scheduler || '',
      tooltip: String(c.answer || c.back || ''),
    }));
  } catch (e) {
    return [{ label: 'Network error', description: String(e.message || e) }];
  }
}

function activate(context) {
  const provider = new QueueProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('fiosQueue', provider),
    vscode.commands.registerCommand('fios.refreshQueue', async () => {
      const cfg = vscode.workspace.getConfiguration('fios');
      provider.refresh(await fetchQueue(cfg.get('apiBase'), cfg.get('accessToken')));
    }),
    vscode.commands.registerCommand('fios.openReview', async () => {
      const cfg = vscode.workspace.getConfiguration('fios');
      const url = `${(cfg.get('appUrl') || 'https://fios-web.onrender.com').replace(/\/+$/, '')}/?tab=flashcards&review=1`;
      vscode.env.openExternal(vscode.Uri.parse(url));
    }),
    vscode.commands.registerCommand('fios.setApi', async () => {
      const apiBase = await vscode.window.showInputBox({ prompt: 'Fios API origin' });
      const token = await vscode.window.showInputBox({ prompt: 'Supabase access token', password: true });
      if (apiBase != null) await vscode.workspace.getConfiguration('fios').update('apiBase', apiBase, true);
      if (token != null) await vscode.workspace.getConfiguration('fios').update('accessToken', token, true);
      vscode.commands.executeCommand('fios.refreshQueue');
    })
  );
  vscode.commands.executeCommand('fios.refreshQueue');
}

function deactivate() {}

module.exports = { activate, deactivate };
