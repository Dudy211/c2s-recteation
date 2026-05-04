const Cube = {
    scene: null,
    camera: null,
    renderer: null,
    group: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    
    squashScale: 1,
    squashVelocity: 0,
    targetScale: 1,
    
    glowMeshes: [],
    GLOW_COUNT: 8,
    
    // 隐藏的光源组
    lights: {},
    
    init() {
        this.scene = new THREE.Scene();
        
        // 相机设置 - 更好的透视角度
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(1.5, 1.2, 3.5);
        this.camera.lookAt(0, 0, 0);
        
        this.renderer = new THREE.WebGLRenderer({ 
            alpha: true, 
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // 性能优化：禁用阴影计算（透光材质不需要）
        this.renderer.shadowMap.enabled = false;
        
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        
        this.createJellyCube();
        this.createHiddenLights();
        this.initGlowSystem();
        
        window.addEventListener('resize', () => this.onResize());
    },
    
    createRoundedBoxGeometry(size, radius) {
        const shape = new THREE.Shape();
        const half = size / 2;
        const r = Math.min(radius, half * 0.3);
        
        shape.moveTo(-half + r, half);
        shape.lineTo(half - r, half);
        shape.quadraticCurveTo(half, half, half, half - r);
        shape.lineTo(half, -half + r);
        shape.quadraticCurveTo(half, -half, half - r, -half);
        shape.lineTo(-half + r, -half);
        shape.quadraticCurveTo(-half, -half, -half, -half + r);
        shape.lineTo(-half, half - r);
        shape.quadraticCurveTo(-half, half, -half + r, half);
        
        const extrudeSettings = {
            depth: size,
            bevelEnabled: true,
            bevelSegments: 4, // 性能优化：减少分段
            bevelSize: r,
            bevelThickness: r,
            curveSegments: 6, // 性能优化：减少分段
        };
        
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.center();
        geometry.computeVertexNormals();
        
        return geometry;
    },
    
    createJellyCube() {
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        // 尺寸调整：从 1.0 改为 0.6，更精致
        const SIZE = 0.6;
        const RADIUS = 0.04; // 圆角半径相应缩小
        
        const geometry = this.createRoundedBoxGeometry(SIZE, RADIUS);
        
        // 主体 - 果冻质感：透光、半透明、无金属感
        const bodyMat = new THREE.MeshPhysicalMaterial({
            color: 0xE8B4FF,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
            depthWrite: false,
            
            // 果冻质感参数
            transmission: 0.6,
            thickness: 1.2,
            ior: 1.4,
            roughness: 0.4,
            metalness: 0.0,
            
            clearcoat: 0.3,
            clearcoatRoughness: 0.4,
            
            attenuationColor: new THREE.Color(0xD4A5FF),
            attenuationDistance: 0.8,
        });
        
        const body = new THREE.Mesh(geometry, bodyMat);
        this.group.add(body);
        this.cubeMesh = body;
        
        // 外层薄膜
        const filmMat = new THREE.MeshBasicMaterial({
            color: 0xF0D0FF,
            transparent: true,
            opacity: 0.15,
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const film = new THREE.Mesh(geometry, filmMat);
        this.group.add(film);
        
        // 内部空腔
        const innerGeo = new THREE.BoxGeometry(SIZE * 0.8, SIZE * 0.8, SIZE * 0.8);
        const innerMat = new THREE.MeshPhysicalMaterial({
            color: 0x9060A0,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide,
            depthWrite: false,
            transmission: 0.4,
            thickness: 0.5,
            roughness: 0.8,
        });
        this.innerMesh = new THREE.Mesh(innerGeo, innerMat);
        this.group.add(this.innerMesh);
        
        // 边缘高光
        const edgeGeo = this.createRoundedBoxGeometry(SIZE * 1.008, RADIUS * 1.2);
        const edgeMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.12,
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.edgeGlow = new THREE.Mesh(edgeGeo, edgeMat);
        this.group.add(this.edgeGlow);
        
        // 初始角度
        this.group.rotation.x = -0.2;
        this.group.rotation.y = 0.4;
    },
    
    createHiddenLights() {
        // 隐藏光源组：所有光源放在方块内部或背面
        
        // 1. 中心主光源
        this.lights.main = new THREE.PointLight(0xFFFFFF, 4, 6);
        this.lights.main.position.set(0, 0, 0);
        this.scene.add(this.lights.main);
        
        // 2. 内部金色光源
        this.lights.gold = new THREE.PointLight(0xFFE4A0, 3, 5);
        this.lights.gold.position.set(0, 0.3, 0);
        this.scene.add(this.lights.gold);
        
        // 3. 内部紫色光源
        this.lights.purple = new THREE.PointLight(0xC084FF, 3, 5);
        this.lights.purple.position.set(0, -0.3, 0);
        this.scene.add(this.lights.purple);
        
        // 4. 背面轮廓光
        this.lights.rim = new THREE.PointLight(0xE8B4FF, 2, 8);
        this.lights.rim.position.set(0, 0, -3);
        this.scene.add(this.lights.rim);
        
        // 5. 环境光
        const ambientLight = new THREE.AmbientLight(0xE8B4FF, 0.5);
        this.scene.add(ambientLight);
        
        // 6. 底部补光
        this.lights.bottom = new THREE.PointLight(0xFFD700, 1.5, 6);
        this.lights.bottom.position.set(0, -2, 1);
        this.scene.add(this.lights.bottom);
    },
    
    initGlowSystem() {
        const sharedGeo = new THREE.PlaneGeometry(2, 2);
        
        for (let i = 0; i < this.GLOW_COUNT; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0xFFD700 : 0xFFFFFF,
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            });
            
            const mesh = new THREE.Mesh(sharedGeo, mat);
            mesh.position.set(
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4,
                2 + Math.random()
            );
            mesh.userData.active = false;
            mesh.userData.life = 0;
            mesh.userData.type = i % 2;
            
            this.scene.add(mesh);
            this.glowMeshes.push(mesh);
        }
    },
    
    triggerGlow(color = 0xFFD700) {
        for (const mesh of this.glowMeshes) {
            if (!mesh.userData.active) {
                mesh.userData.active = true;
                mesh.userData.life = 1;
                mesh.material.color.setHex(color);
                mesh.material.opacity = 0.25;
                
                const isGold = color === 0xFFD700 || color === 0xFFE8A0;
                const angle = Math.random() * Math.PI * 2;
                const dist = 1 + Math.random() * 1.5;
                
                mesh.position.x = Math.cos(angle) * dist;
                mesh.position.y = isGold 
                    ? Math.abs(Math.sin(angle)) * dist * 0.4 + 0.3
                    : -(Math.abs(Math.sin(angle)) * dist * 0.4 + 0.3);
                mesh.position.z = 1 + Math.random() * 1.5;
                mesh.scale.setScalar(0.15 + Math.random() * 0.25);
                
                return;
            }
        }
    },
    
    updateGlows() {
        for (const mesh of this.glowMeshes) {
            if (!mesh.userData.active) continue;
            
            mesh.userData.life -= 0.025;
            
            const life = mesh.userData.life;
            mesh.material.opacity = Math.sin(life * Math.PI) * 0.2;
            mesh.scale.multiplyScalar(1.01);
            mesh.rotation.z += 0.005;
            
            if (mesh.userData.life <= 0) {
                mesh.userData.active = false;
                mesh.material.opacity = 0;
            }
        }
    },
    
    checkIntersection(clientX, clientY) {
        if (!this.camera || !this.group) return false;
        
        this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.group.children, true);
        return intersects.length > 0;
    },
    
    updateElastic() {
        const k = 0.18;
        const damping = 0.9;
        
        const force = (this.targetScale - this.squashScale) * k;
        this.squashVelocity += force;
        this.squashVelocity *= damping;
        this.squashScale += this.squashVelocity;
        
        const diff = 1 - this.squashScale;
        const stretch = 1 + diff * 0.25;
        
        this.group.scale.set(
            this.squashScale * stretch,
            this.squashScale * stretch,
            this.squashScale
        );
    },
    
    bounce() {
        this.squashVelocity = Math.max(this.squashVelocity - 0.06, -0.12);
    },
    
    bigBounce() {
        this.squashVelocity = Math.max(this.squashVelocity - 0.12, -0.2);
    },
    
    glow(color = 0xFFD700) {
        this.triggerGlow(color);
        
        if (!this.cubeMesh) return;
        
        const origMain = this.lights.main.intensity;
        const origGold = this.lights.gold.intensity;
        const origPurple = this.lights.purple.intensity;
        
        this.lights.main.intensity = 8;
        this.lights.gold.intensity = color === 0xFFD700 ? 6 : 2;
        this.lights.purple.intensity = 6;
        
        let frame = 0;
        const restore = () => {
            frame++;
            const t = frame / 30;
            const ease = Math.pow(1 - t, 2);
            
            this.lights.main.intensity = origMain + (8 - origMain) * ease;
            this.lights.gold.intensity = origGold + (6 - origGold) * ease;
            this.lights.purple.intensity = origPurple + (6 - origPurple) * ease;
            
            if (frame < 30) {
                requestAnimationFrame(restore);
            } else {
                this.lights.main.intensity = origMain;
                this.lights.gold.intensity = origGold;
                this.lights.purple.intensity = origPurple;
            }
        };
        restore();
    },
    
    onResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    },
    
    render() {
        if (!this.renderer || !this.scene || !this.camera) return;
        this.renderer.render(this.scene, this.camera);
    }
};
