function init() {
    if (typeof Recorder !== 'undefined') Recorder.init();
    
    Cube.init();
    Input.init();
    UI.init();
    FPS.init();
    Modules.init();
    Contributors.init();
    EngineSystem.init();
    SaveSystem.init();
    animate();
}

let lastTime = 0;
const FRAME_INTERVAL = 1000 / 60;
let lastRafTime = 0;

function animate(currentTime) {
    requestAnimationFrame(animate);
    
    const rafDelta = lastRafTime > 0 ? currentTime - lastRafTime : FRAME_INTERVAL;
    lastRafTime = currentTime;
    
    if (currentTime - lastTime < FRAME_INTERVAL * 0.85) return;
    lastTime = currentTime;
    
    const calcStart = FPS.beginFrame();
    
    // ========== 引擎打开时暂停 3D 相关更新 ==========
    const engineOpen = EngineSystem.isOpen;
    
    if (!engineOpen) {
        Input.update();
        Cube.updateElastic();
        Cube.updateGlows();
    } else {
    }
    
    Game.updateAuto();
    
    if (Math.floor(currentTime / 50) % 3 === 0) {
        UI.update();
    }
    
    // 3D 渲染（引擎打开时跳过）
    if (!engineOpen) {
        const time = currentTime * 0.001;
        
        if (Cube.cubeMesh) Cube.cubeMesh.material.opacity = 0.12 + Math.sin(time * 1.8) * 0.06;
        if (Cube.innerMesh) Cube.innerMesh.material.opacity = 0.15 + Math.sin(time * 2.2) * 0.06;
        if (Cube.edgeGlow) Cube.edgeGlow.material.opacity = 0.12 + Math.sin(time * 1.5) * 0.06;
        
        Cube.render();
    }
    
    FPS.endFrame(calcStart, rafDelta);
    FPS.update(rafDelta);
}
