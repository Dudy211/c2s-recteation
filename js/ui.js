const UI = {
    init() {
        this.update();
        this.initInfoPopup();
    },
    
    infoData: {
        damage: {
            title: '伤害 (Damage)',
            content: '提升每次<span class="highlight">点击</span>获得的基础代币数量。<br><br>每升1级，点击收益<span class="highlight">×2倍</span>。<br>升级进度满100后等级提升。'
        },
        speed: {
            title: '速度 (Speed)',
            content: '提升<span class="highlight">自动产出</span>频率和<span class="highlight">暴击</span>概率。<br><br>每升1级，自动收集速度<span class="highlight">×2倍</span>。<br>同时增加暴击率，最高可达50%。'
        },
        power: {
            title: '强大 (Power)',
            content: '提升<span class="highlight">所有</span>代币获取方式的倍率。<br><br>每升1级，全局收益<span class="highlight">×2倍</span>。<br>同时影响点击和自动产出。'
        }
    },
    
    popupActive: false,
    popupTimer: null,
    currentInfo: null,
    
    initInfoPopup() {
        const popup = document.getElementById('infoPopup');
        const infoBtns = document.querySelectorAll('.info-btn');
        
        const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
        
        infoBtns.forEach(btn => {
            const statName = btn.dataset.info;
            
            if (isTouchDevice) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.currentInfo === statName && this.popupActive) {
                        this.hideInfoPopup();
                    } else {
                        this.showInfoPopup(statName, e.currentTarget);
                    }
                });
            } else {
                btn.addEventListener('mouseenter', (e) => {
                    if (!Input.isDragging) {
                        this.showInfoPopup(statName, e.currentTarget);
                    }
                });
                
                btn.addEventListener('mouseleave', () => {
                    this.hideInfoPopup();
                });
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.info-popup') && !e.target.closest('.info-btn')) {
                this.hideInfoPopup();
            }
        });
        
        popup.addEventListener('mouseenter', () => {
            clearTimeout(this.popupTimer);
        });
        
        popup.addEventListener('mouseleave', () => {
            this.hideInfoPopup();
        });
    },
    
    showInfoPopup(statName, targetBtn) {
        clearTimeout(this.popupTimer);
        
        const popup = document.getElementById('infoPopup');
        const title = document.getElementById('infoTitle');
        const content = document.getElementById('infoContent');
        const data = this.infoData[statName];
        
        if (!data) return;
        
        title.textContent = data.title;
        content.innerHTML = data.content;
        this.currentInfo = statName;
        this.popupActive = true;
        
        const rect = targetBtn.getBoundingClientRect();
        const popupWidth = 250;
        
        let left = rect.left - 10;
        let top = rect.bottom + 12;
        
        if (left + popupWidth > window.innerWidth - 20) {
            left = window.innerWidth - popupWidth - 20;
        }
        
        if (top + 150 > window.innerHeight) {
            top = rect.top - 160;
            popup.style.transformOrigin = 'bottom left';
        } else {
            popup.style.transformOrigin = 'top left';
        }
        
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
        
        requestAnimationFrame(() => {
            popup.classList.add('show');
        });
    },
    
    hideInfoPopup() {
        this.popupTimer = setTimeout(() => {
            const popup = document.getElementById('infoPopup');
            popup.classList.remove('show');
            this.popupActive = false;
            this.currentInfo = null;
        }, 150);
    },
    
    // ========== 实时产量显示（基于实际数据）==========
    update() {
        document.getElementById('tokenAmount').textContent = Math.floor(Game.tokens);
        
        // 获取实际最近产量
        const actual = Game.getActualRate();
        const rate = actual.perSecond;
        
        // 格式化显示
        let rateText;
        if (rate <= 0) {
            rateText = '点击方块开始收集';
        } else if (rate < 10) {
            rateText = `+${rate.toFixed(1)}/s`;
        } else if (rate < 1000) {
            rateText = `+${rate.toFixed(0)}/s`;
        } else if (rate < 1000000) {
            rateText = `+${(rate / 1000).toFixed(1)}K/s`;
        } else {
            rateText = `+${(rate / 1000000).toFixed(2)}M/s`;
        }
        
        document.getElementById('tokenRate').textContent = rateText;
        
        // 属性条更新
        ['damage', 'speed', 'power'].forEach(name => {
            const stat = Game.stats[name];
            
            document.getElementById('bar-' + name).style.width = stat.value + '%';
            
            const costEl = document.getElementById('cost-' + name);
            const btn = document.getElementById('btn-' + name);
            
            if (stat.level >= 10) {
                costEl.textContent = 'MAX';
                btn.classList.add('maxed');
                btn.disabled = true;
            } else {
                costEl.textContent = stat.cost;
                btn.classList.remove('maxed');
                btn.disabled = false;
            }
            
            document.getElementById('level-' + name).textContent = 'Lv.' + stat.level;
            
            if (stat.level < 10) {
                btn.style.opacity = Game.tokens >= stat.cost ? '1' : '0.4';
            }
        });
    },
    
    showFloatText(x, y, text, type) {
        const container = document.getElementById('floatTexts');
        const el = document.createElement('div');
        el.className = 'float-text ' + type;
        el.textContent = text;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.transform = 'translateX(-50%)';
        container.appendChild(el);
        setTimeout(() => el.remove(), 1200);
    }
};

const Menu = {
    open: false,
    
    toggle() {
        this.open = !this.open;
        document.getElementById('menuToggle').classList.toggle('active', this.open);
        document.getElementById('sideMenu').classList.toggle('open', this.open);
        document.getElementById('menuOverlay').classList.toggle('show', this.open);
    }
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && Menu.open) {
        Menu.toggle();
    }
});

document.getElementById('sideMenu').addEventListener('click', (e) => {
    e.stopPropagation();
});
