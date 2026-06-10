function init() {
    if (typeof Recorder !== 'undefined') Recorder.init();

    Cube.init();
    Input.init();
    UI.init();
    FPS.init();
    Modules.init();
    Contributors.init();

    // 修复：EngineSystem.init() 是异步函数，需要 await 确保加载完成
    // 否则在 APK 环境下，engine-tree.json 可能还没加载完，
    // Recorder 的挑战统计就会因为 graph 为空而失效
    EngineSystem.init().then(() => {
        // 修复：确保引擎初始化完成后刷新 Recorder 缓存的挑战事件（APK环境）
        if (typeof Recorder !== 'undefined' && Recorder.flushPending) {
            Recorder.flushPending();
        }
        SaveSystem.init();
        animate();
    }).catch(err => {
        console.error('EngineSystem init failed:', err);
        SaveSystem.init();
        animate();
    });
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