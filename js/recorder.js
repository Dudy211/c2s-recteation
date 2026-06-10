const Recorder = {
    // ========== 记录器注册表 ==========
    recorders: new Map(),

    // ========== 初始化 ==========
    init() {
        this.pendingRecords = [];
        this.pendingStates = [];
        this.register('clicks', {
            getValue: () => 1,
            getTarget: (node) => node.challenge?.target || 0,
            checkComplete: (current, target) => current >= target
        });

        this.register('tokens', {
            getValue: (amount) => amount,
            getTarget: (node) => node.challenge?.target || 0,
            checkComplete: (current, target) => current >= target
        });

        this.register('statLevel', {
            getValue: () => 0, // 由外部传入当前值
            getTarget: (node) => node.challenge?.target || 0,
            checkComplete: (current, target) => current >= target
        });

        this.register('moduleLevel', {
            getValue: () => 0, // 由外部传入当前值
            getTarget: (node) => node.challenge?.target || 0,
            checkComplete: (current, target) => current >= target
        });
    },

    // ========== 注册记录器 ==========
    /**
     * @param {string} type - 挑战类型标识
     * @param {Object} handler - 处理器
     * @param {Function} handler.getValue - 获取增量值 (args) => number
     * @param {Function} handler.getTarget - 获取目标值 (node) => number
     * @param {Function} handler.checkComplete - 检查是否完成 (current, target) => boolean
     */
    register(type, handler) {
        this.recorders.set(type, handler);
    },

    // ========== 注销记录器 ==========
    unregister(type) {
        this.recorders.delete(type);
    },

    // ========== 记录事件 ==========
    /**
     * @param {string} type - 挑战类型
     * @param {...any} args - 传递给 getValue 的参数
     * @returns {string[]} - 本次完成的节点ID列表
     */
    record(type, ...args) {
        const completedNodes = [];
        const handler = this.recorders.get(type);
        if (!handler) {
            console.warn(`No recorder registered for type: ${type}`);
            return completedNodes;
        }

        // 修复：APK 环境下引擎可能尚未初始化完成，缓存事件待后续回放
        if (!EngineSystem.graph || !EngineSystem.graph.nodes) {
            this.pendingRecords.push({ type, args });
            return completedNodes;
        }

        const increment = handler.getValue(...args);

        EngineSystem.graph.nodes.forEach(node => {
            if (!node.challenge || node.challenge.type !== type) return;

            // 获取或初始化进度
            if (!EngineSystem.challengeProgress[node.id]) {
                EngineSystem.challengeProgress[node.id] = { current: 0 };
            }

            const progress = EngineSystem.challengeProgress[node.id];
            const target = handler.getTarget(node);

            // 累加进度
            progress.current += increment;

            // 检查完成
            if (handler.checkComplete(progress.current, target)) {
                if (!EngineSystem.challengeCompleted.has(node.id)) {
                    EngineSystem.challengeCompleted.add(node.id);
                    completedNodes.push(node.id);
                }
            }
        });

        // 如果有节点完成，保存进度
        if (completedNodes.length > 0) {
            EngineSystem.saveProgress();
        }

        return completedNodes;
    },

    // ========== 批量记录（用于外部状态同步）==========
    /**
     * 直接传入当前值，而非增量（适用于 statLevel / moduleLevel 等状态型挑战）
     * @param {string} type - 挑战类型
     * @param {number} currentValue - 当前值
     */
    recordState(type, currentValue) {
        const completedNodes = [];
        const handler = this.recorders.get(type);
        if (!handler) return completedNodes;

        // 修复：APK 环境下引擎可能尚未初始化完成，缓存状态待后续回放
        if (!EngineSystem.graph || !EngineSystem.graph.nodes) {
            this.pendingStates.push({ type, currentValue });
            return completedNodes;
        }

        EngineSystem.graph.nodes.forEach(node => {
            if (!node.challenge || node.challenge.type !== type) return;

            if (!EngineSystem.challengeProgress[node.id]) {
                EngineSystem.challengeProgress[node.id] = { current: 0 };
            }

            const progress = EngineSystem.challengeProgress[node.id];
            const target = handler.getTarget(node);

            // 直接设置当前值（取最大值，防止回退）
            progress.current = Math.max(progress.current, currentValue);

            if (handler.checkComplete(progress.current, target)) {
                if (!EngineSystem.challengeCompleted.has(node.id)) {
                    EngineSystem.challengeCompleted.add(node.id);
                    completedNodes.push(node.id);
                }
            }
        });

        if (completedNodes.length > 0) {
            EngineSystem.saveProgress();
        }

        return completedNodes;
    },

    // ========== 获取进度 ==========
    getProgress(nodeId) {
        const node = EngineSystem.findNode(nodeId);
        if (!node || !node.challenge) return null;

        const handler = this.recorders.get(node.challenge.type);
        if (!handler) return null;

        const progress = EngineSystem.challengeProgress[nodeId];
        const current = progress ? progress.current : 0;
        const target = handler.getTarget(node);

        return {
            current,
            target,
            percent: Math.min(100, (current / target) * 100),
            completed: EngineSystem.challengeCompleted.has(nodeId)
        };
    },

    // ========== 重置进度（调试用）==========
    reset(type) {
        if (!EngineSystem.graph || !EngineSystem.graph.nodes) return;

        EngineSystem.graph.nodes.forEach(node => {
            if (node.challenge && node.challenge.type === type) {
                delete EngineSystem.challengeProgress[node.id];
                EngineSystem.challengeCompleted.delete(node.id);
            }
        });
        EngineSystem.saveProgress();
    },

    resetAll() {
        EngineSystem.challengeProgress = {};
        EngineSystem.challengeCompleted.clear();
        EngineSystem.saveProgress();
    },

    // 修复：APK 环境下引擎初始化完成后，回放缓存的挑战事件
    flushPending() {
        if (!EngineSystem.graph || !EngineSystem.graph.nodes) return;
        const records = [...this.pendingRecords];
        this.pendingRecords = [];
        records.forEach(({ type, args }) => {
            this.record(type, ...args);
        });
        const states = [...this.pendingStates];
        this.pendingStates = [];
        states.forEach(({ type, currentValue }) => {
            this.recordState(type, currentValue);
        });
    }
};
