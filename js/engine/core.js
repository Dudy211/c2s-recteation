var EngineSystem = window.EngineSystem || {
    CONVERSION_RATE: 0.114514 / 114514,
    graph: null,
    nodeMap: new Map(),
    unlockedNodes: new Set(['core', 'speed_core']),
    nodeLevels: {},
    challengeProgress: {},
    challengeCompleted: new Set(),
    engineTokens: 0,
    dataLoaded: false,
    selectedNode: null,
    detailCollapsed: false,
    viewX: 0, viewY: 0, scale: 1,
    isDragging: false, lastMouseX: 0, lastMouseY: 0,
    pinchDist: 0, pinchScale: 1, isPinching: false,
    audioCtx: null, previewAudio: null, isOpen: false,
    iconCache: {},

    simulation: null,
    nodesData: [],
    linksData: [],
    layoutInitialized: false,

    async init() {
        await this.loadTreeData();
        this.initAudio();
        this.loadProgress();
    },

    initAudio() {
        try { this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { console.warn('Web Audio API not supported'); }
    },

    resolvePath(url) {
        if (!url || url.startsWith('data:') || url.startsWith('http') || url.startsWith('//')) return url;
        if (!url.startsWith('/')) url = '/' + url;
        return url;
    },

    async loadText(url) {
        url = this.resolvePath(url);
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200 || xhr.status === 0) resolve(xhr.responseText);
                    else reject(new Error('XHR ' + xhr.status));
                }
            };
            xhr.onerror = () => reject(new Error('XHR error'));
            xhr.send();
        });
    },

    async loadImageAsDataURL(url) {
        if (this.iconCache[url]) return this.iconCache[url];
        const resolvedUrl = this.resolvePath(url);
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', resolvedUrl, true);
            xhr.responseType = 'blob';
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200 || xhr.status === 0) {
                        const reader = new FileReader();
                        reader.onloadend = () => { this.iconCache[url] = reader.result; resolve(reader.result); };
                        reader.onerror = reject;
                        reader.readAsDataURL(xhr.response);
                    } else reject(new Error('Image XHR ' + xhr.status));
                }
            };
            xhr.onerror = () => reject(new Error('Image XHR error'));
            xhr.send();
        });
    },

    async loadTreeData() {
        let data = null;
        try {
            const text = await this.loadText('data/engine-tree.json');
            data = JSON.parse(text);
        } catch (e) { console.warn('XHR load failed:', e); }
        if (!data || !data.nodes) {
            console.error('Engine tree data not found');
            data = { nodes: [] };
        }
        this.graph = data;
        this.buildNodeMap();
        await this.preloadIcons();
        this.prepareForceData();
        this.dataLoaded = true;
    },

    async preloadIcons() {
        if (!this.graph || !this.graph.nodes) return;
        const promises = this.graph.nodes
            .filter(n => n.icon && n.icon.trim())
            .map(async (node) => {
                try { node.icon = await this.loadImageAsDataURL(node.icon); }
                catch (e) { console.warn('Icon preload failed:', node.icon); }
            });
        await Promise.all(promises);
    },

    buildNodeMap() {
        this.nodeMap.clear();
        if (!this.graph || !this.graph.nodes) return;
        this.graph.nodes.forEach(node => {
            this.nodeMap.set(node.id, node);
            if (!node.prev) node.prev = [];
            else if (!Array.isArray(node.prev)) node.prev = [node.prev];
            if (!node.next) node.next = [];
            else if (!Array.isArray(node.next)) node.next = [node.next];
        });
        this.graph.nodes.forEach(node => {
            const prevArray = Array.isArray(node.prev) ? node.prev : [];
            prevArray.forEach(pid => {
                const parent = this.nodeMap.get(pid);
                if (parent && !parent.next.includes(node.id)) {
                    parent.next.push(node.id);
                }
            });
        });
    },

    prepareForceData() {
        if (!this.graph || !this.graph.nodes) return;
        this.nodesData = this.graph.nodes.map(node => ({
            id: node.id, x: 0, y: 0, vx: 0, vy: 0, fx: null, fy: null, radius: 45, data: node
        }));
        this.linksData = [];
        const linkSet = new Set();
        this.graph.nodes.forEach(targetNode => {
            const prevArray = Array.isArray(targetNode.prev) ? targetNode.prev : (targetNode.prev ? [targetNode.prev] : []);
            prevArray.forEach(pid => {
                const sourceNode = this.nodeMap.get(pid);
                if (!sourceNode) return;
                const linkId = sourceNode.id + '->' + targetNode.id;
                if (linkSet.has(linkId)) return;
                linkSet.add(linkId);
                this.linksData.push({ source: sourceNode.id, target: targetNode.id, value: 1 });
            });
        });
        const rootNodes = this.nodesData.filter(n => !n.data.prev || n.data.prev.length === 0);
        const rootCount = rootNodes.length;
        rootNodes.forEach((n, i) => {
            if (rootCount === 1) {
                n.x = 0; n.y = 0;
            } else {
                const angle = (i / rootCount) * Math.PI * 2;
                const dist = 80;
                n.x = Math.cos(angle) * dist;
                n.y = Math.sin(angle) * dist;
            }
        });
        const nonRoots = this.nodesData.filter(n => n.data.prev && n.data.prev.length > 0);
        nonRoots.forEach((n, i) => {
            const angle = (i / Math.max(nonRoots.length, 1)) * Math.PI * 2;
            const dist = 150 + Math.random() * 100;
            n.x = Math.cos(angle) * dist;
            n.y = Math.sin(angle) * dist;
        });
    },

    loadProgress() {
        const saved = localStorage.getItem('cells_engine');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.engineTokens = data.engineTokens || 0;
                this.unlockedNodes = new Set(data.unlockedNodes || ['core', 'speed_core']);
                this.nodeLevels = data.nodeLevels || {};
                this.challengeProgress = data.challengeProgress || {};
                this.challengeCompleted = new Set(data.challengeCompleted || []);
                if (this.graph && this.graph.nodes) {
                    this.graph.nodes.forEach(node => {
                        if (this.nodeLevels[node.id] !== undefined) {
                            node.level = this.nodeLevels[node.id];
                        }
                    });
                }
            } catch (e) { console.error('Failed to load engine progress', e); }
        }
    },

    saveProgress() {
        if (this.graph && this.graph.nodes) {
            this.graph.nodes.forEach(node => {
                this.nodeLevels[node.id] = node.level;
            });
        }
        localStorage.setItem('cells_engine', JSON.stringify({
            engineTokens: this.engineTokens,
            unlockedNodes: Array.from(this.unlockedNodes),
            nodeLevels: this.nodeLevels,
            challengeProgress: this.challengeProgress,
            challengeCompleted: Array.from(this.challengeCompleted),
            timestamp: Date.now()
        }));
    },

    isParentUnlocked(node) {
        if (!node.prev || node.prev.length === 0) return true;
        return node.prev.every(pid => this.unlockedNodes.has(pid));
    },

    isChallengeCompleted(node) {
        if (!node.challenge) return true;
        return this.challengeCompleted.has(node.id);
    },

    playClickSound() {
        if (!this.audioCtx) return;
        try {
            const ctx = this.audioCtx, osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08);
        } catch (e) {}
    },

    playUpgradeSound() {
        if (!this.audioCtx) return;
        try {
            const ctx = this.audioCtx, osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523, ctx.currentTime);
            osc.frequency.setValueAtTime(659, ctx.currentTime + 0.05);
            osc.frequency.setValueAtTime(784, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
        } catch (e) {}
    },

    playPreviewMusic(node) {
        this.stopPreviewMusic();
        if (!node.previewMusic) return;
        let audio = null;
        if (typeof Loader !== 'undefined' && Loader.getAudio) audio = Loader.getAudio(node.previewMusic);
        if (!audio) { audio = new Audio(node.previewMusic); audio.loop = true; audio.volume = 0.4; }
        else { audio = audio.cloneNode(); audio.loop = true; audio.volume = 0.4; }
        audio.play().catch(() => {});
        this.previewAudio = audio;
    },

    stopPreviewMusic() {
        if (this.previewAudio) {
            this.previewAudio.pause();
            this.previewAudio.currentTime = 0;
            this.previewAudio = null;
        }
    },

    findNode(id) { return this.nodeMap.get(id) || null; },

    getNodeLevel(nodeId) {
        const node = this.nodeMap.get(nodeId);
        if (!node || !node.prev || node.prev.length === 0) return 0;
        let maxParentLevel = -1;
        node.prev.forEach(pid => { maxParentLevel = Math.max(maxParentLevel, this.getNodeLevel(pid)); });
        return maxParentLevel + 1;
    },

    getNodeColor(node) {
        return node.color || (node.type === 'challenge' ? '#FF6464' : node.type === 'upgrade' ? '#64B4FF' : '#FFD700');
    },

    refreshChallengesFromGame() {
        if (typeof Game === 'undefined') return;
        if (Game.stats) {
            ['damage', 'speed', 'power'].forEach(statName => {
                if (Game.stats[statName]) Recorder.recordState('statLevel', Game.stats[statName].level);
            });
        }
        if (typeof Modules !== 'undefined' && Modules.unlocked) {
            Object.entries(Modules.unlocked).forEach(([moduleId, data]) => {
                if (data && data.level > 0) Recorder.recordState('moduleLevel', data.level);
            });
        }
        if (Game.tokens !== undefined) Recorder.recordState('tokens', Math.floor(Game.tokens));
    },

    getEngineEffects() {
        const effects = {
            globalMult: 1,
            clickMult: 1,
            autoMult: 1,
            speedMult: 1,
            voidMult: 1,
            critChance: 0,
            critMult: 1,
            quantumFold: { chance: 0, mult: 1 }
        };

        if (!this.graph || !this.graph.nodes) return effects;

        this.graph.nodes.forEach(node => {
            if (!this.unlockedNodes.has(node.id)) return;
            const level = node.level || 0;
            if (level <= 0) return;

            if (node.effects) {
                Object.entries(node.effects).forEach(([key, cfg]) => {
                    if (key === 'quantumFold') {
                        effects.quantumFold.chance += (cfg.base || 0) + (cfg.perLevel || 0) * level;
                        effects.quantumFold.mult += (cfg.base || 0) + (cfg.perLevel || 0) * level;
                    } else if (key === 'critChance') {
                        effects.critChance += (cfg.base || 0) + (cfg.perLevel || 0) * level;
                    } else {
                        effects[key] += (cfg.base || 0) + (cfg.perLevel || 0) * level;
                    }
                });
            }
        });

        return effects;
    },

    formatEffectValue(cfg, level) {
        const val = (cfg.base || 0) + (cfg.perLevel || 0) * level;
        if (cfg.format === 'percent') {
            return (val * 100).toFixed(0);
        }
        return (val * 100).toFixed(0);
    },

    getNodeEffectsHTML(node) {
        if (!node.effects) return '';
        const isUnlocked = this.unlockedNodes.has(node.id);
        const currentLevel = isUnlocked ? (node.level || 0) : 0;
        const nextLevel = currentLevel + 1;

        let html = '<div class="node-effects">';
        html += '<div class="node-effects-title">🔮 节点效果</div>';

        Object.entries(node.effects).forEach(([key, cfg]) => {
            const currentVal = this.formatEffectValue(cfg, currentLevel);
            const nextVal = this.formatEffectValue(cfg, nextLevel);
            const desc = cfg.desc.replace('{val}', currentVal);
            const nextDesc = cfg.desc.replace('{val}', nextVal);

            html += '<div class="effect-row">';
            html += '<div class="effect-current">' + desc + '</div>';
            if (isUnlocked && currentLevel < node.maxLevel) {
                html += '<div class="effect-next">升级后: ' + nextDesc + '</div>';
            } else if (!isUnlocked) {
                html += '<div class="effect-next locked-preview">解锁后: ' + nextDesc + '</div>';
            } else {
                html += '<div class="effect-max">已满级</div>';
            }
            html += '</div>';
        });

        html += '</div>';
        return html;
    },

    showConvertConfirm() {
        if (typeof Game === 'undefined' || Game.tokens < 114514) {
            const current = typeof Game !== 'undefined' ? Math.floor(Game.tokens) : 0;
            alert('游戏代币不足！\n需要至少 114,514 代币\n当前拥有: ' + current);
            return;
        }
        const convertibleAmount = Math.floor(Game.tokens / 114514) * 114514;
        const engineTokensGained = (convertibleAmount * this.CONVERSION_RATE).toFixed(6);
        if (!confirm('确定要转换吗？\n\n消耗: ' + convertibleAmount.toLocaleString() + ' ◆\n获得: ' + engineTokensGained + ' ⚡\n\n⚠️ 这将重置游戏进度（保留引擎升级）！')) return;
        this.executeConversion(convertibleAmount, parseFloat(engineTokensGained));
    },

    executeConversion(gameTokens, engineTokensGained) {
        this.engineTokens += engineTokensGained;
        if (typeof Game !== 'undefined') {
            Game.tokens = 0;
            Game.stats = {
                damage: { value: 0, level: 0, cost: 15, baseCost: 15, costMult: 1.45, levelCostMult: 4 },
                speed: { value: 0, level: 0, cost: 25, baseCost: 25, costMult: 1.55, levelCostMult: 5 },
                power: { value: 0, level: 0, cost: 50, baseCost: 50, costMult: 1.65, levelCostMult: 6 }
            };
        }
        if (typeof Modules !== 'undefined') { Modules.unlocked = {}; Modules.save(); }
        localStorage.removeItem('cells_auto_save');
        for (let i = 0; i < 5; i++) localStorage.removeItem('cells_manual_' + i);
        this.saveProgress();
        this.closeEngineModal();
        if (typeof UI !== 'undefined') UI.update();
        if (typeof Modules !== 'undefined' && Modules.panelOpen) { Modules.closePanel(); Modules.renderModulePanel(); }
        UI.showFloatText(window.innerWidth / 2, window.innerHeight / 2, '转换成功! +' + engineTokensGained.toFixed(6) + ' ⚡', 'levelup');
    },

    togglePreviewMusic() {
        const node = this.selectedNode;
        if (!node || !node.previewMusic) return;
        if (this.previewAudio && !this.previewAudio.paused) {
            this.stopPreviewMusic();
            const btn = document.getElementById('musicBtn');
            if (btn) btn.textContent = '播放';
        } else {
            this.playPreviewMusic(node);
            const btn = document.getElementById('musicBtn');
            if (btn) btn.textContent = '停止';
        }
    },


    toggleDetailCollapse() {
        this.detailCollapsed = !this.detailCollapsed;
        const panel = document.getElementById('nodeDetailPanel');
        if (!panel) return;

        const toggleBtn = document.getElementById('detailToggleBtn');

        if (this.detailCollapsed) {
            panel.classList.add('collapsed');
            panel.classList.remove('show-full');
            if (toggleBtn) toggleBtn.innerHTML = '▶';
        } else {
            panel.classList.remove('collapsed');
            panel.classList.add('show-full');
            if (toggleBtn) toggleBtn.innerHTML = '▼';
        }
    }
};
