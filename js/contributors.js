const Contributors = {
    // 贡献者数据 - 在这里添加你的名字和联系方式
    list: [
        {
            name: 'VII',
            role: '创始人/主程序',
            qq: '3825731224',
            github: 'Dudy211'
        },
        {
            name: 'Semblance',
            role: '最初灵感提供',
            qq: '1040248317',
            github: ''
        },
        {
            name: 'Kimi',
            role: 'AI美术设计',
            qq: '',
            github: ''
        }
        // 在这里继续添加更多贡献者
    ],

    init() {
        this.injectButton();
    },

    injectButton() {
        // 避免重复创建
        if (document.getElementById('contributorsBtn')) return;

        const sideMenu = document.getElementById('sideMenu');
        if (!sideMenu) {
            console.error('sideMenu not found');
            return;
        }

        // 在版本信息之前插入
        const versionInfo = sideMenu.querySelector('.version-info');

        const section = document.createElement('div');
        section.className = 'menu-section contributors-btn-section';
        section.innerHTML = `
            <div class="menu-title">团队</div>
            <button id="contributorsBtn" class="link-btn">
                <span>👥</span> 贡献者列表
            </button>
        `;

        const btn = section.querySelector('#contributorsBtn');
        btn.onclick = () => this.openModal();

        if (versionInfo) {
            sideMenu.insertBefore(section, versionInfo);
        } else {
            sideMenu.appendChild(section);
        }
    },

    openModal() {
        // 关闭侧边菜单
        if (Menu.open) Menu.toggle();

        let modal = document.getElementById('contributorsModal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'contributorsModal';
        modal.className = 'contributors-modal';

        modal.innerHTML = `
            <div class="contributors-modal-overlay" onclick="Contributors.closeModal()"></div>
            <div class="contributors-modal-content">
                <div class="contributors-modal-header">
                    <h2>👥 贡献者</h2>
                    <button class="contributors-modal-close" onclick="Contributors.closeModal()">✕</button>
                </div>
                
                <div class="contributors-count">
                    共 ${this.list.length} 位贡献者
                </div>
                
                <div class="contributors-list-full">
                    ${this.renderContributors()}
                </div>
                
                <div class="contributors-footer">
                    <p>感谢所有为这个项目付出的人</p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    },

    renderContributors() {
        return this.list.map((person, index) => `
            <div class="contributor-card" style="animation-delay: ${index * 0.05}s">
                <div class="contributor-number">#${index + 1}</div>
                <div class="contributor-main">
                    <div class="contributor-name-full">${person.name}</div>
                    <div class="contributor-role-full">${person.role}</div>
                </div>
                <div class="contributor-contact">
                    ${person.qq ? `
                        <div class="contact-row">
                            <span class="contact-label-mini">QQ</span>
                            <span class="contact-value-mini">${person.qq}</span>
                        </div>
                    ` : ''}
                    ${person.github ? `
                        <div class="contact-row">
                            <span class="contact-label-mini">GitHub</span>
                            <span class="contact-value-mini">@${person.github}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    },

    closeModal() {
        const modal = document.getElementById('contributorsModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    }
};