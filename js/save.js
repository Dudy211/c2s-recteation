const SaveSystem = {
    AUTO_SAVE_KEY: 'cells_auto_save',
    MANUAL_SAVE_PREFIX: 'cells_manual_',
    MAX_MANUAL_SLOTS: 5,
    autoSaveInterval: 30000,
    SAVE_VERSION: '0.3.0',
    
    isAPK: () => {
        return window.AndroidBridge || 
               /wv|WebView/.test(navigator.userAgent) ||
               (window.location.protocol === 'file:' && /android/i.test(navigator.userAgent));
    },
    
    init() {
        this.startAutoSave();
        this.renderSaveManager();
    },
    
    getGameData() {
        return {
            version: this.SAVE_VERSION,
            timestamp: Date.now(),
            date: new Date().toLocaleString('zh-CN'),
            tokens: Game.tokens,
            stats: Game.stats,
            modules: Modules.unlocked,
            combo: Game.combo,
            totalClicks: this.getTotalClicks(),
            playTime: this.getPlayTime()
        };
    },
    
    loadGameData(data) {
        if (!data || data.version !== this.SAVE_VERSION) {
            console.warn('存档版本不匹配或数据损坏');
            return false;
        }
        
        Game.tokens = data.tokens || 0;
        
        if (data.stats) {
            Object.keys(data.stats).forEach(key => {
                if (Game.stats[key]) {
                    Game.stats[key] = { ...Game.stats[key], ...data.stats[key] };
                }
            });
        }
        
        if (data.modules) {
            Modules.unlocked = data.modules;
            Modules.save();
        }
        
        UI.update();
        Modules.renderModulePanel();
        
        return true;
    },
    
    autoSave() {
        const data = this.getGameData();
        localStorage.setItem(this.AUTO_SAVE_KEY, JSON.stringify(data));
    },
    
    startAutoSave() {
        this.autoSave();
        setInterval(() => this.autoSave(), this.autoSaveInterval);
        window.addEventListener('beforeunload', () => this.autoSave());
    },
    
    manualSave(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.MAX_MANUAL_SLOTS) return false;
        
        const data = this.getGameData();
        const key = this.MANUAL_SAVE_PREFIX + slotIndex;
        localStorage.setItem(key, JSON.stringify(data));
        
        this.updateSlotDisplay(slotIndex, data);
        
        UI.showFloatText(
            window.innerWidth / 2,
            window.innerHeight / 2,
            `存档 ${slotIndex + 1} 已保存!`,
            'levelup'
        );
        
        return true;
    },
    
    manualLoad(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.MAX_MANUAL_SLOTS) return false;
        
        const key = this.MANUAL_SAVE_PREFIX + slotIndex;
        const saved = localStorage.getItem(key);
        
        if (!saved) {
            UI.showFloatText(
                window.innerWidth / 2,
                window.innerHeight / 2,
                `存档 ${slotIndex + 1} 为空!`,
                'system'
            );
            return false;
        }
        
        const data = JSON.parse(saved);
        if (this.loadGameData(data)) {
            UI.showFloatText(
                window.innerWidth / 2,
                window.innerHeight / 2,
                `读取存档 ${slotIndex + 1} 成功!`,
                'levelup'
            );
            return true;
        }
        
        return false;
    },
    
    deleteSave(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.MAX_MANUAL_SLOTS) return false;
        
        const key = this.MANUAL_SAVE_PREFIX + slotIndex;
        localStorage.removeItem(key);
        
        this.updateSlotDisplay(slotIndex, null);
        
        UI.showFloatText(
            window.innerWidth / 2,
            window.innerHeight / 2,
            `存档 ${slotIndex + 1} 已删除!`,
            'system'
        );
        
        return true;
    },
    
    exportSave(slotIndex) {
        if (this.isAPK()) {
            UI.showFloatText(
                window.innerWidth / 2,
                window.innerHeight / 2,
                'APK环境下无法导出文件!',
                'system'
            );
            return;
        }
        
        let data;
        
        if (slotIndex === -1) {
            data = this.getGameData();
        } else {
            const key = this.MANUAL_SAVE_PREFIX + slotIndex;
            const saved = localStorage.getItem(key);
            if (!saved) {
                UI.showFloatText(
                    window.innerWidth / 2,
                    window.innerHeight / 2,
                    `存档 ${slotIndex + 1} 为空!`,
                    'system'
                );
                return;
            }
            data = JSON.parse(saved);
        }
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cells_save_${data.date.replace(/[/:]/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        UI.showFloatText(
            window.innerWidth / 2,
            window.innerHeight / 2,
            '存档已导出!',
            'levelup'
        );
    },
    
    importSave(file, targetSlot = -1) {
        if (this.isAPK()) {
            UI.showFloatText(
                window.innerWidth / 2,
                window.innerHeight / 2,
                'APK环境下无法导入文件!',
                'system'
            );
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.version || data.tokens === undefined) {
                    throw new Error('无效的存档文件');
                }
                
                if (targetSlot >= 0) {
                    const key = this.MANUAL_SAVE_PREFIX + targetSlot;
                    localStorage.setItem(key, JSON.stringify(data));
                    this.updateSlotDisplay(targetSlot, data);
                    
                    UI.showFloatText(
                        window.innerWidth / 2,
                        window.innerHeight / 2,
                        `导入到存档 ${targetSlot + 1} 成功!`,
                        'levelup'
                    );
                } else {
                    if (this.loadGameData(data)) {
                        UI.showFloatText(
                            window.innerWidth / 2,
                            window.innerHeight / 2,
                            '存档加载成功!',
                            'levelup'
                        );
                    }
                }
            } catch (err) {
                UI.showFloatText(
                    window.innerWidth / 2,
                    window.innerHeight / 2,
                    '存档文件损坏!',
                    'system'
                );
            }
        };
        
        reader.readAsText(file);
    },
    
    getSlotInfo(slotIndex) {
        const key = this.MANUAL_SAVE_PREFIX + slotIndex;
        const saved = localStorage.getItem(key);
        
        if (!saved) return null;
        
        try {
            const data = JSON.parse(saved);
            return {
                date: data.date,
                tokens: data.tokens,
                level: this.getTotalLevel(data)
            };
        } catch {
            return null;
        }
    },
    
    getTotalLevel(data) {
        let level = 0;
        if (data.stats) {
            Object.values(data.stats).forEach(s => level += s.level);
        }
        if (data.modules) {
            Object.values(data.modules).forEach(m => level += m.level);
        }
        return level;
    },
    
    getTotalClicks() {
        return parseInt(localStorage.getItem('cells_total_clicks') || '0');
    },
    
    getPlayTime() {
        return parseInt(localStorage.getItem('cells_play_time') || '0');
    },
    
    // 修复：正确在侧边菜单中创建存档区域
    renderSaveManager() {
        // 避免重复创建
        if (document.getElementById('saveManagerBtn')) return;
        
        // 获取侧边菜单
        const sideMenu = document.getElementById('sideMenu');
        if (!sideMenu) {
            console.error('sideMenu not found');
            return;
        }
        
        // 在版本信息之前插入存档区域
        const versionInfo = sideMenu.querySelector('.version-info');
        
        // 创建新的菜单区域
        const saveSection = document.createElement('div');
        saveSection.className = 'menu-section';
        saveSection.innerHTML = `
            <div class="menu-title">存档</div>
            <button id="saveManagerBtn" class="link-btn">
                <span>💾</span> 存档管理
            </button>
        `;
        
        // 绑定点击事件
        const btn = saveSection.querySelector('#saveManagerBtn');
        btn.onclick = () => this.openSaveManager();
        
        // 插入到版本信息之前，或追加到菜单末尾
        if (versionInfo) {
            sideMenu.insertBefore(saveSection, versionInfo);
        } else {
            sideMenu.appendChild(saveSection);
        }
    },
    
    openSaveManager() {
        if (Menu.open) Menu.toggle();
        
        let modal = document.getElementById('saveManagerModal');
        if (modal) {
            modal.remove();
        }
        
        const isAPK = this.isAPK();
        
        modal = document.createElement('div');
        modal.id = 'saveManagerModal';
        modal.className = 'save-modal';
        
        modal.innerHTML = `
            <div class="save-modal-overlay" onclick="SaveSystem.closeSaveManager()"></div>
            <div class="save-modal-content">
                <div class="save-modal-header">
                    <h2>💾 存档管理</h2>
                    <button class="save-modal-close" onclick="SaveSystem.closeSaveManager()">✕</button>
                </div>
                
                <div class="save-section">
                    <h3>自动存档</h3>
                    <div class="save-slot auto-save" onclick="SaveSystem.loadAutoSave()">
                        <div class="slot-icon">🔄</div>
                        <div class="slot-info">
                            <div class="slot-name">自动存档</div>
                            <div class="slot-desc">每30秒自动保存</div>
                        </div>
                        <div class="slot-action">读取</div>
                    </div>
                </div>
                
                <div class="save-section">
                    <h3>手动存档槽位</h3>
                    <div class="save-slots-grid">
                        ${this.renderManualSlots()}
                    </div>
                </div>
                
                ${!isAPK ? `
                <div class="save-section">
                    <h3>导入/导出</h3>
                    <div class="save-import-export">
                        <button class="save-btn export-current" onclick="SaveSystem.exportSave(-1)">
                            📤 导出当前游戏
                        </button>
                        <label class="save-btn import-btn">
                            📥 导入存档
                            <input type="file" accept=".json" style="display:none" 
                                   onchange="SaveSystem.handleFileSelect(this)">
                        </label>
                    </div>
                </div>
                ` : `
                <div class="save-section apk-notice">
                    <p>📱 APK模式下仅支持本地存档</p>
                    <p>存档会自动保存在设备本地</p>
                </div>
                `}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    },
    
    renderManualSlots() {
        let html = '';
        
        for (let i = 0; i < this.MAX_MANUAL_SLOTS; i++) {
            const info = this.getSlotInfo(i);
            
            if (info) {
                html += `
                    <div class="save-slot has-data" data-slot="${i}">
                        <div class="slot-icon">💾</div>
                        <div class="slot-info">
                            <div class="slot-name">存档 ${i + 1}</div>
                            <div class="slot-desc">${info.date}</div>
                            <div class="slot-stats">◆${info.tokens} | 等级${info.level}</div>
                        </div>
                        <div class="slot-actions">
                            <button class="slot-btn load" onclick="event.stopPropagation(); SaveSystem.manualLoad(${i})">读取</button>
                            <button class="slot-btn save" onclick="event.stopPropagation(); SaveSystem.manualSave(${i})">覆盖</button>
                            ${!this.isAPK() ? `<button class="slot-btn export" onclick="event.stopPropagation(); SaveSystem.exportSave(${i})">导出</button>` : ''}
                            <button class="slot-btn delete" onclick="event.stopPropagation(); SaveSystem.confirmDelete(${i})">删除</button>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="save-slot empty" onclick="SaveSystem.manualSave(${i})">
                        <div class="slot-icon">➕</div>
                        <div class="slot-info">
                            <div class="slot-name">存档 ${i + 1}</div>
                            <div class="slot-desc">空槽位 - 点击保存</div>
                        </div>
                    </div>
                `;
            }
        }
        
        return html;
    },
    
    updateSlotDisplay(slotIndex, data) {
        const modal = document.getElementById('saveManagerModal');
        if (!modal) return;
        
        const grid = modal.querySelector('.save-slots-grid');
        if (!grid) return;
        
        grid.innerHTML = this.renderManualSlots();
    },
    
    loadAutoSave() {
        const saved = localStorage.getItem(this.AUTO_SAVE_KEY);
        if (!saved) {
            UI.showFloatText(
                window.innerWidth / 2,
                window.innerHeight / 2,
                '没有自动存档!',
                'system'
            );
            return;
        }
        
        const data = JSON.parse(saved);
        if (this.loadGameData(data)) {
            UI.showFloatText(
                window.innerWidth / 2,
                window.innerHeight / 2,
                '自动存档读取成功!',
                'levelup'
            );
            this.closeSaveManager();
        }
    },
    
    confirmDelete(slotIndex) {
        if (confirm(`确定要删除存档 ${slotIndex + 1} 吗？此操作不可恢复！`)) {
            this.deleteSave(slotIndex);
            this.updateSlotDisplay(slotIndex, null);
        }
    },
    
    handleFileSelect(input) {
        const file = input.files[0];
        if (!file) return;
        
        const modal = document.getElementById('saveManagerModal');
        const content = modal.querySelector('.save-modal-content');
        
        const importMenu = document.createElement('div');
        importMenu.className = 'import-menu';
        importMenu.innerHTML = `
            <div class="import-menu-overlay"></div>
            <div class="import-menu-content">
                <h3>选择导入方式</h3>
                <button class="import-option" onclick="SaveSystem.importToGame()">
                    📥 直接加载到游戏
                </button>
                <div class="import-slots">
                    <p>或导入到槽位:</p>
                    ${Array.from({length: 5}, (_, i) => `
                        <button class="import-slot-btn" onclick="SaveSystem.importToSlot(${i})">
                            槽位 ${i + 1}
                        </button>
                    `).join('')}
                </div>
                <button class="import-cancel" onclick="this.closest('.import-menu').remove()">取消</button>
            </div>
        `;
        
        content.appendChild(importMenu);
        
        this.pendingFile = file;
        input.value = '';
    },
    
    importToGame() {
        if (this.pendingFile) {
            this.importSave(this.pendingFile, -1);
            this.pendingFile = null;
            document.querySelector('.import-menu')?.remove();
        }
    },
    
    importToSlot(slotIndex) {
        if (this.pendingFile) {
            this.importSave(this.pendingFile, slotIndex);
            this.pendingFile = null;
            document.querySelector('.import-menu')?.remove();
        }
    },
    
    closeSaveManager() {
        const modal = document.getElementById('saveManagerModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    }
};