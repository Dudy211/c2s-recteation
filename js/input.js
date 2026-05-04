const Input = {
    isDragging: false,
    previousPos: { x: 0, y: 0 },
    targetRotation: { x: -0.2, y: 0.35 },
    currentRotation: { x: -0.2, y: 0.35 },
    autoFloat: true,
    dragStartTime: 0,
    dragStartPos: { x: 0, y: 0 },
    clickPos: { x: 0, y: 0 },
    
    // 防止重复触发
    pointerDown: false,
    
    init() {
        const canvas = Cube.renderer.domElement;
        
        // 只绑定 pointer 事件，统一处理 mouse + touch
        canvas.addEventListener('pointerdown', e => this.onPointerDown(e));
        canvas.addEventListener('pointermove', e => this.onPointerMove(e));
        canvas.addEventListener('pointerup', e => this.onPointerUp(e));
        
        // 阻止默认触摸行为
        canvas.style.touchAction = 'none';
    },
    
    onPointerDown(e) {
        // 防止重复
        if (this.pointerDown) return;
        this.pointerDown = true;
        
        this.isDragging = true;
        this.autoFloat = false;
        this.previousPos = { x: e.clientX, y: e.clientY };
        this.dragStartTime = Date.now();
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.clickPos = { x: e.clientX, y: e.clientY };
    },
    
    onPointerMove(e) {
        if (!this.isDragging) return;
        
        const dx = e.clientX - this.previousPos.x;
        const dy = e.clientY - this.previousPos.y;
        
        this.targetRotation.y += dx * 0.01;
        this.targetRotation.x += dy * 0.01;
        this.targetRotation.x = Math.max(-1.0, Math.min(1.0, this.targetRotation.x));
        
        this.previousPos = { x: e.clientX, y: e.clientY };
    },
    
    onPointerUp(e) {
        if (!this.pointerDown) return;
        this.pointerDown = false;
        
        if (!this.isDragging) return;
        this.isDragging = false;
        
        const dragTime = Date.now() - this.dragStartTime;
        const dragDist = Math.hypot(e.clientX - this.dragStartPos.x, e.clientY - this.dragStartPos.y);
        
        // 点击判定：时间短 + 移动少
        if (dragTime < 250 && dragDist < 15) {
            // 射线检测必须点到方块
            const hitCube = Cube.checkIntersection(this.clickPos.x, this.clickPos.y);
            if (hitCube) {
                Game.onCubeClick();
            }
        }
        
        setTimeout(() => {
            if (!this.isDragging) this.autoFloat = true;
        }, 2000);
    },
    
    update() {
        const time = Date.now() * 0.001;
        
        if (this.autoFloat) {
            this.targetRotation.y += 0.002;
            this.targetRotation.x = -0.2 + Math.sin(time * 0.6) * 0.1;
        }
        
        this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.06;
        this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.06;
        
        Cube.group.rotation.x = this.currentRotation.x;
        Cube.group.rotation.y = this.currentRotation.y;
        
        const floatY = this.autoFloat ? Math.sin(time * 1.2) * 0.1 : 0;
        Cube.group.position.y = floatY;
    }
};
