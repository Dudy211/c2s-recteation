if (typeof EngineSystem === 'undefined') window.EngineSystem = {};
Object.assign(EngineSystem, {
    async openEngineModal() {
        if (!this.dataLoaded) await this.loadTreeData();

        if (typeof Menu !== 'undefined' && Menu.open) Menu.toggle();

        this.isOpen = true;
        this.refreshChallengesFromGame();
        let modal = document.getElementById('engineModal');
        if (modal) modal.remove();
        modal = document.createElement('div');
        modal.id = 'engineModal';
        modal.className = 'engine-modal';
        modal.innerHTML = `
            <div class="engine-modal-overlay" id="engineModalOverlay"></div>
            <div class="engine-modal-content">
                <div class="engine-modal-header">
                    <h2>⚙️ 引擎升级</h2>
                    <div class="engine-token-display">
                        <span class="engine-token-icon">⚡</span>
                        <span class="engine-token-amount">${this.engineTokens.toFixed(6)}</span>
                    </div>
                    <button class="engine-modal-close" onclick="EngineSystem.closeEngineModal()">✕</button>
                </div>
                <div class="engine-tree-viewport" id="treeViewport">
                    <div class="engine-tree-canvas" id="treeCanvas">
                        <svg class="tree-connections" id="treeConnections" width="2000" height="2000" viewBox="0 0 2000 2000">
                            <defs>
                                <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="3" result="blur"/>
                                    <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                                </filter>
                                <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="3" result="blur"/>
                                    <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                                </filter>
                                <filter id="glow-gray" x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="2" result="blur"/>
                                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                                </filter>
                                <marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                    <path d="M0,0.5 L5,3 L0,5.5 L1.5,3 Z" fill="#64B4FF"/>
                                </marker>
                                <marker id="arrow-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                    <path d="M0,0.5 L5,3 L0,5.5 L1.5,3 Z" fill="#FF6464"/>
                                </marker>
                                <marker id="arrow-gray" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                                    <path d="M0,0.5 L4,2.5 L0,4.5 L1,2.5 Z" fill="rgba(180,180,180,0.4)"/>
                                </marker>
                            </defs>
                        </svg>
                        <div class="tree-nodes" id="treeNodes"></div>
                    </div>
                </div>
                <div class="node-detail-panel" id="nodeDetailPanel">
                    <div class="node-detail-content">
                        <div class="node-detail-header">
                            <div class="node-detail-icon" id="detailIcon">◈</div>
                            <div class="node-detail-title">
                                <h3 id="detailName">选择一个节点</h3>
                                <span class="node-status" id="detailStatus">点击节点查看详情</span>
                            </div>
                            <button class="detail-toggle-btn" id="detailToggleBtn" onclick="EngineSystem.toggleDetailCollapse()">▼</button>
                            <button class="detail-close-btn" id="detailCloseBtn">✕</button>
                        </div>
                        <div class="node-detail-body collapsible-content">
                            <p class="node-detail-desc" id="detailDesc"></p>
                            <div class="node-detail-mini-desc" id="detailMiniDesc" style="display:none"></div>
                            <div class="node-detail-effects collapsible-content" id="detailEffects"></div>
                            <div class="node-detail-challenge collapsible-content" id="detailChallenge" style="display:none">
                                <div class="challenge-label">挑战进度</div>
                                <div class="challenge-bar-wrap">
                                    <div class="challenge-bar-bg"><div class="challenge-bar-fill" id="challengeBarFill" style="width:0%"></div></div>
                                    <span class="challenge-text" id="challengeText">0 / 0</span>
                                </div>
                            </div>
                            <div class="node-detail-music collapsible-content" id="detailMusic" style="display:none">
                                <span class="music-label">🎵 预览音乐</span>
                                <button class="music-btn" id="musicBtn" onclick="EngineSystem.togglePreviewMusic()">播放</button>
                            </div>
                            <div class="node-detail-cost collapsible-content" id="detailCost" style="display:none">
                                <span class="cost-label">需要:</span>
                                <span class="cost-value" id="costValue">0</span>
                                <span>引擎代币</span>
                            </div>
                        </div>
                        <div class="node-detail-actions collapsible-content" id="detailActions">
                            <button class="node-btn close" onclick="EngineSystem.closeDetail()">关闭</button>
                        </div>
                    </div>
                </div>
                <div class="engine-footer">
                    <button class="convert-btn" onclick="EngineSystem.showConvertConfirm()">💱 转换并进入</button>
                    <span class="convert-info">114,514 ◆ = 0.114514 ⚡</span>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // 阻止双指触摸缩放整个网页
        modal.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length >= 2) e.preventDefault();
        }, { passive: false });

        this.bindDetailCloseEvents();

        requestAnimationFrame(() => {
            this.setupViewport();
            this.renderGraph();
            this.updateTransform();
            this.startSimulation();
            modal.classList.add('show');
        });
    },

    bindDetailCloseEvents() {
        const overlay = document.getElementById('engineModalOverlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                if (this.selectedNode) this.closeDetail();
            });
        }
        const viewport = document.getElementById('treeViewport');
        if (viewport) {
            viewport.addEventListener('click', (e) => {
                if (!e.target.closest('.tree-node') && this.selectedNode) {
                    this.closeDetail();
                }
            });
        }
    },

    renderGraph() {
        this.renderConnections();
        this.renderNodes();
    },

    renderNodes() {
        const container = document.getElementById('treeNodes');
        if (!container || !this.graph || !this.graph.nodes) return;
        container.innerHTML = '';
        this.graph.nodes.forEach((node, index) => {
            const isUnlocked = this.unlockedNodes.has(node.id);
            const parentUnlocked = this.isParentUnlocked(node);
            const isChallenge = node.type === 'challenge';
            const challengeDone = this.isChallengeCompleted(node);
            const classes = ['tree-node'];
            if (isUnlocked) classes.push('unlocked');
            if (parentUnlocked && !isUnlocked) classes.push('available');
            if (!parentUnlocked) classes.push('locked');
            if (node.type) classes.push(`type-${node.type}`);
            if (isChallenge && challengeDone) classes.push('challenge-complete');
            const simNode = this.nodesData.find(n => n.id === node.id);
            const x = simNode ? simNode.x : (node.x || 0);
            const y = simNode ? simNode.y : (node.y || 0);
            const nodeEl = document.createElement('div');
            nodeEl.className = classes.join(' ');
            nodeEl.style.left = (x + 1000) + 'px';
            nodeEl.style.top = (y + 1000) + 'px';
            nodeEl.style.animationDelay = (index * 0.05) + 's';
            nodeEl.dataset.nodeId = node.id;
            let iconHtml = '';
            if (node.icon) {
                iconHtml = `<img src="${node.icon}" class="tree-node-icon-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'" alt=""><span class="tree-node-icon-fallback" style="display:none">${node.fallbackIcon || '◈'}</span>`;
            } else {
                iconHtml = `<span class="tree-node-icon-fallback">${node.fallbackIcon || '◈'}</span>`;
            }
            nodeEl.innerHTML = `
                <div class="tree-node-inner" style="border-color: ${node.color || '#FFD700'}">${iconHtml}</div>
                <div class="tree-node-label">
                    <div class="tree-node-name">${node.name}</div>
                    ${isUnlocked ? `<div class="tree-node-level">Lv.${node.level}${node.maxLevel > 1 ? '/' + node.maxLevel : ''}</div>` : ''}
                </div>
            `;
            nodeEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onNodeClick(node);
            });
            nodeEl.addEventListener('mouseenter', () => this.highlightNodeConnections(node.id, true));
            nodeEl.addEventListener('mouseleave', () => this.highlightNodeConnections(node.id, false));
            this.setupNodeDrag(nodeEl, node.id);
            container.appendChild(nodeEl);
        });
    },

    setupNodeDrag(el, nodeId) {
        let isDragging = false;
        let startX, startY;
        const onDown = (e) => {
            e.stopPropagation();
            isDragging = true;
            const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
            startX = clientX; startY = clientY;
            const simNode = this.nodesData.find(n => n.id === nodeId);
            if (simNode && this.simulation) {
                simNode.fx = simNode.x;
                simNode.fy = simNode.y;
                this.simulation.alpha(0.3).restart();
            }
            el.style.cursor = 'grabbing';
            el.style.zIndex = '100';
        };
        const onMove = (e) => {
            if (!isDragging) return;
            e.stopPropagation();
            const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
            const dx = (clientX - startX) / this.scale;
            const dy = (clientY - startY) / this.scale;
            const simNode = this.nodesData.find(n => n.id === nodeId);
            if (simNode) {
                simNode.fx = simNode.x + dx;
                simNode.fy = simNode.y + dy;
                simNode.x = simNode.fx;
                simNode.y = simNode.fy;
            }
            startX = clientX; startY = clientY;
            if (this.simulation) this.simulation.alpha(0.3).restart();
        };
        const onUp = () => {
            if (!isDragging) return;
            isDragging = false;
            const simNode = this.nodesData.find(n => n.id === nodeId);
            if (simNode && this.simulation) {
                simNode.fx = null;
                simNode.fy = null;
                this.simulation.alpha(0.3).restart();
            }
            el.style.cursor = 'pointer';
            el.style.zIndex = '';
        };
        el.addEventListener('mousedown', onDown);
        el.addEventListener('touchstart', onDown, { passive: false });
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchend', onUp);
    },

    highlightNodeConnections(nodeId, active) {
        const svg = document.getElementById('treeConnections');
        if (!svg) return;
        const paths = svg.querySelectorAll('.tree-link');
        paths.forEach(path => {
            const source = path.dataset.source;
            const target = path.dataset.target;
            if (source === nodeId || target === nodeId) {
                if (active) {
                    path.style.strokeWidth = '5';
                    path.style.opacity = '1';
                    path.style.filter = 'drop-shadow(0 0 12px rgba(255,255,255,0.9))';
                } else {
                    const isActiveLink = this.unlockedNodes.has(source) && this.unlockedNodes.has(target);
                    path.style.strokeWidth = isActiveLink ? '4.5' : '2';
                    path.style.opacity = isActiveLink ? '1' : '0.5';
                    path.style.filter = '';
                }
            } else if (active) {
                path.style.opacity = '0.1';
            } else {
                const isActiveLink = this.unlockedNodes.has(source) && this.unlockedNodes.has(target);
                path.style.opacity = isActiveLink ? '1' : '0.5';
                path.style.filter = '';
            }
        });
        const nodes = document.querySelectorAll('.tree-node');
        nodes.forEach(nodeEl => {
            const id = nodeEl.dataset.nodeId;
            if (active && id !== nodeId) {
                const isConnected = this.linksData.some(l => {
                    const s = l.source.id || l.source;
                    const t = l.target.id || l.target;
                    return (s === nodeId && t === id) || (t === nodeId && s === id);
                });
                nodeEl.style.opacity = isConnected ? '1' : '0.25';
            } else {
                nodeEl.style.opacity = '1';
            }
        });
    },

    onNodeClick(node) {
        this.playClickSound();
        this.animateRouteToNode(node.id);
        if (this.selectedNode && this.selectedNode.id === node.id) {
            const isUnlocked = this.unlockedNodes.has(node.id);
            // 修复：只有已解锁且满级时才阻止升级；未解锁节点始终允许尝试解锁
            if (isUnlocked && node.level >= node.maxLevel) { this.showNodeDetail(node); return; }
            const isChallenge = node.type === 'challenge';
            const challengeDone = this.isChallengeCompleted(node);
            if (isChallenge && !challengeDone) { this.showNodeDetail(node); return; }
            this.tryUpgrade(node); return;
        }
        this.selectedNode = node;
        this.showNodeDetail(node);
    },

    showNodeDetail(node) {
        const panel = document.getElementById('nodeDetailPanel');
        const isUnlocked = this.unlockedNodes.has(node.id);
        const parentUnlocked = this.isParentUnlocked(node);
        const isChallenge = node.type === 'challenge';
        const challengeDone = this.isChallengeCompleted(node);
        const iconEl = document.getElementById('detailIcon');
        if (node.icon) {
            iconEl.innerHTML = `<img src="${node.icon}" onerror="this.style.display='none'; this.parentElement.textContent='${node.fallbackIcon || '◈'}'" alt="">`;
        } else {
            iconEl.textContent = node.fallbackIcon || '◈';
        }
        iconEl.style.color = node.color || '#FFD700';
        document.getElementById('detailName').textContent = node.name;
        document.getElementById('detailDesc').textContent = node.description;
        const miniDesc = document.getElementById('detailMiniDesc');
        if (miniDesc) miniDesc.textContent = node.description;

        const effectsEl = document.getElementById('detailEffects');
        effectsEl.innerHTML = this.getNodeEffectsHTML(node);

        const statusEl = document.getElementById('detailStatus');
        const costEl = document.getElementById('detailCost');
        const challengeEl = document.getElementById('detailChallenge');
        const musicEl = document.getElementById('detailMusic');
        const actionsEl = document.getElementById('detailActions');
        if (node.previewMusic) {
            musicEl.style.display = 'flex';
            const musicBtn = document.getElementById('musicBtn');
            if (musicBtn) musicBtn.textContent = (this.previewAudio && !this.previewAudio.paused && this.selectedNode?.id === node.id) ? '停止' : '播放';
        } else {
            musicEl.style.display = 'none';
            this.stopPreviewMusic();
        }
        if (isChallenge && !challengeDone) {
            challengeEl.style.display = 'block';
            const prog = Recorder.getProgress(node.id);
            if (prog) {
                document.getElementById('challengeBarFill').style.width = prog.percent + '%';
                document.getElementById('challengeText').textContent = `${Math.floor(prog.current)} / ${prog.target}`;
            }
        } else challengeEl.style.display = 'none';
        if (isUnlocked) {
            if (isChallenge && !challengeDone) {
                statusEl.textContent = '挑战未完成'; statusEl.style.color = '#FF6464';
                costEl.style.display = 'none';
                actionsEl.innerHTML = `<button class="node-btn close" onclick="EngineSystem.closeDetail()">关闭</button>`;
            } else if (node.level < node.maxLevel) {
                const cost = node.cost * Math.pow(2, node.level);
                statusEl.textContent = `已解锁 (Lv.${node.level}${node.maxLevel > 1 ? '/' + node.maxLevel : ''})`;
                statusEl.style.color = challengeDone ? '#4ADE80' : '#64B4FF';
                costEl.style.display = 'flex';
                document.getElementById('costValue').textContent = cost.toFixed(2);
                const canAfford = this.engineTokens >= cost;
                actionsEl.innerHTML = `<button class="node-btn upgrade" ${!canAfford ? 'disabled' : ''} onclick="EngineSystem.tryUpgrade('${node.id}')">⬆️ 升级 (${cost.toFixed(2)} ⚡)</button><button class="node-btn close" onclick="EngineSystem.closeDetail()">关闭</button>`;
            } else {
                statusEl.textContent = '已满级'; statusEl.style.color = '#4ADE80';
                costEl.style.display = 'none';
                actionsEl.innerHTML = `<button class="node-btn close" onclick="EngineSystem.closeDetail()">关闭</button>`;
            }
        } else if (parentUnlocked) {
            if (isChallenge && !challengeDone) {
                statusEl.textContent = '挑战节点 - 完成挑战后解锁'; statusEl.style.color = '#FF6464';
                costEl.style.display = 'none';
                challengeEl.style.display = 'block';
                const prog = Recorder.getProgress(node.id);
                if (prog) {
                    document.getElementById('challengeBarFill').style.width = prog.percent + '%';
                    document.getElementById('challengeText').textContent = `${Math.floor(prog.current)} / ${prog.target}`;
                }
                actionsEl.innerHTML = `<button class="node-btn close" onclick="EngineSystem.closeDetail()">关闭</button>`;
            } else if (isChallenge && challengeDone) {
                statusEl.textContent = '挑战完成 - 可解锁'; statusEl.style.color = '#4ADE80';
                costEl.style.display = 'flex';
                // 修复：cost 为 0 时显示"免费"
                const displayCost2 = node.cost === 0 ? '免费' : node.cost;
                document.getElementById('costValue').textContent = displayCost2;
                const canAfford2 = this.engineTokens >= node.cost;
                const btnText2 = node.cost === 0 ? '🔓 免费解锁' : `🔓 解锁 (${node.cost} ⚡)`;
                actionsEl.innerHTML = `<button class="node-btn upgrade" ${!canAfford2 ? 'disabled' : ''} onclick="EngineSystem.tryUpgrade('${node.id}')">${btnText2}</button><button class="node-btn close" onclick="EngineSystem.closeDetail()">关闭</button>`;
            } else {
                statusEl.textContent = '可解锁'; statusEl.style.color = '#64B4FF';
                costEl.style.display = 'flex';
                // 修复：cost 为 0 时显示"免费"
                const displayCost = node.cost === 0 ? '免费' : node.cost;
                document.getElementById('costValue').textContent = displayCost;
                const canAfford = this.engineTokens >= node.cost;
                const btnText = node.cost === 0 ? '🔓 免费解锁' : `🔓 解锁 (${node.cost} ⚡)`;
                actionsEl.innerHTML = `<button class="node-btn upgrade" ${!canAfford ? 'disabled' : ''} onclick="EngineSystem.tryUpgrade('${node.id}')">${btnText}</button><button class="node-btn close" onclick="EngineSystem.closeDetail()">关闭</button>`;
            }
        } else {
            statusEl.textContent = `未解锁 (需要: ${node.prev.map(pid => this.nodeMap.get(pid)?.name || pid).join(' + ')})`;
            statusEl.style.color = 'rgba(255,255,255,0.4)';
            costEl.style.display = 'none'; challengeEl.style.display = 'none'; musicEl.style.display = 'none';
            this.stopPreviewMusic();
            actionsEl.innerHTML = `<button class="node-btn close" onclick="EngineSystem.closeDetail()">关闭</button>`;
        }
        // 根据缓存的折叠状态设置面板样式（必须在 add('show') 之前完成）
        if (EngineSystem.detailCollapsed) {
            panel.classList.add('collapsed');
            panel.classList.remove('show-full');
        } else {
            panel.classList.remove('collapsed');
            panel.classList.add('show-full');
        }
        // 强制重绘，确保 collapsed/show-full 样式先应用，再触发 show 的显示动画
        void panel.offsetWidth;
        panel.classList.add('show');

        // 绑定关闭叉按钮事件（阻止冒泡到面板）
        const closeBtn = document.getElementById('detailCloseBtn');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                this.closeDetail();
            };
        }

        // 点击面板任意位置（除按钮/交互元素外）触发折叠/展开
        panel.onclick = (e) => {
            if (e.target.closest('button, .music-btn, .node-btn, .detail-toggle-btn, .detail-close-btn, .challenge-bar-wrap, .effect-row')) return;
            this.toggleDetailCollapse();
        };
    },

    tryUpgrade(nodeOrId) {
        const node = (typeof nodeOrId === 'object' && nodeOrId !== null) 
            ? nodeOrId 
            : this.findNode(nodeOrId);

        if (!node) {
            console.warn('tryUpgrade: node not found for', nodeOrId);
            return;
        }

        const isUnlocked = this.unlockedNodes.has(node.id);

        // 修复：只有已解锁且满级时才阻止；未解锁节点始终允许尝试解锁
        if (isUnlocked && node.level >= node.maxLevel) {
            if (typeof UI !== 'undefined') {
                UI.showFloatText(window.innerWidth / 2, window.innerHeight / 2, '该节点已满级!', 'system');
            }
            return;
        }
        const isChallenge = node.type === 'challenge';
        const challengeDone = this.isChallengeCompleted(node);

        if (isChallenge && !challengeDone) {
            if (typeof UI !== 'undefined') {
                UI.showFloatText(window.innerWidth / 2, window.innerHeight / 2, '请先完成挑战!', 'system');
            }
            return;
        }

        const cost = isUnlocked ? node.cost * Math.pow(2, node.level) : node.cost;

        if (this.engineTokens < cost) {
            if (typeof UI !== 'undefined') {
                UI.showFloatText(window.innerWidth / 2, window.innerHeight / 2, '引擎代币不足!', 'system');
            }
            return;
        }

        // 修复：cost 为 0 的核心节点直接解锁，跳过 confirm（APK WebView 中 confirm 可能异常）
        if (cost > 0) {
            if (!confirm(`确定要${isUnlocked ? '升级' : '解锁'} "${node.name}" 吗？\n需要消耗: ${cost.toFixed(2)} 引擎代币`)) return;
        }

        this.engineTokens -= cost;
        this.playUpgradeSound();

        if (!isUnlocked) { 
            this.unlockedNodes.add(node.id); 
            node.level = 1; 
        } else { 
            node.level++; 
        }

        this.saveProgress();
        this.renderGraph();
        this.showNodeDetail(node);

        const tokenDisplay = document.querySelector('.engine-token-amount');
        if (tokenDisplay) tokenDisplay.textContent = this.engineTokens.toFixed(6);

        const actionText = isUnlocked ? '升级' : '解锁';
        const colorType = isChallenge ? 'levelup' : 'gold';

        if (typeof UI !== 'undefined') {
            UI.showFloatText(window.innerWidth / 2, window.innerHeight / 2, `${actionText}成功: ${node.name}!`, colorType);
        }
    },

    clearRouteAnimation() {
        const svg = document.getElementById('treeConnections');
        if (!svg) return;
        svg.querySelectorAll('.tree-link').forEach(p => {
            p.classList.remove('route-flow');
            p.style.animationDelay = '';
            p.setAttribute('marker-end', 'none');
        });
    },

    closeDetail() {
        this.stopPreviewMusic();
        this.clearRouteAnimation();
        const panel = document.getElementById('nodeDetailPanel');
        if (panel) {
            // 先移除 show 触发隐藏动画，同时立即设置 visibility:hidden 避免闪烁
            panel.classList.remove('show');
            // 延迟清理 collapsed/show-full，确保隐藏动画完成后再重置样式
            setTimeout(() => {
                if (!panel.classList.contains('show')) {
                    panel.classList.remove('show-full');
                    panel.classList.remove('collapsed');
                }
            }, 350);
            panel.onclick = null;
        }
        const closeBtn = document.getElementById('detailCloseBtn');
        if (closeBtn) closeBtn.onclick = null;
        this.selectedNode = null;
        // 保留 detailCollapsed 状态，下次打开节点时保持上次的折叠/展开状态
    },

    animateRouteToNode(targetNodeId) {
        const svg = document.getElementById('treeConnections');
        if (!svg) return;

        this.clearRouteAnimation();

        const pathLinks = this.findPathFromRoot(targetNodeId);
        if (pathLinks.length === 0) return;

        let delay = 0;
        pathLinks.forEach(linkId => {
            const path = svg.querySelector(`.tree-link[data-source="${linkId.source}"][data-target="${linkId.target}"]`);
            if (path) {
                path.classList.add('route-flow');
                path.style.animationDelay = `${delay}s`;
                const targetNode = this.nodeMap.get(linkId.target);
                const isChallenge = targetNode && targetNode.type === 'challenge';
                const challengeDone = targetNode && this.isChallengeCompleted(targetNode);
                path.setAttribute('marker-end', (isChallenge && !challengeDone) ? 'url(#arrow-red)' : 'url(#arrow-blue)');
                delay += 0.15;
            }
        });
    },

    findPathFromRoot(targetNodeId) {
        const targetNode = this.nodeMap.get(targetNodeId);
        if (!targetNode) return [];

        const ancestors = new Set();
        const queue = [targetNodeId];
        while (queue.length > 0) {
            const currId = queue.shift();
            const curr = this.nodeMap.get(currId);
            if (!curr || !curr.prev) continue;
            const prevArray = Array.isArray(curr.prev) ? curr.prev : [curr.prev];
            prevArray.forEach(pid => {
                if (!ancestors.has(pid)) { 
                    ancestors.add(pid); 
                    queue.push(pid); 
                }
            });
        }

        const roots = [];
        ancestors.forEach(id => {
            const node = this.nodeMap.get(id);
            if (node && (!node.prev || (Array.isArray(node.prev) && node.prev.length === 0))) {
                roots.push(id);
            }
        });

        if (!targetNode.prev || (Array.isArray(targetNode.prev) && targetNode.prev.length === 0)) {
            if (!roots.includes(targetNodeId)) {
                roots.push(targetNodeId);
            }
        }

        if (roots.length === 0 && targetNode.prev) {
            const prevArray = Array.isArray(targetNode.prev) ? targetNode.prev : [targetNode.prev];
            if (prevArray.length > 0) {
                roots.push(prevArray[0]);
            }
        }

        const allPaths = [];
        for (const rootId of roots) {
            const visited = new Set([rootId]);
            const parentMap = new Map();
            const bfsQueue = [rootId];
            let found = false;

            while (bfsQueue.length > 0 && !found) {
                const currId = bfsQueue.shift();
                const curr = this.nodeMap.get(currId);
                if (!curr || !curr.next) continue;
                for (const nextId of curr.next) {
                    if (!visited.has(nextId)) {
                        visited.add(nextId);
                        parentMap.set(nextId, currId);
                        bfsQueue.push(nextId);
                        if (nextId === targetNodeId) { 
                            found = true; 
                            break; 
                        }
                    }
                }
            }

            if (found) {
                const path = [];
                let curr = targetNodeId;
                while (parentMap.has(curr)) {
                    const parent = parentMap.get(curr);
                    path.unshift({ source: parent, target: curr });
                    curr = parent;
                }
                allPaths.push(...path);
            }
        }

        const seen = new Set();
        const uniquePath = [];
        for (const link of allPaths) {
            const key = link.source + '->' + link.target;
            if (!seen.has(key)) { 
                seen.add(key); 
                uniquePath.push(link); 
            }
        }
        return uniquePath;
    },

    closeEngineModal() {
        this.isOpen = false;
        this.stopPreviewMusic();
        this.clearRouteAnimation();
        if (this.simulation) { this.simulation.stop(); this.simulation = null; }
        if (this._cleanupViewport) { this._cleanupViewport(); this._cleanupViewport = null; }
        const modal = document.getElementById('engineModal');
        if (modal) { modal.classList.remove('show'); setTimeout(() => modal.remove(), 300); }
        this.selectedNode = null;
        this.viewX = 0; this.viewY = 0; this.scale = 1;
    }
});
