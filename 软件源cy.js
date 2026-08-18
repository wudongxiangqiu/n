globalThis.source = {
  manifest: {
    id: 'json-source',
    name: 'cywltxdy',
    version: '1.0.9',
    minApiVersion: 1,
    homepage: 'https://raw.githubusercontent.com/wudongxiangqiu/n/refs/heads/main/%E5%88%97%E8%A1%A8.json',
    description: '从 GitHub JSON 读取应用，支持分类主页和搜索，显示版本和大小',
    packageLookup: false,
    permissions: {
      network: ['*'],
      browser: false,
      download: true,
      install: false
    }
  },

  _cachedData: null,

  async _fetchData(retries = 1) {
    if (this._cachedData) return this._cachedData;
    const url = 'https://raw.githubusercontent.com/wudongxiangqiu/n/refs/heads/main/%E5%88%97%E8%A1%A8.json';
    try {
      const resp = await apkmesh.request(url, {
        timeout: 30000,
        headers: { 'User-Agent': 'APK-Mesh-Source/1.0' }
      });
      let content = null;
      if (typeof resp === 'string') {
        content = resp;
      } else if (Array.isArray(resp)) {
        content = String.fromCharCode.apply(null, resp);
      } else if (resp instanceof Uint8Array) {
        content = new TextDecoder('utf-8').decode(resp);
      } else if (resp && typeof resp === 'object') {
        content = resp.content || resp.body || resp.data || resp.text;
        if (content === undefined || content === null) {
          if (resp.apps) {
            this._cachedData = resp;
            return resp;
          }
          content = JSON.stringify(resp);
        } else if (typeof content !== 'string') {
          content = JSON.stringify(content);
        }
      }
      if (!content) {
        throw new Error(`Empty response, type: ${typeof resp}`);
      }
      const data = JSON.parse(content);
      this._cachedData = data;
      return data;
    } catch (e) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this._fetchData(retries - 1);
      }
      throw e;
    }
  },

  async catalog() {
    const data = await this._fetchData();
    const categories = data.categories || [];
    const tabs = [];
    tabs.push({ id: 'all', name: '全部', paged: false });
    categories.forEach(cat => {
      tabs.push({ id: cat, name: cat, paged: false });
    });
    return {
      defaultTabId: 'all',
      tabs: tabs
    };
  },

  async catalogPage(tabId, page) {
    if (page > 1) return { apps: [], hasMore: false };
    const data = await this._fetchData();
    const apps = data.apps || [];
    let filtered = apps;
    if (tabId !== 'all') {
      filtered = apps.filter(app => app.category === tabId);
    }
    const resultApps = filtered.map(app => {
      const result = {
        id: app.id,
        name: app.name,
        description: app.desc || '',
        category: app.category || undefined,
        version: app.version || '未知',
        size: app.size || '未知'
      };
      if (app.icon && app.icon.trim()) {
        result.iconUrl = app.icon;
      }
      return result;
    });
    return {
      apps: resultApps,
      hasMore: false
    };
  },

  async search(query, page) {
    if (page > 1) return [];
    const data = await this._fetchData();
    const apps = data.apps || [];
    const q = query.toLowerCase().trim();
    let results = apps;
    if (q) {
      results = apps.filter(app =>
        app.name.toLowerCase().includes(q) ||
        (app.desc && app.desc.toLowerCase().includes(q)) ||
        (app.category && app.category.toLowerCase().includes(q))
      );
    }
    return results.map(app => {
      const result = {
        id: app.id,
        name: app.name,
        description: app.desc || '',
        category: app.category || undefined,
        version: app.version || '未知',
        size: app.size || '未知'
      };
      if (app.icon && app.icon.trim()) {
        result.iconUrl = app.icon;
      }
      return result;
    });
  },

  async details(idOrUrl) {
    const data = await this._fetchData();
    const app = data.apps.find(a => a.id === idOrUrl);
    if (!app) throw new Error('应用未找到');
    const downloads = app.download ? [{ label: '下载', url: app.download, size: app.size || '未知' }] : [];
    const result = {
      id: app.id,
      name: app.name,
      description: app.desc || '',
      version: app.version || '未知',
      screenshots: app.screenshots || [],
      downloads: downloads,
      category: app.category || undefined
    };
    if (app.icon && app.icon.trim()) {
      result.iconUrl = app.icon;
    }
    return result;
  }
};
