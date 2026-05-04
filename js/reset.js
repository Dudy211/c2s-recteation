const ResetSystem = {
    // 打开清空数据弹窗
    openResetModal() {
        // 关闭存档管理弹窗（如果打开）
        SaveSystem.closeSaveManager();
        
        let modal = document.getElementById('resetModal');
        if (modal) modal.remove();
        
        modal = document.createElement('div');
        modal.id = 'resetModal';
        modal.className = 'reset-modal';
        
        modal.innerHTML = `
            <div class="reset-modal-overlay" onclick="ResetSystem.closeResetModal()"></div>
            <div class="reset-modal-content">
                <div class="reset-modal-header">
                    <h2>⚠️ 清空数据</h2>
                    <button class="reset-modal-close" onclick="ResetSystem.closeResetModal()">✕</button>
                </div>
                
                <div class="reset-warning">
                    <p>此操作不可恢复！请选择要清空的内容：</p>
                </div>
                
                <div class="reset-options">
                    <div class="reset-option" data-type="stats">
                        <div class="reset-option-icon">📊</div>
                        <div class="reset-option-info">
                            <div class="reset-option-name">属性等级</div>
                            <div class="reset-option-desc">重置伤害、速度、强大为初始状态</div>
                            <div class="reset-option-detail">
                                保留代币: ${Math.floor(Game.tokens)}◆<br>
                                保留模块: ${Modules.getTotalLevels()}级
                            </div>
                        </div>
                        <button class="reset-btn warning" onclick="ResetSystem.confirmReset('stats')">
                            重置
                        </button>
                    </div>
                    
                    <div class="reset-option" data-type="modules">
                        <div class="reset-option-icon">◈</div>
                        <div class="reset-option-info">
                            <div class="reset-option-name">模块数据</div>
                            <div class="reset-option-desc">重置所有模块为未解锁状态</div>
                            <div class="reset-option-detail">
                                保留代币: ${Math.floor(Game.tokens)}◆<br>
                                保留属性: 伤害Lv.${Game.stats.damage.level} 速度Lv.${Game.stats.speed.level} 强大Lv.${Game.stats.power.level}
                            </div>
                        </div>
                        <button class="reset-btn warning" onclick="ResetSystem.confirmReset('modules')">
                            重置
                        </button>
                    </div>
                    
                    <div class="reset-option danger" data-type="all">
                        <div class="reset-option-icon">💥</div>
                        <div class="reset-option-info">
                            <div class="reset-option-name">全部清空</div>
                            <div class="reset-option-desc">重置所有数据，回到初始状态</div>
                            <div class="reset-option-detail" style="color: #FF6464;">
                                ⚠️ 代币、属性、模块全部清零！
                            </div>
                        </div>
                        <button class="reset-btn danger" onclick="ResetSystem.confirmReset('all')">
                            全部重置
                        </button>
                    </div>
                </div>
                
                <div class="reset-footer">
                    <button class="reset-btn cancel" onclick="ResetSystem.closeResetModal()">
                        取消
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    },
    
    // 确认重置
    confirmReset(type) {
        const typeNames = {
            stats: '属性等级',
            modules: '模块数据',
            all: '全部数据'
        };
        
        if (!confirm(`确定要清空${typeNames[type]}吗？\n此操作不可恢复！`)) {
            return;
        }
        
        // 二次确认（全部清空时）
        if (type === 'all') {
            if (!confirm('⚠️ 最后确认：这将删除所有游戏进度！\n确定要继续吗？')) {
                return;
            }
        }
        
        this.executeReset(type);
    },
    
    // 执行重置
    executeReset(type) {
        switch(type) {
            case 'stats':
                this.resetStats();
                break;
            case 'modules':
                this.resetModules();
                break;
            case 'all':
                this.resetAll();
                break;
        }
        
        // 刷新UI
        UI.update();
        Modules.renderModulePanel();
        
        // 关闭弹窗
        this.closeResetModal();
        
        // 显示确认
        const typeNames = {
            stats: '属性等级',
            modules: '模块数据',
            all: '全部数据'
        };
        
        UI.showFloatText(
            window.innerWidth / 2,
            window.innerHeight / 2,
            `${typeNames[type]}已清空!`,
            'system'
        );
        
        // 保存当前状态
        SaveSystem.autoSave();
    },
    
    // 重置属性
    resetStats() {
        Game.stats = {
            damage: { 
                value: 0, 
                level: 0, 
                cost: 15,
                baseCost: 15,
                costMult: 1.45,
                levelCostMult: 4
            },
            speed: { 
                value: 0, 
                level: 0, 
                cost: 25,
                baseCost: 25,
                costMult: 1.55,
                levelCostMult: 5
            },
            power: { 
                value: 0, 
                level: 0, 
                cost: 50,
                baseCost: 50,
                costMult: 1.65,
                levelCostMult: 6
            }
        };
        
        // 清除localStorage中的属性相关（保留模块和代币）
        localStorage.removeItem('cells_stats');
    },
    
    // 重置模块
    resetModules() {
        Modules.unlocked = {};
        Modules.save();
        
        // 重新初始化模块面板
        if (Modules.panelOpen) {
            Modules.closePanel();
        }
    },
    
    // 重置全部
    resetAll() {
        // 代币清零
        Game.tokens = 0;
        
        // 重置属性
        this.resetStats();
        
        // 重置模块
        this.resetModules();
        
        // 清除所有localStorage
        localStorage.removeItem('cells_modules');
        localStorage.removeItem('cells_auto_save');
        localStorage.removeItem('cells_total_clicks');
        localStorage.removeItem('cells_play_time');
        
        // 清除手动存档
        for (let i = 0; i < 5; i++) {
            localStorage.removeItem('cells_manual_' + i);
        }
    },
    
    // 关闭弹窗
    closeResetModal() {
        const modal = document.getElementById('resetModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    },
    
    // 在存档管理弹窗中添加清空数据按钮
    injectResetButton() {
        // 等待存档管理弹窗打开后注入
        const observer = new MutationObserver((mutations) => {
            const modal = document.getElementById('saveManagerModal');
            if (modal && !modal.querySelector('.reset-data-btn')) {
                const footer = modal.querySelector('.save-modal-content');
                if (footer) {
                    const resetSection = document.createElement('div');
                    resetSection.className = 'save-section reset-section';
                    resetSection.innerHTML = `
                        <h3>危险操作</h3>
                        <button class="save-btn reset-data-btn" onclick="ResetSystem.openResetModal(); SaveSystem.closeSaveManager();">
                            <span>🗑️</span> 清空数据
                        </button>
                    `;
                    footer.appendChild(resetSection);
                }
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
};

// 初始化注入
ResetSystem.injectResetButton();
