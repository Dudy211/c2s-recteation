const Game = {
    tokens: 0,
    productionHistory: [],
    PRODUCTION_WINDOW: 5000,
    stats: {
        damage: { value: 0, level: 0, cost: 15, baseCost: 15, costMult: 1.45, levelCostMult: 4 },
        speed: { value: 0, level: 0, cost: 25, baseCost: 25, costMult: 1.55, levelCostMult: 5 },
        power: { value: 0, level: 0, cost: 50, baseCost: 50, costMult: 1.65, levelCostMult: 6 }
    },
    lastAutoTime: 0,
    autoInterval: 1000,
    combo: 0,
    comboTimer: null,
    lastClickTime: 0,

    recordProduction(amount) {
        if (amount <= 0) return;
        const now = Date.now();
        this.productionHistory.push({ time: now, amount });
        this.tokens += amount;
        this.cleanHistory();
    },
    cleanHistory() {
        const now = Date.now();
        const cutoff = now - this.PRODUCTION_WINDOW;
        let cutoffIndex = 0;
        for (let i = 0; i < this.productionHistory.length; i++) {
            if (this.productionHistory[i].time >= cutoff) { cutoffIndex = i; break; }
        }
        if (cutoffIndex > 0) this.productionHistory = this.productionHistory.slice(cutoffIndex);
    },
    getActualRate() {
        this.cleanHistory();
        const now = Date.now();
        if (this.productionHistory.length === 0) return { perSecond: 0, totalInWindow: 0, windowDuration: 0 };
        const totalInWindow = this.productionHistory.reduce((sum, h) => sum + h.amount, 0);
        const earliest = this.productionHistory[0].time;
        const windowDuration = Math.min(this.PRODUCTION_WINDOW, now - earliest);
        const effectiveDuration = Math.max(windowDuration, 100);
        const perSecond = (totalInWindow / effectiveDuration) * 1000;
        return { perSecond, totalInWindow, windowDuration: effectiveDuration };
    },

    onCubeClick() {
        const now = Date.now();
        if (now - this.lastClickTime < 300) this.combo = Math.min(this.combo + 1, 10);
        else this.combo = 0;
        this.lastClickTime = now;
        Cube.bounce();
        const dmg = this.stats.damage;
        const pow = this.stats.power;
        const dmgLevelMult = Math.pow(2, dmg.level);
        const powLevelMult = Math.pow(2, pow.level);
        const powValueMult = 1 + pow.value / 100;
        let amount = Math.max(1, Math.floor((1 + dmg.value / 20) * dmgLevelMult * powLevelMult * powValueMult));
        const comboMult = 1 + this.combo * 0.1;
        amount = Math.floor(amount * comboMult);

        // ===== 暴击计算修复 =====
        const critParams = Modules.getCritParams();
        const baseCritChance = Math.min(0.35, this.stats.speed.value / 300 + this.stats.speed.level * 0.03);
        const moduleCritChance = critParams.critChance || 0;
        const finalCritChance = Math.min(0.75, baseCritChance + moduleCritChance * (1 - baseCritChance * 0.5));
        const critMult = critParams.critMult || 3;

        // ===== 引擎效果加成 =====
        let engineEffects = { globalMult: 1, clickMult: 1, critChance: 0, critMult: 1 };
        if (typeof EngineSystem !== 'undefined' && EngineSystem.getEngineEffects) {
            engineEffects = EngineSystem.getEngineEffects();
        }

        // 引擎暴击叠加
        const engineCritChance = engineEffects.critChance || 0;
        const totalCritChance = Math.min(0.85, finalCritChance + engineCritChance);
        const engineCritMult = engineEffects.critMult || 1;
        const totalCritMult = critMult * engineCritMult;

        const isCrit = Math.random() < totalCritChance;
        if (isCrit) amount = Math.floor(amount * totalCritMult);

        // 量子折叠
        const qf = Modules.getQuantumFold();
        if (Math.random() < qf.chance) {
            amount = Math.floor(amount * qf.mult);
            UI.showFloatText(window.innerWidth / 2, window.innerHeight / 2 - 80, `量子折叠! ×${qf.mult.toFixed(1)}`, 'levelup');
        }

        // 应用引擎点击倍率和全局倍率
        amount = Math.floor(amount * (engineEffects.clickMult || 1) * (engineEffects.globalMult || 1));

        this.recordProduction(amount);
        let text = '+' + amount;
        if (this.combo >= 3) text += ' x' + (this.combo + 1);
        if (isCrit) text = '暴击! ' + text;
        UI.showFloatText(
            window.innerWidth / 2 + (Math.random() - 0.5) * 80,
            window.innerHeight / 2 - 40,
            text,
            isCrit ? 'crit' : (this.combo >= 3 ? 'levelup' : 'gold')
        );
        Cube.glow(isCrit ? 0xFF4444 : 0xFFD700);
        clearTimeout(this.comboTimer);
        this.comboTimer = setTimeout(() => this.combo = 0, 400);
        if (typeof Recorder !== 'undefined') Recorder.record('clicks');
        // 修复：保存总点击次数到 localStorage，用于 APK 环境下引擎初始化完成后补偿挑战进度
        try {
            const totalClicks = parseInt(localStorage.getItem('cells_total_clicks') || '0') + 1;
            localStorage.setItem('cells_total_clicks', totalClicks);
        } catch (e) {}
    },

    upgrade(statName) {
        const stat = this.stats[statName];
        if (this.tokens < stat.cost || stat.level >= 10) {
            if (this.tokens < stat.cost) UI.showFloatText(window.innerWidth / 2, window.innerHeight / 2, '代币不足!', 'system');
            return;
        }
        this.tokens -= stat.cost;
        stat.value += 20;
        if (stat.value >= 100) {
            stat.value = 0;
            stat.level++;
            stat.cost = Math.floor(stat.baseCost * Math.pow(stat.levelCostMult, stat.level));
            this.onLevelUp(statName);
        } else {
            stat.cost = Math.floor(stat.cost * stat.costMult);
        }
        if (typeof Recorder !== 'undefined') Recorder.recordState('statLevel', stat.level);
        UI.update();
        Modules.renderModulePanel();
    },

    onLevelUp(statName) {
        Cube.bigBounce();
        Cube.glow(0xE8B4FF);
        const flash = document.getElementById('levelupFlash');
        flash.classList.remove('active');
        void flash.offsetWidth;
        flash.classList.add('active');
        const names = { damage: '伤害', speed: '速度', power: '强大' };
        const level = this.stats[statName].level;
        UI.showFloatText(window.innerWidth / 2, window.innerHeight / 2, `${names[statName]} Lv.${level}! ×${Math.pow(2, level)}`, 'levelup');
    },

    updateAuto() {
        const now = Date.now();
        let autoOutput = Modules.getAutoOutput();

        // ===== 引擎自动产出加成 =====
        let engineEffects = { globalMult: 1, autoMult: 1, speedMult: 1, voidMult: 1 };
        if (typeof EngineSystem !== 'undefined' && EngineSystem.getEngineEffects) {
            engineEffects = EngineSystem.getEngineEffects();
        }

        // 应用引擎倍率
        autoOutput = autoOutput * (engineEffects.autoMult || 1) * (engineEffects.globalMult || 1) * (engineEffects.voidMult || 1);

        // 速度倍率影响自动产出间隔（速度越快，间隔越短）
        const speedMult = engineEffects.speedMult || 1;
        const effectiveInterval = this.autoInterval / Math.max(0.2, speedMult);

        if (autoOutput > 0 && now - this.lastAutoTime >= effectiveInterval) {
            this.lastAutoTime = now;
            this.recordProduction(autoOutput);
            if (typeof Recorder !== 'undefined') Recorder.record('tokens', autoOutput);
        }
    },

    getRates() {
        const dmg = this.stats.damage;
        const spd = this.stats.speed;
        const pow = this.stats.power;
        const powLevelMult = Math.pow(2, pow.level);
        const powValueMult = 1 + pow.value / 100;
        const clickAmount = Math.max(1, Math.floor((1 + dmg.value / 20) * Math.pow(2, dmg.level) * powLevelMult * powValueMult));
        const autoPerSecond = Modules.getAutoOutput();
        const assumedClicksPerSecond = 3;
        const critParams = Modules.getCritParams();
        const baseCritChance = Math.min(0.35, spd.value / 300 + spd.level * 0.03);
        const moduleCritChance = critParams.critChance || 0;
        const finalCritChance = Math.min(0.75, baseCritChance + moduleCritChance * (1 - baseCritChance * 0.5));
        const critMult = critParams.critMult || 3;
        const critExpectedMult = (1 - finalCritChance) * 1 + finalCritChance * critMult;
        const qf = Modules.getQuantumFold();
        const quantumExpectedMult = (1 - qf.chance) * 1 + qf.chance * qf.mult;
        const clickEquivalentPerSecond = clickAmount * assumedClicksPerSecond * critExpectedMult * quantumExpectedMult;
        const totalPerSecond = autoPerSecond + clickEquivalentPerSecond;

        // ===== 引擎理论倍率 =====
        let engineEffects = { globalMult: 1, clickMult: 1, autoMult: 1, speedMult: 1, voidMult: 1 };
        if (typeof EngineSystem !== 'undefined' && EngineSystem.getEngineEffects) {
            engineEffects = EngineSystem.getEngineEffects();
        }

        const engineClickMult = (engineEffects.clickMult || 1) * (engineEffects.globalMult || 1);
        const engineAutoMult = (engineEffects.autoMult || 1) * (engineEffects.globalMult || 1) * (engineEffects.voidMult || 1);
        const engineSpeedMult = engineEffects.speedMult || 1;

        return {
            click: clickAmount,
            auto: autoPerSecond * engineAutoMult * engineSpeedMult,
            clickEquivalent: clickEquivalentPerSecond * engineClickMult,
            total: totalPerSecond * engineClickMult * engineAutoMult * engineSpeedMult
        };
    }
};
