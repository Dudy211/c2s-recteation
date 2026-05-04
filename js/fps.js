const FPS = {
    container: null,
    fpsText: null,
    msText: null,
    frames: 0,
    prevTime: performance.now(),
    lastFrameTime: performance.now(),
    
    init() {
        // 创建 FPS 显示容器
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            bottom: 12px;
            right: 16px;
            z-index: 1000;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(232, 180, 255, 0.2);
            border-radius: 8px;
            padding: 6px 12px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.75em;
            color: #E8B4FF;
            pointer-events: none;
            user-select: none;
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 70px;
        `;
        
        // FPS 显示
        this.fpsText = document.createElement('div');
        this.fpsText.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        this.fpsText.innerHTML = '<span>FPS</span><span style="color: #FFD700; font-weight: bold;">--</span>';
        
        // 帧时间显示
        this.msText = document.createElement('div');
        this.msText.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.85em;
            color: rgba(232, 180, 255, 0.6);
        `;
        this.msText.innerHTML = '<span>ms</span><span>--</span>';
        
        this.container.appendChild(this.fpsText);
        this.container.appendChild(this.msText);
        document.body.appendChild(this.container);
    },
    
    update() {
        const now = performance.now();
        this.frames++;
        
        // 每秒更新一次 FPS
        if (now >= this.prevTime + 1000) {
            const fps = Math.round((this.frames * 1000) / (now - this.prevTime));
            const fpsColor = fps >= 55 ? '#4ADE80' : fps >= 30 ? '#FFD700' : '#FF4444';
            
            this.fpsText.innerHTML = `<span>FPS</span><span style="color: ${fpsColor}; font-weight: bold;">${fps}</span>`;
            
            this.frames = 0;
            this.prevTime = now;
        }
        
        // 每帧更新帧时间
        const frameTime = now - this.lastFrameTime;
        this.msText.innerHTML = `<span>ms</span><span>${frameTime.toFixed(1)}</span>`;
        this.lastFrameTime = now;
    }
};
