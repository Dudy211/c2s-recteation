const Game = {
    tokens: 0,
    
    stats: {
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
    },
    
    lastAutoTime: 0,
    autoInterval: 1000,
    
    combo: 0,
    comboTimer: null,
    lastClickTime: 0,
    
    onCubeClick() {
        const now = Date.now();
        
        if (now - this.lastClickTime < 300) {
            this.combo = Math.min(this.combo + 1, 10);
        } else {
            this.combo = 0;
        }
        this.lastClickTime = now;
        
        Cube.bounce();
        
        const dmg = this.stats.damage;
        const pow = this.stats.power;
        
        const dmgLevelMult = Math.pow(2, dmg.level);
        const powLevelMult = Math.pow(2, pow.level);
        const powValueMult = 1 + pow.value / 100;
        
        let amount = Math.max(1, Math.floor(
            (1 + dmg.value / 20) * dmgLevelMult * powLevelMult * powValueMult
        ));
        
        const comboMult = 1 + this.combo * 0.1;
        amount = Math.floor(amount * comboMult);
        
        const critParams = Modules.getCritParams();
        const baseCritChance = Math.min(0.5, this.stats.speed.value / 150 + this.stats.speed.level * 0.05);
        const finalCritChance = Math.max(baseCritChance, critParams.chance);
        
        const isCrit = Math.random() < finalCritChance;
        if (isCrit) amount *= critParams.mult;
        
        const qf = Modules.getQuantumFold();
        if (Math.random() < qf.chance) {
            amount = Math.floor(amount * qf.mult);
            UI.showFloatText(
                window.innerWidth / 2,
                window.innerHeight / 2 - 80,
                `量子折叠! ×${qf.mult.toFixed(1)}`,
                'levelup'
            );
        }
        
        this.tokens += amount;
        
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
    },
    
    upgrade(statName) {
        const stat = this.stats[statName];
        if (this.tokens < stat.cost || stat.level >= 10) {
            if (this.tokens < stat.cost) {
                UI.showFloatText(window.innerWidth / 2, window.innerHeight / 2, '代币不足!', 'system');
            }
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
        UI.showFloatText(
            window.innerWidth / 2,
            window.innerHeight / 2,
            `${names[statName]} Lv.${level}! ×${Math.pow(2, level)}`,
            'levelup'
        );
    },
    
    updateAuto() {
        const now = Date.now();
        
        const autoOutput = Modules.getAutoOutput();
        
        if (autoOutput > 0 && now - this.lastAutoTime >= this.autoInterval) {
            this.lastAutoTime = now;
            this.tokens += autoOutput;
        }
    },
    
    getRates() {
        const dmg = this.stats.damage;
        const spd = this.stats.speed;
        const pow = this.stats.power;
        
        const powLevelMult = Math.pow(2, pow.level);
        const powValueMult = 1 + pow.value / 100;
        
        const clickAmount = Math.max(1, Math.floor(
            (1 + dmg.value / 20) * Math.pow(2, dmg.level) * powLevelMult * powValueMult
        ));
        
        const autoPerSecond = Modules.getAutoOutput();
        
        const assumedClicksPerSecond = 3;
        
        const critParams = Modules.getCritParams();
        const baseCritChance = Math.min(0.5, spd.value / 150 + spd.level * 0.05);
        const finalCritChance = Math.max(baseCritChance, critParams.chance);
        const critExpectedMult = (1 - finalCritChance) * 1 + finalCritChance * critParams.mult;
        
        const qf = Modules.getQuantumFold();
        const quantumExpectedMult = (1 - qf.chance) * 1 + qf.chance * qf.mult;
        
        const clickEquivalentPerSecond = clickAmount * assumedClicksPerSecond * critExpectedMult * quantumExpectedMult;
        
        const totalPerSecond = autoPerSecond + clickEquivalentPerSecond;
        
        return { 
            click: clickAmount,
            auto: autoPerSecond,
            clickEquivalent: clickEquivalentPerSecond,
            total: totalPerSecond
        };
    }
};
