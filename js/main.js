function init() {
    Cube.init();
    Input.init();
    UI.init();
    FPS.init();
    Modules.init();
    SaveSystem.init();
    animate();
}

let lastTime = 0;
const FRAME_INTERVAL = 1000 / 60;

function animate(currentTime) {
    requestAnimationFrame(animate);
    
    if (currentTime - lastTime < FRAME_INTERVAL * 0.85) return;
    lastTime = currentTime;
    
    Input.update();
    Cube.updateElastic();
    Cube.updateGlows();
    Game.updateAuto();
    
    if (Math.floor(currentTime / 50) % 3 === 0) {
        UI.update();
    }
    
    const time = currentTime * 0.001;
    
    if (Cube.core) {
        Cube.core.material.opacity = 0.12 + Math.sin(time * 1.8) * 0.06;
    }
    
    if (Cube.goldBar) {
        Cube.goldBar.material.opacity = 0.45 + Math.sin(time * 2.2) * 0.15;
    }
    
    if (Cube.edges) {
        Cube.edges.material.opacity = 0.5 + Math.sin(time * 1.5) * 0.15;
    }
    
    Cube.render();
    FPS.update();
}

init();
