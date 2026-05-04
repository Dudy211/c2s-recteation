const Modules = {
    definitions: {
        autoCollector: {
            id: 'autoCollector',
            name: '自动收集器',
            description: '自动产出代币',
            icon: '◈',
            color: '#FFD700',
            unlockCost: 100,
            baseCost: 50,
            costMult: 1.6,
            maxLevel: 50,
            
            getOutput: (level) => {
                if (level <= 0) return 0;
                const base = 1 + (level - 1) * 0.5;
                const bonus = Math.pow(1.5, Math.floor((level - 1) / 5));
                return base * bonus;
            },
            
            canUnlock: () => Game.tokens >= 100 || Game.stats.damage.level >= 2
        },
        
        critCore: {
            id: 'critCore',
            name: '暴击核心',
            description: '提升暴击率与倍率',
            icon: '✦',
            color: '#FF4444',
            unlockCost: 500,
            baseCost: 200,
            costMult: 1.8,
            maxLevel: 30,
            
            getOutput: (level) => {
                if (level <= 0) return { critChance: 0, critMult: 3 };
                const critChance = Math.min(0.5, level * 0.02);
                const critMult = 3 + Math.floor(level / 10) * 0.5;
                return { critChance, critMult };
            },
            
            canUnlock: () => Game.stats.speed.level >= 3 || Modules.isUnlocked('autoCollector')
        },
        
        timeWarp: {
            id: 'timeWarp',
            name: '时间扭曲',
            description: '加速模块产出',
            icon: '◐',
            color: '#00D4FF',
            unlockCost: 2000,
            baseCost: 800,
            costMult: 2.0,
            maxLevel: 20,
            
            getOutput: (level) => {
                if (level <= 0) return 1;
                return 1 + level * 0.05;
            },
            
            canUnlock: () => Game.stats.power.level >= 2
        },
        
        quantumFold: {
            id: 'quantumFold',
            name: '量子折叠',
            description: '点击概率多倍',
            icon: '◎',
            color: '#E8B4FF',
            unlockCost: 5000,
            baseCost: 2500,
            costMult: 2.2,
            maxLevel: 15,
            
            getOutput: (level) => {
                if (level <= 0) return { chance: 0, mult: 1 };
                return {
                    chance: Math.min(0.3, level * 0.03),
                    mult: 1 + level * 0.2
                };
            },
            
            canUnlock: () => Modules.getTotalLevels() >= 20
        },
        
        voidMirror: {
            id: 'voidMirror',
            name: '虚空之镜',
            description: '基于代币加成',
            icon: '◊',
            color: '#9D4EDD',
            unlockCost: 15000,
            baseCost: 8000,
            costMult: 2.5,
            maxLevel: 10,
            
            getOutput: (level) => {
                if (level <= 0) return 1;
                const tokenBonus = Math.log10(Math.max(10, Game.tokens)) * 0.01 * level;
                return 1 + tokenBonus;
            },
            
            canUnlock: () => Game.tokens >= 10000
        }
    },
    
    unlocked: {},
    panelOpen: false,
    
    init() {
        const saved = localStorage.getItem('cells_modules');
        if (saved) {
            this.unlocked = JSON.parse(saved);
        }
        
        this.createToggleButton();
        this.createPanel();
        this.renderModulePanel();
        this.initEvents();
    },
    
    createToggleButton() {
        const btn = document.createElement('button');
        btn.id = 'moduleToggle';
        btn.className = 'module-toggle-btn';
        btn.innerHTML = '◈ 模块系统 <span class="arrow">▼</span>';
        btn.onclick = () => this.togglePanel();
        document.body.appendChild(btn);
        
        const overlay = document.createElement('div');
        overlay.id = 'moduleOverlay';
        overlay.className = 'module-overlay';
        overlay.onclick = () => this.closePanel();
        document.body.appendChild(overlay);
    },
    
    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'modulePanel';
        panel.className = 'module-panel';
        document.body.appendChild(panel);
    },
    
    initEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.panelOpen) {
                this.closePanel();
            }
        });
    },
    
    togglePanel() {
        this.panelOpen = !this.panelOpen;
        const btn = document.getElementById('moduleToggle');
        const panel = document.getElementById('modulePanel');
        const overlay = document.getElementById('moduleOverlay');
        
        btn.classList.toggle('active', this.panelOpen);
        panel.classList.toggle('open', this.panelOpen);
        overlay.classList.toggle('show', this.panelOpen);
    },
    
    closePanel() {
        this.panelOpen = false;
        document.getElementById('moduleToggle').classList.remove('active');
        document.getElementById('modulePanel').classList.remove('open');
        document.getElementById('moduleOverlay').classList.remove('show');
    },
    
    isUnlocked(moduleId) {
        return this.unlocked[moduleId] && this.unlocked[moduleId].level > 0;
    },
    
    getLevel(moduleId) {
        return this.unlocked[moduleId]?.level || 0;
    },
    
    getCost(moduleId) {
        const def = this.definitions[moduleId];
        const level = this.getLevel(moduleId);
        
        if (level === 0) return def.unlockCost;
        return Math.floor(def.baseCost * Math.pow(def.costMult, level - 1));
    },
    
    upgrade(moduleId) {
        const def = this.definitions[moduleId];
        const currentLevel = this.getLevel(moduleId);
        const cost = this.getCost(moduleId);
        
        if (currentLevel >= def.maxLevel) {
            UI.showFloatText(window.innerWidth / 2, window.innerHeight / 2, '已达最大等级!', 'system');
            return false;
        }
        
        if (Game.tokens < cost) {
            UI.showFloatText(window.innerWidth / 2, window.innerHeight / 2, '代币不足!', 'system');
            return false;
        }
        
        if (currentLevel === 0 && !def.canUnlock()) {
            UI.showFloatText(window.innerWidth / 2, window.innerHeight / 2, '未满足解锁条件!', 'system');
            return false;
        }
        
        Game.tokens -= cost;
        
        if (!this.unlocked[moduleId]) {
            this.unlocked[moduleId] = { level: 0, unlockedAt: Date.now() };
        }
        this.unlocked[moduleId].level++;
        
        this.save();
        
        if (currentLevel === 0) {
            Cube.bigBounce();
            Cube.glow(0x00D4FF);
            UI.showFloatText(
                window.innerWidth / 2,
                window.innerHeight / 2,
                `解锁 ${def.name}!`,
                'levelup'
            );
        } else {
            Cube.bounce();
            Cube.glow(def.color.replace('#', '0x'));
            UI.showFloatText(
                window.innerWidth / 2,
                window.innerHeight / 2,
                `${def.name} Lv.${this.unlocked[moduleId].level}!`,
                'gold'
            );
        }
        
        this.renderModulePanel();
        UI.update();
        
        return true;
    },
    
    getAutoOutput() {
        let baseOutput = 0;
        let speedMult = 1;
        let voidMult = 1;
        
        for (const [id, data] of Object.entries(this.unlocked)) {
            if (data.level <= 0) continue;
            
            const def = this.definitions[id];
            const output = def.getOutput(data.level);
            
            switch (id) {
                case 'autoCollector':
                    baseOutput += output;
                    break;
                case 'timeWarp':
                    speedMult *= output;
                    break;
                case 'voidMirror':
                    voidMult *= output;
                    break;
            }
        }
        
        baseOutput *= speedMult;
        baseOutput *= voidMult;
        
        const pow = Game.stats.power;
        const powMult = Math.pow(2, pow.level) * (1 + pow.value / 100);
        baseOutput *= powMult;
        
        return baseOutput;
    },
    
    getCritParams() {
        const critCore = this.unlocked['critCore'];
        if (!critCore || critCore.level <= 0) {
            return { chance: 0, mult: 3 };
        }
        return this.definitions['critCore'].getOutput(critCore.level);
    },
    
    getQuantumFold() {
        const qf = this.unlocked['quantumFold'];
        if (!qf || qf.level <= 0) {
            return { chance: 0, mult: 1 };
        }
        return this.definitions['quantumFold'].getOutput(qf.level);
    },
    
    getTotalLevels() {
        return Object.values(this.unlocked).reduce((sum, data) => sum + data.level, 0);
    },
    
    save() {
        localStorage.setItem('cells_modules', JSON.stringify(this.unlocked));
    },
    
    renderModulePanel() {
        const panel = document.getElementById('modulePanel');
        if (!panel) return;
        
        panel.innerHTML = '';
        
        const title = document.createElement('div');
        title.className = 'module-title';
        title.textContent = '◈ 模块系统';
        panel.appendChild(title);
        
        for (const [id, def] of Object.entries(this.definitions)) {
            const level = this.getLevel(id);
            const isUnlocked = level > 0;
            const canUnlock = def.canUnlock();
            const cost = this.getCost(id);
            const canAfford = Game.tokens >= cost;
            const output = def.getOutput(level);
            
            // 格式化输出显示 - 简短格式
            let outputText = '';
            if (typeof output === 'number') {
                if (id === 'autoCollector') {
                    outputText = `+${output >= 100 ? output.toFixed(0) : output.toFixed(1)}/s`;
                } else if (id === 'timeWarp') {
                    outputText = `×${output.toFixed(2)}`;
                } else if (id === 'voidMirror') {
                    outputText = `×${output.toFixed(2)}`;
                }
            } else if (output.critChance !== undefined) {
                outputText = `${(output.critChance * 100).toFixed(0)}% / ×${output.critMult.toFixed(1)}`;
            } else if (output.chance !== undefined) {
                outputText = `${(output.chance * 100).toFixed(0)}% / ×${output.mult.toFixed(1)}`;
            }
            
            const card = document.createElement('div');
            card.className = `module-card ${isUnlocked ? 'unlocked' : ''} ${!canUnlock && !isUnlocked ? 'locked' : ''}`;
            card.dataset.module = id;
            card.onclick = () => this.upgrade(id);
            
            card.innerHTML = `
                <div class="module-icon" style="color: ${def.color}">${def.icon}</div>
                
                <div class="module-info">
                    <div class="module-name">${def.name}</div>
                    <div class="module-desc">${def.description}</div>
                    ${isUnlocked ? `
                        <div class="module-output" style="color: ${def.color}">
                            ${outputText}
                        </div>
                    ` : ''}
                </div>
                
                <div class="module-level">
                    ${isUnlocked ? `
                        <span class="level-num">Lv.${level}</span>
                        <span class="upgrade-cost ${canAfford ? 'can-buy' : 'cant-buy'}">
                            ▲ ${cost}
                        </span>
                    ` : canUnlock ? `
                        <span class="unlock-btn ${canAfford ? 'can-buy' : 'cant-buy'}">
                            解锁 ${cost}◆
                        </span>
                    ` : `
                        <span class="locked-text">未解锁</span>
                    `}
                </div>
            `;
            
            panel.appendChild(card);
        }
        
        const totalOutput = this.getAutoOutput();
        const totalDiv = document.createElement('div');
        totalDiv.className = 'module-total';
        totalDiv.innerHTML = `
            <span>总自动产出</span>
            <span style="color: #FFD700; font-weight: bold;">+${totalOutput.toFixed(1)}/s</span>
        `;
        panel.appendChild(totalDiv);
    }
};
