const FPS = {
    container: null,
    fpsText: null,
    msText: null,
    calcText: null,
    gpuText: null,
    frames: 0,
    prevTime: performance.now(),
    lastFrameTime: performance.now(),
    lastRafTime: 0,
    
    calcHistory: [],
    CALC_WINDOW: 10,
    
    gpuHistory: [],
    GPU_WINDOW: 10,
    
    collapsed: true,  // 默认折叠，只显示 FPS 数字
    
    init() {
        // 主容器 - 左下角悬浮
        this.container = document.createElement('div');
        this.container.id = 'fpsDisplay';
        this.container.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 16px;
            z-index: 1000;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(232, 180, 255, 0.2);
            border-radius: 20px;
            padding: 8px 14px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.7em;
            color: #E8B4FF;
            user-select: none;
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 80px;
            transition: all 0.3s ease;
            cursor: pointer;
        `;
        
        this.container.addEventListener('click', () => this.toggleCollapse());
        
        // 折叠状态：只显示 FPS
        this.fpsOnly = document.createElement('div');
        this.fpsOnly.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 6px;
            font-weight: bold;
        `;
        this.fpsOnly.innerHTML = '<span style="color: rgba(232,180,255,0.5); font-size: 0.8em;">FPS</span><span style="color: #FFD700;">--</span>';
        
        // 展开状态：详细数据
        this.details = document.createElement('div');
        this.details.style.cssText = `
            display: none;
            flex-direction: column;
            gap: 2px;
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px solid rgba(232, 180, 255, 0.1);
        `;
        
        this.msText = document.createElement('div');
        this.msText.style.cssText = `display: flex; justify-content: space-between; align-items: center; font-size: 0.9em; color: rgba(232,180,255,0.6);`;
        this.msText.innerHTML = '<span>帧</span><span>--</span>';
        
        this.calcText = document.createElement('div');
        this.calcText.style.cssText = `display: flex; justify-content: space-between; align-items: center; font-size: 0.9em;`;
        this.calcText.innerHTML = '<span style="color: #64B4FF;">JS</span><span style="color: #64B4FF;">--</span>';
        
        this.gpuText = document.createElement('div');
        this.gpuText.style.cssText = `display: flex; justify-content: space-between; align-items: center; font-size: 0.9em;`;
        this.gpuText.innerHTML = '<span style="color: #FF8C42;">GPU</span><span style="color: #FF8C42;">--</span>';
        
        this.details.appendChild(this.msText);
        this.details.appendChild(this.calcText);
        this.details.appendChild(this.gpuText);
        
        this.container.appendChild(this.fpsOnly);
        this.container.appendChild(this.details);
        document.body.appendChild(this.container);
    },
    
    toggleCollapse() {
        this.collapsed = !this.collapsed;
        
        if (this.collapsed) {
            this.details.style.display = 'none';
            this.container.style.borderRadius = '20px';
            this.container.style.padding = '8px 14px';
            this.fpsOnly.style.display = 'flex';
        } else {
            this.details.style.display = 'flex';
            this.container.style.borderRadius = '10px';
            this.container.style.padding = '10px 14px';
            this.fpsOnly.style.display = 'flex';
        }
    },
    
    beginFrame() {
        return performance.now();
    },
    
    endFrame(startTime, rafDelta) {
        const calcTime = performance.now() - startTime;
        this.calcHistory.push(calcTime);
        if (this.calcHistory.length > this.CALC_WINDOW) this.calcHistory.shift();
        
        const gpuTime = Math.max(0, rafDelta - calcTime);
        this.gpuHistory.push(gpuTime);
        if (this.gpuHistory.length > this.GPU_WINDOW) this.gpuHistory.shift();
    },
    
    update(rafDelta) {
        const now = performance.now();
        this.frames++;
        
        if (now >= this.prevTime + 1000) {
            const fps = Math.round((this.frames * 1000) / (now - this.prevTime));
            const fpsColor = fps >= 55 ? '#4ADE80' : fps >= 30 ? '#FFD700' : '#FF4444';
            
            // 折叠状态只更新 FPS 数字
            this.fpsOnly.innerHTML = `<span style="color: rgba(232,180,255,0.5); font-size: 0.8em;">FPS</span><span style="color: ${fpsColor}; font-weight: bold;">${fps}</span>`;
            
            this.frames = 0;
            this.prevTime = now;
        }
        
        const frameTime = now - this.lastFrameTime;
        this.msText.innerHTML = `<span>帧</span><span>${frameTime.toFixed(1)}ms</span>`;
        this.lastFrameTime = now;
        
        this.updateCalcDisplay();
        this.updateGpuDisplay();
    },
    
    updateCalcDisplay() {
        if (this.calcHistory.length === 0) {
            this.calcText.innerHTML = '<span style="color: #64B4FF;">JS</span><span style="color: rgba(255,255,255,0.3);">--</span>';
            return;
        }
        const avg = this.calcHistory.reduce((a, b) => a + b, 0) / this.calcHistory.length;
        const budget = 1000 / 60;
        const pct = Math.min(100, (avg / budget) * 100);
        const color = pct < 30 ? '#4ADE80' : pct < 60 ? '#FFD700' : '#FF4444';
        this.calcText.innerHTML = `<span style="color: #64B4FF;">JS</span><span style="color: ${color};">${pct.toFixed(0)}% ${avg.toFixed(1)}ms</span>`;
    },
    
    updateGpuDisplay() {
        if (this.gpuHistory.length === 0) {
            this.gpuText.innerHTML = '<span style="color: #FF8C42;">GPU</span><span style="color: rgba(255,255,255,0.3);">--</span>';
            return;
        }
        const avg = this.gpuHistory.reduce((a, b) => a + b, 0) / this.gpuHistory.length;
        const budget = 1000 / 60;
        const pct = Math.min(100, (avg / budget) * 100);
        const color = pct < 30 ? '#4ADE80' : pct < 60 ? '#FFD700' : '#FF4444';
        this.gpuText.innerHTML = `<span style="color: #FF8C42;">GPU</span><span style="color: ${color};">${pct.toFixed(0)}% ${avg.toFixed(1)}ms</span>`;
    }
};