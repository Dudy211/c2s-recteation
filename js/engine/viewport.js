if (typeof EngineSystem === 'undefined') window.EngineSystem = {};
Object.assign(EngineSystem, {
    startSimulation() {
        if (!window.d3 || !window.d3.forceSimulation) {
            console.warn('d3 not loaded or missing forceSimulation, falling back to static layout');
            this.calculateStaticLayout();
            return;
        }
        if (!this.nodesData || this.nodesData.length === 0) {
            console.warn('nodesData is empty, cannot start simulation');
            this.calculateStaticLayout();
            return;
        }
        this.simulation = d3.forceSimulation(this.nodesData)
            .force('link', d3.forceLink(this.linksData)
                .id(d => d.id)
                .distance(d => {
                    const sourceLevel = this.getNodeLevel(d.source.id || d.source);
                    const targetLevel = this.getNodeLevel(d.target.id || d.target);
                    return 120 + Math.abs(targetLevel - sourceLevel) * 40;
                })
                .strength(0.5)
            )
            .force('charge', d3.forceManyBody()
                .strength(d => {
                    const isRoot = !d.data.prev || d.data.prev.length === 0;
                    return isRoot ? -300 : -500;
                })
                .distanceMax(400)
            )
            .force('center', d3.forceCenter(0, 0).strength(0.05))
            .force('collide', d3.forceCollide()
                .radius(d => d.radius + 20)
                .strength(0.7)
                .iterations(2)
            )
            .force('x', d3.forceX(0).strength(0.03))
            .force('y', d3.forceY(0).strength(0.03))
            .alphaDecay(0.02)
            .velocityDecay(0.3)
            .on('tick', () => this.onSimulationTick());
        this.simulation.alpha(1).restart();
        setTimeout(() => {
            if (this.simulation) this.simulation.alphaDecay(0.05);
        }, 3000);
    },

    onSimulationTick() {
        if (!this.isOpen) return;
        const nodeEls = document.querySelectorAll('.tree-node');
        nodeEls.forEach(el => {
            const nodeId = el.dataset.nodeId;
            const simNode = this.nodesData.find(n => n.id === nodeId);
            if (simNode) {
                el.style.left = (simNode.x + 1000) + 'px';
                el.style.top = (simNode.y + 1000) + 'px';
            }
        });
        this.updateConnections();
    },

    calculateStaticLayout() {
        if (!this.graph || !this.graph.nodes) return;
        const levels = new Map();
        const inDegree = new Map();
        this.graph.nodes.forEach(n => {
            inDegree.set(n.id, n.prev.length);
            if (n.prev.length === 0) levels.set(n.id, 0);
        });
        const queue = this.graph.nodes.filter(n => n.prev.length === 0).map(n => n.id);
        while (queue.length > 0) {
            const currId = queue.shift();
            const currLevel = levels.get(currId);
            const curr = this.nodeMap.get(currId);
            if (!curr) continue;
            curr.next.forEach(nextId => {
                const next = this.nodeMap.get(nextId);
                if (!next) return;
                const newLevel = Math.max(levels.get(nextId) || 0, currLevel + 1);
                levels.set(nextId, newLevel);
                inDegree.set(nextId, inDegree.get(nextId) - 1);
                if (inDegree.get(nextId) <= 0) queue.push(nextId);
            });
        }
        const levelGroups = new Map();
        levels.forEach((lvl, id) => {
            if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
            levelGroups.get(lvl).push(id);
        });
        const nodeAngle = new Map();
        const roots = this.graph.nodes.filter(n => n.prev.length === 0);
        roots.forEach((root, i) => {
            root.x = 0; root.y = 0;
            nodeAngle.set(root.id, (i / Math.max(roots.length, 1)) * Math.PI * 2);
        });
        const RADIUS_STEP = 200, MIN_RADIUS = 180;
        levelGroups.forEach((ids, lvl) => {
            if (lvl === 0) return;
            const parentGroups = new Map();
            ids.forEach(id => {
                const node = this.nodeMap.get(id);
                if (!node) return;
                const parentId = node.prev[0];
                if (!parentGroups.has(parentId)) parentGroups.set(parentId, []);
                parentGroups.get(parentId).push(id);
            });
            parentGroups.forEach((childIds, parentId) => {
                const parent = this.nodeMap.get(parentId);
                if (!parent) return;
                const parentAngle = nodeAngle.get(parentId) || 0;
                const count = childIds.length;
                const spread = Math.min(Math.PI * 1.2, Math.PI * 2 / Math.max(count, 1));
                const startAngle = parentAngle - spread / 2;
                childIds.forEach((childId, i) => {
                    const child = this.nodeMap.get(childId);
                    if (!child) return;
                    const angle = startAngle + (count > 1 ? (i / (count - 1)) * spread : 0);
                    const radius = MIN_RADIUS + (lvl - 1) * RADIUS_STEP;
                    child.x = Math.cos(angle) * radius;
                    child.y = Math.sin(angle) * radius;
                    nodeAngle.set(childId, angle);
                });
            });
            ids.forEach(id => {
                const node = this.nodeMap.get(id);
                if (!node || node.x !== undefined) return;
                const parentPositions = node.prev.map(pid => {
                    const p = this.nodeMap.get(pid);
                    return p ? { x: p.x || 0, y: p.y || 0, angle: nodeAngle.get(pid) || 0 } : null;
                }).filter(Boolean);
                if (parentPositions.length > 0) {
                    const avgAngle = parentPositions.reduce((sum, p) => sum + p.angle, 0) / parentPositions.length;
                    const radius = MIN_RADIUS + (lvl - 1) * RADIUS_STEP;
                    node.x = Math.cos(avgAngle) * radius;
                    node.y = Math.sin(avgAngle) * radius;
                    nodeAngle.set(id, avgAngle);
                }
            });
        });
        const MIN_DIST = 140;
        for (let iter = 0; iter < 30; iter++) {
            let moved = false;
            for (let i = 0; i < this.graph.nodes.length; i++) {
                for (let j = i + 1; j < this.graph.nodes.length; j++) {
                    const a = this.graph.nodes[i], b = this.graph.nodes[j];
                    const dx = b.x - a.x, dy = b.y - a.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < MIN_DIST && dist > 0) {
                        const overlap = (MIN_DIST - dist) / 2;
                        const nx = dx / dist, ny = dy / dist;
                        a.x -= nx * overlap; a.y -= ny * overlap;
                        b.x += nx * overlap; b.y += ny * overlap;
                        moved = true;
                    }
                }
            }
            if (!moved) break;
        }
    },

    setupViewport() {
        const viewport = document.getElementById('treeViewport');
        if (!viewport) return;
        this.viewX = 0; this.viewY = 0; this.scale = 1;
        this.isDragging = false; this.isPinching = false;
        const onPointerDown = (e) => {
            if (e.target.closest('.tree-node')) return;
            if (e.touches && e.touches.length === 2) {
                this.isPinching = true; this.isDragging = false;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                this.pinchDist = Math.sqrt(dx*dx + dy*dy);
                this.pinchScale = this.scale;
                e.preventDefault(); return;
            }
            this.isDragging = true; this.isPinching = false;
            this.lastMouseX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            this.lastMouseY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
            viewport.style.cursor = 'grabbing';
            e.preventDefault();
        };
        const onPointerMove = (e) => {
            // 阻止所有多点触摸的默认网页缩放行为
            if (e.touches && e.touches.length >= 2) {
                e.preventDefault();
            }
            if (e.touches && e.touches.length === 2 && this.isPinching) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (this.pinchDist > 0) {
                    this.scale = Math.max(0.2, Math.min(4, this.pinchScale * (dist / this.pinchDist)));
                    this.updateTransform();
                }
                return;
            }
            if (!this.isDragging || this.isPinching) return;
            const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
            this.viewX += clientX - this.lastMouseX;
            this.viewY += clientY - this.lastMouseY;
            this.lastMouseX = clientX; this.lastMouseY = clientY;
            this.updateTransform();
            e.preventDefault();
        };
        const onPointerUp = () => { this.isDragging = false; this.isPinching = false; viewport.style.cursor = 'grab'; };
        const onWheel = (e) => { e.preventDefault(); this.scale = Math.max(0.2, Math.min(4, this.scale * (e.deltaY > 0 ? 0.9 : 1.1))); this.updateTransform(); };
        viewport.addEventListener('mousedown', onPointerDown);
        viewport.addEventListener('touchstart', onPointerDown, { passive: false });
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('touchmove', onPointerMove, { passive: false, capture: true });
        window.addEventListener('mouseup', onPointerUp);
        window.addEventListener('touchend', onPointerUp);
        viewport.addEventListener('wheel', onWheel, { passive: false });
        this._cleanupViewport = () => {
            viewport.removeEventListener('mousedown', onPointerDown);
            viewport.removeEventListener('touchstart', onPointerDown);
            window.removeEventListener('mousemove', onPointerMove);
            window.removeEventListener('touchmove', onPointerMove);
            window.removeEventListener('mouseup', onPointerUp);
            window.removeEventListener('touchend', onPointerUp);
            viewport.removeEventListener('wheel', onWheel);
        };
        viewport.style.cursor = 'grab';
    },

    updateTransform() {
        const canvas = document.getElementById('treeCanvas');
        if (canvas) canvas.style.transform = `translate(calc(-50% + ${this.viewX}px), calc(-50% + ${this.viewY}px)) scale(${this.scale})`;
        const labels = document.querySelectorAll('.tree-node-label');
        labels.forEach(label => {
            if (this.scale < 0.5) label.style.opacity = '0';
            else if (this.scale < 0.8) label.style.opacity = String((this.scale - 0.5) / 0.3);
            else label.style.opacity = '1';
        });
    },

    renderConnections() {
        const svg = document.getElementById('treeConnections');
        if (!svg || !this.graph || !this.linksData || this.linksData.length === 0) return;
        if (!this.linkGradients) this.linkGradients = new Map();
        const animatingPaths = new Map();
        svg.querySelectorAll('.tree-link.route-flow').forEach(p => {
            const key = p.dataset.source + '->' + p.dataset.target;
            animatingPaths.set(key, {
                delay: p.style.animationDelay,
                marker: p.getAttribute('marker-end')
            });
        });
        const oldPaths = svg.querySelectorAll('.tree-link');
        oldPaths.forEach(p => p.remove());
        const oldGrads = svg.querySelectorAll('linearGradient[id^="grad-"]');
        oldGrads.forEach(g => g.remove());
        this.linkGradients.clear();
        this.linksData.forEach(link => {
            const sourceNode = this.nodeMap.get(link.source.id || link.source);
            const targetNode = this.nodeMap.get(link.target.id || link.target);
            if (!sourceNode || !targetNode) return;
            const isActive = this.unlockedNodes.has(sourceNode.id) && this.unlockedNodes.has(targetNode.id);
            const isChallenge = targetNode.type === 'challenge';
            const challengeDone = this.isChallengeCompleted(targetNode);
            const sourceSim = this.nodesData.find(n => n.id === sourceNode.id);
            const targetSim = this.nodesData.find(n => n.id === targetNode.id);
            const x1 = (sourceSim ? sourceSim.x : (sourceNode.x || 0)) + 1000;
            const y1 = (sourceSim ? sourceSim.y : (sourceNode.y || 0)) + 1000;
            const x2 = (targetSim ? targetSim.x : (targetNode.x || 0)) + 1000;
            const y2 = (targetSim ? targetSim.y : (targetNode.y || 0)) + 1000;
            const dx = x2 - x1, dy = y2 - y1;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1) return;
            const nodeRadius = 40;
            const shorten = nodeRadius + 4;
            const startRatio = shorten / dist;
            const endRatio = (dist - shorten) / dist;
            const startX = x1 + dx * startRatio;
            const startY = y1 + dy * startRatio;
            const endX = x1 + dx * endRatio;
            const endY = y1 + dy * endRatio;
            const curvature = Math.min(dist * 0.25, 60);
            const midX = (x1 + endX) / 2;
            const midY = (y1 + endY) / 2;
            const perpX = -dy / dist * curvature;
            const perpY = dx / dist * curvature;
            const cpX = midX + perpX;
            const cpY = midY + perpY;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('class', 'tree-link');
            path.dataset.source = sourceNode.id;
            path.dataset.target = targetNode.id;
            const animKey = sourceNode.id + '->' + targetNode.id;
            const animState = animatingPaths.get(animKey);
            if (animState) {
                path.classList.add('route-flow');
                path.style.animationDelay = animState.delay;
                path.setAttribute('marker-end', animState.marker);
                path.setAttribute('stroke-width', '7');
                path.setAttribute('opacity', '1');
            } else if (isActive) {
                const gradId = `grad-${sourceNode.id}-${targetNode.id}`;
                const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
                grad.setAttribute('id', gradId);
                grad.setAttribute('gradientUnits', 'userSpaceOnUse');
                grad.setAttribute('x1', x1); grad.setAttribute('y1', y1);
                grad.setAttribute('x2', x2); grad.setAttribute('y2', y2);
                const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                stop1.setAttribute('offset', '0%');
                stop1.setAttribute('stop-color', this.getNodeColor(sourceNode));
                stop1.setAttribute('stop-opacity', '0.95');
                const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                stop2.setAttribute('offset', '100%');
                stop2.setAttribute('stop-color', this.getNodeColor(targetNode));
                stop2.setAttribute('stop-opacity', '0.95');
                grad.appendChild(stop1); grad.appendChild(stop2);
                const defs = svg.querySelector('defs');
                if (defs) defs.appendChild(grad);
                this.linkGradients.set(sourceNode.id + '->' + targetNode.id, grad);
                path.setAttribute('stroke', `url(#${gradId})`);
                path.setAttribute('stroke-width', '6');
                path.setAttribute('opacity', '1');
                path.classList.add('active-link');
                path.setAttribute('marker-end', 'none');
            } else {
                path.setAttribute('stroke', 'rgba(160,160,160,0.4)');
                path.setAttribute('stroke-width', '3');
                path.setAttribute('opacity', '0.6');
                path.classList.add('inactive-link');
                path.setAttribute('marker-end', 'none');
            }
            svg.appendChild(path);
        });
    },

    updateConnections() {
        const svg = document.getElementById('treeConnections');
        if (!svg || !this.linkGradients) return;
        const paths = svg.querySelectorAll('.tree-link');
        paths.forEach(path => {
            const sourceId = path.dataset.source;
            const targetId = path.dataset.target;
            const sourceSim = this.nodesData.find(n => n.id === sourceId);
            const targetSim = this.nodesData.find(n => n.id === targetId);
            if (!sourceSim || !targetSim) return;
            const x1 = sourceSim.x + 1000, y1 = sourceSim.y + 1000;
            const x2 = targetSim.x + 1000, y2 = targetSim.y + 1000;
            const dx = x2 - x1, dy = y2 - y1;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1) return;
            const nodeRadius = 40;
            const shorten = nodeRadius + 4;
            const startRatio = shorten / dist;
            const endRatio = (dist - shorten) / dist;
            const startX = x1 + dx * startRatio;
            const startY = y1 + dy * startRatio;
            const endX = x1 + dx * endRatio;
            const endY = y1 + dy * endRatio;
            const curvature = Math.min(dist * 0.25, 60);
            const midX = (x1 + endX) / 2;
            const midY = (y1 + endY) / 2;
            const perpX = -dy / dist * curvature;
            const perpY = dx / dist * curvature;
            const cpX = midX + perpX;
            const cpY = midY + perpY;
            path.setAttribute('d', `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`);
            const grad = this.linkGradients.get(sourceId + '->' + targetId);
            if (grad) {
                grad.setAttribute('x1', x1); grad.setAttribute('y1', y1);
                grad.setAttribute('x2', x2); grad.setAttribute('y2', y2);
            }
        });
    }
});
