const Loader = {
    resources: [],
    loaded: 0,
    failed: [],
    audioElements: {},
    previewAudio: null,
    existingScripts: new Set(),
    initStarted: false,

    init() {
        if (this.initStarted) return;
        this.initStarted = true;
        this.scanResources();
        this.startLoading();
    },

    scanResources() {
        const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
        cssLinks.forEach(link => {
            if (link.href && !link.href.includes('loader.css')) {
                this.resources.push({ type: 'css', url: link.href, name: this.getFileName(link.href), existing: true });
            }
        });
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
            if (script.src && !script.src.includes('loader.js')) {
                this.existingScripts.add(script.src);
                this.resources.push({ type: 'js', url: script.src, name: this.getFileName(script.src), existing: true });
            }
        });
        this.resources.push({ type: 'json', url: 'data/engine-tree.json', name: 'engine-tree.json', existing: false });
        this.resources.push({ type: 'dynamic', url: 'engine-tree', name: '引擎节点资源', existing: false });
    },

    getFileName(url) {
        try { return url.split('/').pop().split('?')[0]; }
        catch { return url; }
    },

    async startLoading() {
        const total = this.resources.length;
        const statusEl = document.getElementById('loaderStatus');
        const percentEl = document.getElementById('loaderPercent');
        const barEl = document.getElementById('loaderProgressBar');
        const filesEl = document.getElementById('loaderFiles');

        const updateUI = () => {
            const percent = Math.round((this.loaded / total) * 100);
            barEl.style.width = percent + '%';
            percentEl.textContent = percent + '%';
            if (this.failed.length > 0) {
                statusEl.textContent = `加载中... (${this.loaded}/${total}) - ${this.failed.length} 个失败`;
            } else {
                statusEl.textContent = `正在加载资源... (${this.loaded}/${total})`;
            }
            const current = this.resources[this.loaded] || this.resources[this.resources.length - 1];
            if (current) filesEl.textContent = current.name;
        };

        updateUI();

        for (const res of this.resources) {
            try {
                await this.loadResource(res);
                this.loaded++;
                updateUI();
            } catch (err) {
                this.failed.push({ ...res, error: err.message });
                this.loaded++;
                updateUI();
                console.warn(`Failed to load: ${res.url}`, err);
            }
        }

        try { await this.loadEngineTreeAssets(); }
        catch (err) { console.warn('Engine tree assets loading failed', err); }

        statusEl.textContent = '加载完成！';
        percentEl.textContent = '100%';
        barEl.style.width = '100%';

        // ===== 修复: 立即开始初始化，与淡出动画并行 =====
        this.startInit();

        setTimeout(() => {
            this.hideLoader();
        }, 300);
    },

    // ===== 新增: 立即开始初始化 =====
    startInit() {
        // 使用 requestAnimationFrame 确保在下一帧开始初始化
        // 这样 loader 的 100% 状态已经渲染，用户看到"加载完成"
        requestAnimationFrame(() => {
            if (typeof init === 'function') {
                try {
                    init();
                } catch (e) {
                    console.error('Init failed:', e);
                }
            }
        });
    },

    async loadResource(res) {
        if (res.existing) {
            return this.waitForExistingResource(res.url, res.type);
        }
        switch (res.type) {
            case 'css': return this.loadCSS(res.url);
            case 'js': return this.loadScript(res.url);
            case 'json': return this.loadJSON(res.url);
            case 'dynamic': return Promise.resolve();
            default: return this.fetchResource(res.url);
        }
    },

    waitForExistingResource(url, type) {
        return new Promise((resolve) => {
            const existing = type === 'js'
                ? document.querySelector(`script[src="${url}"]`)
                : document.querySelector(`link[href="${url}"]`);
            if (!existing) { resolve(); return; }
            if (existing.loaded || (type === 'js' && window.THREE) || (type === 'css' && existing.sheet)) {
                resolve(); return;
            }
            const onLoad = () => { existing.loaded = true; resolve(); };
            const onError = () => { existing.loaded = true; resolve(); };
            existing.addEventListener('load', onLoad, { once: true });
            existing.addEventListener('error', onError, { once: true });
            setTimeout(() => { if (!existing.loaded) { existing.loaded = true; resolve(); } }, 3000);
        });
    },

    loadCSS(url) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = () => resolve();
            link.onerror = () => reject(new Error('CSS load failed'));
            document.head.appendChild(link);
        });
    },

    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Script load failed'));
            document.head.appendChild(script);
        });
    },

    loadJSON(url) {
        return fetch(url).then(r => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });
    },

    fetchResource(url) {
        return fetch(url, { method: 'HEAD' }).then(r => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
        });
    },

    async loadEngineTreeAssets() {
        let treeData;
        try {
            const response = await fetch('data/engine-tree.json');
            if (!response.ok) throw new Error('Failed to load engine tree');
            treeData = await response.json();
        } catch (err) { return; }
        if (!treeData.nodes) return;
        const extraAssets = [];
        treeData.nodes.forEach(node => {
            if (node.icon) extraAssets.push({ type: 'image', url: node.icon, name: node.icon });
            if (node.previewMusic) extraAssets.push({ type: 'audio', url: node.previewMusic, name: node.previewMusic });
        });
        const statusEl = document.getElementById('loaderStatus');
        const totalExtra = extraAssets.length;
        let loadedExtra = 0;
        if (totalExtra > 0) statusEl.textContent = `加载节点资源... (0/${totalExtra})`;
        for (const asset of extraAssets) {
            try {
                if (asset.type === 'audio') await this.preloadAudio(asset.url);
                else await this.preloadImage(asset.url);
                loadedExtra++;
                statusEl.textContent = `加载节点资源... (${loadedExtra}/${totalExtra})`;
            } catch (err) { console.warn(`Failed to preload: ${asset.url}`); }
        }
    },

    preloadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = url;
        });
    },

    preloadAudio(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.oncanplaythrough = () => { this.audioElements[url] = audio; resolve(); };
            audio.onerror = () => reject();
            audio.src = url;
        });
    },

    getAudio(url) {
        return this.audioElements[url] || null;
    },

    hideLoader() {
        const loader = document.getElementById('loaderScreen');
        if (loader) {
            loader.classList.add('loader-done');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 600);
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Loader.init());
} else {
    Loader.init();
}