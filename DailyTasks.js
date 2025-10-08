const STORAGE_KEY = 'dailyTasks';
const THEME_KEY = 'appTheme';
const BG_KEY = 'customBg';
const COUNTDOWN_KEY = 'countdownData';
const RINGS_KEY = 'ringsData';
const HISTORY_KEY = 'taskHistory';
const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';
const PRESET_KEY = 'presetTasks';
const LAST_ACTIVE_DATE_KEY = 'lastActiveDate';
const RIGHTBAR_COLLAPSED_KEY = 'presetCollapsed';

const DEFAULT_RING_VALUE = 10;
const RING_TARGET = 30;
const RING_LABELS = {
    health: '健康',
    knowledge: '知识',
    exp: '经验'
};

const EMOJI_PRESETS = [
    { emoji: '🏃', keywords: ['运动', '跑步', '健身', '健康', 'morning run'] },
    { emoji: '🧘', keywords: ['冥想', '放松', '瑜伽', 'breath'] },
    { emoji: '💪', keywords: ['力量', '训练', '举铁', '健身房'] },
    { emoji: '🥗', keywords: ['饮食', '蔬菜', '沙拉', '健康餐'] },
    { emoji: '💧', keywords: ['喝水', '补水', '健康'] },
    { emoji: '📚', keywords: ['阅读', '学习', '知识', 'book'] },
    { emoji: '🧠', keywords: ['思考', '脑力', '知识', '专注'] },
    { emoji: '💻', keywords: ['编程', '电脑', '工作', 'coding'] },
    { emoji: '📝', keywords: ['写作', '笔记', '计划', '记录'] },
    { emoji: '🎧', keywords: ['听书', '音乐', '放松', 'podcast'] },
    { emoji: '🎯', keywords: ['目标', '计划', '打卡', '专注'] },
    { emoji: '🌅', keywords: ['清晨', '早起', '日出', '冥想'] },
    { emoji: '🌙', keywords: ['夜晚', '睡眠', '放松', 'sleep'] },
    { emoji: '🚶', keywords: ['散步', '步行', '健康'] },
    { emoji: '🚴', keywords: ['骑行', '运动', '健康'] },
    { emoji: '🧩', keywords: ['思维', '挑战', '益智'] },
    { emoji: '📈', keywords: ['成长', '进步', '总结'] },
    { emoji: '🧪', keywords: ['实验', '科学', '研究'] },
    { emoji: '🎮', keywords: ['游戏', '放松', '娱乐'] },
    { emoji: '🎹', keywords: ['音乐', '钢琴', '练习'] },
    { emoji: '🧺', keywords: ['家务', '整理', '收纳'] },
    { emoji: '🌱', keywords: ['成长', '植物', '关怀'] },
    { emoji: '🤝', keywords: ['合作', '会议', '沟通'] },
    { emoji: '🛏️', keywords: ['休息', '睡觉', '恢复'] }
];

function getDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTodayKey() {
    return getDateKey(new Date());
}

function ensureDateCollection(dateKey) {
    if (!tasksByDate[dateKey]) {
        tasksByDate[dateKey] = [];
    }
    return tasksByDate[dateKey];
}

function cloneTaskForNewDay(task) {
    const sourceId = task.carryOverId || task.id;
    return {
        ...task,
        id: Date.now() + Math.floor(Math.random() * 10000),
        completed: false,
        carryOverId: sourceId
    };
}

function checkDailyRollover(now = new Date()) {
    const currentKey = getDateKey(now);
    if (currentKey === lastSystemDateKey) {
        return;
    }

    const previousKey = lastSystemDateKey;
    lastSystemDateKey = currentKey;

    if (tasksByDate[previousKey]) {
        saveData(previousKey);
    }

    const carryOverSource = tasksByDate[previousKey] || [];
    const lockedCarry = carryOverSource
        .filter(task => task.locked)
        .map(task => cloneTaskForNewDay(task));

    const todaysTasks = ensureDateCollection(currentKey);
    if (lockedCarry.length > 0) {
        const existingCarryIds = new Set(
            todaysTasks
                .filter(task => task.carryOverId)
                .map(task => task.carryOverId)
        );
        const toAppend = lockedCarry.filter(task => !existingCarryIds.has(task.carryOverId));
        todaysTasks.push(...toAppend);
    }

    setActiveDate(currentKey);
    saveData(currentKey);
    renderCalendar();
}

function setActiveDate(dateKey, options = {}) {
    selectedDateKey = dateKey;
    tasks = ensureDateCollection(dateKey);
    localStorage.setItem(LAST_ACTIVE_DATE_KEY, selectedDateKey);
    addModalTargetDate = selectedDateKey;

    const dateObj = new Date(dateKey);
    if (!Number.isNaN(dateObj.getTime())) {
        currentMonth = dateObj.getMonth();
        currentYear = dateObj.getFullYear();
    }

    if (!options.skipRender) {
        renderTasks();
        updateRings();
        updateTaskDateIndicator();
    }
}

function updateTaskDateIndicator() {
    const indicator = document.getElementById('activeTaskDate');
    if (!indicator) return;

    const label = formatDateLabel(selectedDateKey, { includeYear: false });

    const todayKey = getTodayKey();
    indicator.textContent = selectedDateKey === todayKey
        ? `今日任务 · ${label}`
        : `任务日期：${label}`;

    const backTodayBtn = document.getElementById('backToToday');
    if (backTodayBtn) {
        backTodayBtn.style.display = selectedDateKey === todayKey ? 'none' : 'inline-flex';
    }
}

function formatDateLabel(dateKey, options = {}) {
    if (!dateKey) return '';
    const date = new Date(dateKey);
    const formatterOptions = options.includeYear === false
        ? { month: 'long', day: 'numeric', weekday: 'long' }
        : { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    return date.toLocaleDateString('zh-CN', formatterOptions);
}

function updateTaskStats() {
    const statsEl = document.getElementById('taskStats');
    if (!statsEl) return;

    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const locked = tasks.filter(t => t.locked).length;

    statsEl.textContent = `共 ${total} 项 · 已完成 ${completed} · 锁定 ${locked}`;
}

let tasksByDate = {};
let presetTasks = [];
let selectedDateKey = getTodayKey();
let tasks = [];
let currentPage = 'home';
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let lastSystemDateKey = getTodayKey();
let addModalMode = 'task';
let addModalTargetDate = selectedDateKey;
let confirmDialogResolver = null;

function formatReward(rings, ringValue) {
    if (!Array.isArray(rings) || rings.length === 0) {
        return '完成任务';
    }
    const value = Number.isFinite(ringValue) && ringValue > 0 ? ringValue : DEFAULT_RING_VALUE;
    return rings
        .filter(type => RING_LABELS[type])
        .map(type => `${RING_LABELS[type]} +${value}`)
        .join(' | ');
}

function normalizeTask(task) {
    const normalized = { ...task };

    let ringValue = Number(normalized.ringValue);
    if (!Number.isFinite(ringValue) || ringValue <= 0) {
        if (typeof normalized.reward === 'string') {
            const rewardValueMatch = normalized.reward.match(/(\d+)(?!.*\d)/);
            ringValue = rewardValueMatch ? parseInt(rewardValueMatch[1], 10) : DEFAULT_RING_VALUE;
        } else {
            ringValue = DEFAULT_RING_VALUE;
        }
    }
    normalized.ringValue = Math.min(Math.max(Math.round(ringValue), 1), RING_TARGET);

    if (!Array.isArray(normalized.rings)) {
        normalized.rings = [];
        if (typeof normalized.reward === 'string') {
            Object.entries(RING_LABELS).forEach(([key, label]) => {
                if (normalized.reward.includes(label)) {
                    normalized.rings.push(key);
                }
            });
        }
    }

    normalized.rings = Array.from(new Set(normalized.rings.filter(type => RING_LABELS[type])));
    if (normalized.rings.length === 0) {
        normalized.rings = ['health'];
    }

    if (!normalized.icon) {
        normalized.icon = '📝';
    }

    if (typeof normalized.title === 'string') {
        normalized.title = normalized.title.trim();
    }

    if (typeof normalized.description === 'string') {
        normalized.description = normalized.description.trim();
    }

    if (!normalized.title) {
        normalized.title = '未命名任务';
    }

    if (!normalized.description) {
        normalized.description = '暂无描述';
    }

    normalized.completed = normalized.completed === true;
    normalized.locked = normalized.locked === true;

    normalized.reward = formatReward(normalized.rings, normalized.ringValue);

    return normalized;
}

function buildRingBadgesMarkup(task) {
    if (!Array.isArray(task.rings) || task.rings.length === 0) {
        return '';
    }

    return task.rings
        .filter(type => RING_LABELS[type])
        .map(type => `<span class="ring-badge ${type}">${RING_LABELS[type]} +${task.ringValue}</span>`)
        .join('');
}

// 初始化
function init() {
    loadData();
    initSidebarToggle();
    initPresetSidebar();
    initEmojiAssistant();
    renderPresetTasks();
    renderTasks();
    updateTaskDateIndicator();
    updateTaskStats();
    updateDateTime();
    updateCountdown();
    updateRings();
    setInterval(updateDateTime, 1000);
    setInterval(updateCountdown, 60000);
}

function loadData() {
    const todayKey = getTodayKey();
    const saved = localStorage.getItem(STORAGE_KEY);
    tasksByDate = {};

    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                tasksByDate[todayKey] = parsed.map(normalizeTask);
            } else if (parsed && typeof parsed === 'object') {
                Object.entries(parsed).forEach(([dateKey, list]) => {
                    if (Array.isArray(list)) {
                        tasksByDate[dateKey] = list.map(normalizeTask);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to parse tasks data:', error);
        }
    }

    if (!Object.keys(tasksByDate).length) {
        tasksByDate[todayKey] = [
            {
                id: Date.now() + 1,
                title: '晨跑30分钟',
                description: '在公园或跑步机上完成30分钟有氧运动',
                icon: '🏃',
                completed: false,
                rings: ['health'],
                ringValue: 10,
                time: '07:00 - 07:30',
                mood: '💪😊🔥',
                locked: false
            },
            {
                id: Date.now() + 2,
                title: '阅读技术文章',
                description: '阅读至少一篇前端开发相关的技术文章',
                icon: '📚',
                completed: false,
                rings: ['knowledge'],
                ringValue: 10,
                time: '09:00 - 09:30',
                mood: '🧠💡📖',
                locked: false
            },
            {
                id: Date.now() + 3,
                title: '学习新技能',
                description: '花费1小时学习新的编程技术或框架',
                icon: '💻',
                completed: false,
                rings: ['exp'],
                ringValue: 10,
                time: '14:00 - 15:00',
                mood: '🚀✨🎯',
                locked: false
            }
        ].map(normalizeTask);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksByDate));
    }

    const lastActive = localStorage.getItem(LAST_ACTIVE_DATE_KEY);
    if (lastActive && lastActive !== todayKey && tasksByDate[lastActive]) {
        const carryOver = tasksByDate[lastActive]
            .filter(task => task.locked)
            .map(task => cloneTaskForNewDay(task));

        const todaysTasks = ensureDateCollection(todayKey);
        if (carryOver.length) {
            const existingCarryIds = new Set(
                todaysTasks
                    .filter(task => task.carryOverId)
                    .map(task => task.carryOverId)
            );
            const toAppend = carryOver.filter(task => !existingCarryIds.has(task.carryOverId));
            todaysTasks.push(...toAppend);
        }

        selectedDateKey = todayKey;
        saveData(lastActive);
        saveData(todayKey);
    } else if (lastActive && tasksByDate[lastActive]) {
        selectedDateKey = lastActive;
    } else {
        selectedDateKey = todayKey;
    }

    setActiveDate(selectedDateKey, { skipRender: true });
    addModalTargetDate = selectedDateKey;
    lastSystemDateKey = todayKey;

    const savedPresets = localStorage.getItem(PRESET_KEY);
    if (savedPresets) {
        try {
            const parsedPresets = JSON.parse(savedPresets);
            presetTasks = Array.isArray(parsedPresets) ? parsedPresets.map(normalizeTask) : [];
        } catch (error) {
            console.error('Failed to parse preset tasks:', error);
            presetTasks = [];
        }
    } else {
        presetTasks = [];
    }

    const theme = localStorage.getItem(THEME_KEY);
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    }

    const bgData = localStorage.getItem(BG_KEY);
    if (bgData) {
        const bgImg = document.getElementById('bg-image');
        bgImg.src = bgData;
        bgImg.classList.add('active');
    }
}

function initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebarToggle');
    if (!toggleBtn) {
        return;
    }

    toggleBtn.addEventListener('click', () => {
        const collapsed = !document.body.classList.contains('sidebar-collapsed');
        applySidebarState(collapsed);
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
    });

    const savedState = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    const shouldCollapse = savedState === '1';
    applySidebarState(shouldCollapse);
}

function applySidebarState(collapsed) {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    const toggleBtn = document.getElementById('sidebarToggle');
    if (toggleBtn) {
        toggleBtn.textContent = collapsed ? '⟩' : '⟨';
        toggleBtn.setAttribute('aria-label', collapsed ? '展开侧边栏' : '折叠侧边栏');
    }
}

function initPresetSidebar() {
    const toggleBtn = document.getElementById('presetToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const collapsed = !document.body.classList.contains('preset-collapsed');
            applyPresetSidebarState(collapsed);
            localStorage.setItem(RIGHTBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
        });
    }

    const savedState = localStorage.getItem(RIGHTBAR_COLLAPSED_KEY);
    applyPresetSidebarState(savedState === '1');
}

function applyPresetSidebarState(collapsed) {
    document.body.classList.toggle('preset-collapsed', collapsed);
    const toggleBtn = document.getElementById('presetToggle');
    if (toggleBtn) {
        toggleBtn.textContent = collapsed ? '⟨' : '⟩';
        toggleBtn.setAttribute('aria-label', collapsed ? '展开预设栏' : '折叠预设栏');
    }
}

function initEmojiAssistant() {
    const iconInput = document.getElementById('taskIcon');
    const listEl = document.getElementById('emojiSuggestions');
    const shuffleBtn = document.getElementById('emojiShuffle');

    if (!iconInput || !listEl) {
        return;
    }

    const renderSuggestions = (entries) => {
        const slice = entries.slice(0, 12);
        listEl.innerHTML = slice
            .map(item => `<button type="button" class="emoji-suggestion" data-value="${item.emoji}" title="${item.keywords[0] || 'emoji'}">${item.emoji}</button>`)
            .join('');
    };

    const shuffleSuggestions = () => {
        const shuffled = [...EMOJI_PRESETS]
            .sort(() => Math.random() - 0.5);
        renderSuggestions(shuffled);
    };

    renderSuggestions(EMOJI_PRESETS);

    listEl.addEventListener('click', (event) => {
        const target = event.target.closest('.emoji-suggestion');
        if (!target) return;
        iconInput.value = target.dataset.value;
        iconInput.focus();
    });

    let debounceTimer = null;
    iconInput.addEventListener('input', (event) => {
        const value = event.target.value.trim().toLowerCase();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (!value) {
                shuffleSuggestions();
                return;
            }

            const matches = EMOJI_PRESETS.filter(item => {
                if (item.emoji.toLowerCase().includes(value)) {
                    return true;
                }
                return item.keywords.some(keyword => keyword.toLowerCase().includes(value));
            });

            if (matches.length > 0) {
                renderSuggestions(matches);
            } else {
                shuffleSuggestions();
            }
        }, 160);
    });

    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            shuffleSuggestions();
            shuffleBtn.classList.add('spinning');
            setTimeout(() => shuffleBtn.classList.remove('spinning'), 400);
        });
    }
}

function saveData(targetDateKey = selectedDateKey) {
    const normalizedList = ensureDateCollection(targetDateKey).map(normalizeTask);
    tasksByDate[targetDateKey] = normalizedList;
    if (targetDateKey === selectedDateKey) {
        tasks = normalizedList;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksByDate));
    localStorage.setItem(LAST_ACTIVE_DATE_KEY, selectedDateKey);
    updateHistoryForDate(targetDateKey);
}

function updateHistoryForDate(dateKey) {
    if (!dateKey) return;
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    const taskList = ensureDateCollection(dateKey);
    const completedTasks = taskList.filter(t => t.completed).length;
    const totalTasks = taskList.length;
    const rings = getRingsData(taskList);

    history[dateKey] = {
        completed: completedTasks,
        total: totalTasks,
        rings
    };

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function savePresetTasks() {
    presetTasks = presetTasks.map(task => {
        const normalized = normalizeTask(task);
        normalized.completed = false;
        return { ...normalized, locked: normalized.locked === true };
    });
    localStorage.setItem(PRESET_KEY, JSON.stringify(presetTasks));
}

function renderPresetTasks() {
    const container = document.getElementById('presetList');
    if (!container) return;

    if (!presetTasks.length) {
        container.innerHTML = `<div class="preset-empty">暂无预设任务，点击上方按钮添加。</div>`;
        return;
    }

    container.innerHTML = '';

    presetTasks.forEach(preset => {
        const card = document.createElement('div');
        card.className = 'preset-card';
        card.dataset.presetId = preset.id;
        const badges = buildRingBadgesMarkup(preset);
        card.innerHTML = `
            <div class="preset-card-main">
                <div class="preset-icon">${preset.icon || '📝'}</div>
                <div class="preset-info">
                    <div class="preset-card-title">${preset.title}</div>
                    <div class="preset-card-desc">${preset.description || ''}</div>
                    ${badges ? `<div class="preset-badges">${badges}</div>` : ''}
                </div>
            </div>
            <div class="preset-actions">
                <button type="button" class="preset-apply" data-preset-id="${preset.id}">添加</button>
                <button type="button" class="preset-delete" data-preset-id="${preset.id}">删除</button>
            </div>
        `;

        container.appendChild(card);
    });

    container.querySelectorAll('.preset-card').forEach(card => {
        card.addEventListener('click', (event) => {
            const target = event.target;
            if (target.closest('.preset-delete')) {
                return;
            }
            const id = Number(card.dataset.presetId);
            applyPresetToDate(id);
        });
    });

    container.querySelectorAll('.preset-apply').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const id = Number(event.currentTarget.dataset.presetId);
            applyPresetToDate(id);
        });
    });

    container.querySelectorAll('.preset-delete').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const id = Number(event.currentTarget.dataset.presetId);
            deletePresetTask(id);
        });
    });
}

function applyPresetToDate(presetId, dateKey = selectedDateKey) {
    const preset = presetTasks.find(item => item.id === presetId);
    if (!preset) return;

    const targetDate = dateKey || selectedDateKey;
    const taskList = ensureDateCollection(targetDate);
    const newTask = normalizeTask({
        ...preset,
        id: Date.now() + Math.floor(Math.random() * 1000),
        completed: false,
        locked: false
    });

    taskList.push(newTask);
    saveData(targetDate);

    if (targetDate === selectedDateKey) {
        renderTasks();
        updateRings();
    }

    renderCalendar();
}

function deletePresetTask(presetId) {
    presetTasks = presetTasks.filter(item => item.id !== presetId);
    savePresetTasks();
    renderPresetTasks();
}

function renderTasks() {
    const grid = document.getElementById('tasksGrid');
    grid.innerHTML = '';

    tasks.forEach(task => {
        const wrapper = document.createElement('div');
        wrapper.className = 'task-card-wrapper';

        const ringBadgesMarkup = buildRingBadgesMarkup(task);
        const ringBadgesBlock = ringBadgesMarkup ? `<div class="ring-badges">${ringBadgesMarkup}</div>` : '';

        const cardClasses = ['task-card'];
        if (task.completed) cardClasses.push('completed');
        if (task.locked) cardClasses.push('locked');

        wrapper.innerHTML = `
            <div class="${cardClasses.join(' ')}" id="card-${task.id}">
                <div class="card-face card-front">
                    <div class="card-header">
                        <div class="task-title">${task.title}</div>
                        <div class="card-header-actions">
                            <button class="lock-btn${task.locked ? ' locked' : ''}" data-task-id="${task.id}" title="${task.locked ? '点击解锁' : '点击锁定，跨日保留任务'}">
                                ${task.locked ? '🔒' : '🔓'}
                            </button>
                            <button class="delete-icon-btn" data-task-id="${task.id}" title="删除任务">🗑️</button>
                        </div>
                    </div>
                    <div class="task-icon">${task.icon || '📝'}</div>
                    <div class="task-description">${task.description || '暂无描述'}</div>
                    ${ringBadgesBlock}
                    <div class="card-footer">
                        <span class="status-badge status-incomplete">
                            ${task.locked ? '🔒 已锁定' : '○ 未完成'}
                        </span>
                    </div>
                </div>
                <div class="card-face card-back">
                    <div class="card-header">
                        <div class="task-title">${task.title}</div>
                        <div class="card-header-actions">
                            <button class="lock-btn${task.locked ? ' locked' : ''}" data-task-id="${task.id}" title="${task.locked ? '点击解锁' : '点击锁定，跨日保留任务'}">
                                ${task.locked ? '🔒' : '🔓'}
                            </button>
                            <button class="undo-btn" data-task-id="${task.id}" title="撤销到未完成">↺ 撤销</button>
                        </div>
                    </div>
                    <div class="card-back-content">
                        <div class="info-row">
                            <span class="info-label">📝 描述</span>
                            <span class="info-value">${task.description || '暂无描述'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">🎁 奖励</span>
                            <span class="info-value">${task.reward || '完成任务'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">⏰ 时间</span>
                            <span class="info-value">${task.time || '随时进行'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">😊 心情</span>
                            <span class="mood-icons">${task.mood || '😊'}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="delete-btn" data-task-id="${task.id}">删除任务</button>
                        <span class="status-badge status-complete">
                            ✓ 已完成
                        </span>
                    </div>
                </div>
            </div>
        `;

        grid.appendChild(wrapper);

        const card = document.getElementById(`card-${task.id}`);
        if (task.completed) {
            card.classList.add('flipped');
        } else {
            card.addEventListener('click', () => {
                if (card.classList.contains('animating')) return;
                card.classList.add('flipped', 'animating');
                setTimeout(() => {
                    completeTask(task.id);
                    card.classList.remove('animating');
                }, 350);
            });
        }

        const undoBtn = wrapper.querySelector('.undo-btn');
        if (undoBtn) {
            undoBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                const { taskId } = event.currentTarget.dataset;
                undoTask(Number(taskId));
            });
        }

        wrapper.querySelectorAll('.lock-btn').forEach(lockBtn => {
            lockBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                const { taskId } = event.currentTarget.dataset;
                toggleTaskLock(Number(taskId));
            });
        });

        const deleteButtons = wrapper.querySelectorAll('.delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                const { taskId } = event.currentTarget.dataset;
                deleteTask(Number(taskId));
            });
        });

        const deleteIconBtn = wrapper.querySelector('.delete-icon-btn');
        if (deleteIconBtn) {
            deleteIconBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                const { taskId } = event.currentTarget.dataset;
                deleteTask(Number(taskId));
            });
        }
    });

    updateTaskStats();
    updateTaskDateIndicator();
}

function completeTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task || task.completed) {
        return;
    }

    task.completed = true;
    const taskId = task.id;
    saveData();
    renderTasks();
    updateRings();
    triggerCelebration(taskId);
}

function undoTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task || !task.completed) {
        return;
    }

    task.completed = false;
    saveData();
    renderTasks();
    updateRings();
}

function toggleTaskLock(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) {
        return;
    }

    task.locked = !task.locked;
    saveData();
    renderTasks();
}

function triggerCelebration(taskId) {
    const card = document.getElementById(`card-${taskId}`);
    if (card) {
        card.classList.add('celebrate');
        setTimeout(() => card.classList.remove('celebrate'), 1200);
    }

    if (typeof confetti === 'function') {
        const duration = 1200;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 35, spread: 360, ticks: 60, zIndex: 2000 };

        const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                clearInterval(interval);
                return;
            }

            const particleCount = 25 * (timeLeft / duration);
            confetti({
                ...defaults,
                particleCount,
                origin: { x: Math.random(), y: Math.random() * 0.3 }
            });
        }, 200);
    }
}

async function deleteTask(id) {
    const confirmed = await showConfirmDialog('确定要删除这个任务吗？');
    if (!confirmed) {
        return;
    }

    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
        tasks.splice(index, 1);
        saveData();
        renderTasks();
        updateRings();
    }
}

// 日期时间更新
function updateDateTime() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateStr = now.toLocaleDateString('zh-CN', options);
    document.getElementById('currentDate').textContent = dateStr;

    const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('currentTime').textContent = timeStr;

    checkDailyRollover(now);
}

// 倒计时功能
function updateCountdown() {
    const countdownData = JSON.parse(localStorage.getItem(COUNTDOWN_KEY) || 'null');
    if (!countdownData) {
        document.getElementById('countdownValue').textContent = '未设置';
        return;
    }

    const targetDate = new Date(countdownData.date);
    const now = new Date();
    const diff = targetDate - now;

    if (diff <= 0) {
        document.getElementById('countdownValue').textContent = '已到达！';
        document.getElementById('countdownLabel').innerHTML = `⏳ ${countdownData.name}`;
        return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    document.getElementById('countdownLabel').innerHTML = `⏳ ${countdownData.name}`;
    document.getElementById('countdownValue').textContent = `${days}天 ${hours}小时`;
}

function openCountdownModal() {
    document.getElementById('countdownModal').classList.add('active');
    const countdownData = JSON.parse(localStorage.getItem(COUNTDOWN_KEY) || 'null');
    if (countdownData) {
        document.getElementById('countdownEventName').value = countdownData.name;
        document.getElementById('countdownDate').value = countdownData.date;
    }
}

function closeCountdownModal() {
    document.getElementById('countdownModal').classList.remove('active');
    document.getElementById('countdownForm').reset();
}

document.getElementById('countdownForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const countdownData = {
        name: document.getElementById('countdownEventName').value,
        date: document.getElementById('countdownDate').value
    };
    localStorage.setItem(COUNTDOWN_KEY, JSON.stringify(countdownData));
    updateCountdown();
    closeCountdownModal();
});

// 三环功能
function getRingsData(taskList = tasks) {
    return taskList.reduce((acc, task) => {
        if (!task.completed) {
            return acc;
        }

        const increment = Number(task.ringValue);
        const value = Number.isFinite(increment) && increment > 0 ? increment : DEFAULT_RING_VALUE;

        if (Array.isArray(task.rings)) {
            task.rings.forEach(type => {
                if (Object.prototype.hasOwnProperty.call(acc, type)) {
                    acc[type] += value;
                }
            });
        }

        return acc;
    }, { health: 0, knowledge: 0, exp: 0 });
}

function updateRings() {
    const rings = getRingsData();
    const totalCapped = ['health', 'knowledge', 'exp']
        .map(type => Math.min(rings[type], RING_TARGET))
        .reduce((sum, value) => sum + value, 0);
    const percent = Math.round((totalCapped / (RING_TARGET * 3)) * 100);
    const ringsSummary = document.getElementById('ringsSummary');
    if (ringsSummary) {
        ringsSummary.textContent = `${percent}%`;
    }

    updateRing('healthRing', 'healthValue', rings.health, RING_TARGET);
    updateRing('knowledgeRing', 'knowledgeValue', rings.knowledge, RING_TARGET);
    updateRing('expRing', 'expValue', rings.exp, RING_TARGET);
}

function updateRing(ringId, valueId, value, max) {
    const ring = document.getElementById(ringId);
    const valueEl = document.getElementById(valueId);

    if (!ring || !valueEl) {
        return;
    }

    const radius = ring.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    const cappedValue = Math.min(value, max);
    const percent = Math.min(cappedValue / max, 1);
    const offset = circumference * (1 - percent);

    ring.style.strokeDasharray = `${circumference} ${circumference}`;

    if (!ring.dataset.initialized) {
        ring.style.strokeDashoffset = circumference;
        ring.dataset.initialized = 'true';
        requestAnimationFrame(() => {
            ring.style.strokeDashoffset = offset;
        });
    } else {
        ring.style.strokeDashoffset = offset;
    }

    ring.dataset.offset = offset;

    const extra = value - max;
    let displayText = `${Math.round(cappedValue)} / ${max}`;
    if (extra > 0) {
        displayText += ` (+${Math.round(extra)})`;
    }
    if (cappedValue >= max) {
        displayText += ' ✅';
    }
    valueEl.textContent = displayText;
}

function showRings() {
    document.getElementById('ringsPage').classList.add('active');
    setTimeout(updateRings, 100);
}

function hideRings() {
    document.getElementById('ringsPage').classList.remove('active');
}

// 页面切换
function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    if (pageName === 'home') {
        document.getElementById('homePage').classList.add('active');
        document.querySelector('.nav-item').classList.add('active');
    } else if (pageName === 'calendar') {
        document.getElementById('calendarPage').classList.add('active');
        document.querySelectorAll('.nav-item')[1].classList.add('active');
        renderCalendar();
    }

    currentPage = pageName;
}

// 日历功能
function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const prevLastDay = new Date(currentYear, currentMonth, 0);

    const firstDayOfWeek = firstDay.getDay();
    const lastDate = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();

    document.getElementById('calendarTitle').textContent = 
        `${currentYear}年 ${currentMonth + 1}月`;

    const daysContainer = document.getElementById('calendarDays');
    daysContainer.innerHTML = '';

    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    const today = new Date();

    // 上月日期
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevLastDate - i;
        const dateObj = new Date(currentYear, currentMonth - 1, day);
        const dateKey = getDateKey(dateObj);
        const cell = createDayCell(day, true, dateKey, null);
        daysContainer.appendChild(cell);
    }

    // 本月日期
    for (let day = 1; day <= lastDate; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = today.getDate() === day && 
                       today.getMonth() === currentMonth && 
                       today.getFullYear() === currentYear;
        const dayData = history[dateStr];
        const isSelected = dateStr === selectedDateKey;
        const cell = createDayCell(day, false, dateStr, dayData, isToday, isSelected);
        daysContainer.appendChild(cell);
    }

    // 下月日期
    const totalCells = daysContainer.children.length;
    const remainingCells = 42 - totalCells; // 6行 x 7列
    for (let day = 1; day <= remainingCells; day++) {
        const dateObj = new Date(currentYear, currentMonth + 1, day);
        const dateKey = getDateKey(dateObj);
        const cell = createDayCell(day, true, dateKey, null);
        daysContainer.appendChild(cell);
    }
}

function createDayCell(day, otherMonth, dateKey, dayData, isToday = false, isSelected = false) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (otherMonth) cell.classList.add('other-month');
    if (isToday) cell.classList.add('today');
    if (isSelected) cell.classList.add('selected');

    if (dateKey) {
        cell.dataset.date = dateKey;
    }

    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);

    if (dayData && !otherMonth) {
        const taskInfo = document.createElement('div');
        taskInfo.className = 'day-tasks';
        taskInfo.textContent = `${dayData.completed}/${dayData.total} 完成`;
        cell.appendChild(taskInfo);

        if (dayData.rings) {
            const ringsDiv = document.createElement('div');
            ringsDiv.className = 'day-rings';
            if (dayData.rings.health > 0) {
                const ring = document.createElement('div');
                ring.className = 'mini-ring health';
                ringsDiv.appendChild(ring);
            }
            if (dayData.rings.knowledge > 0) {
                const ring = document.createElement('div');
                ring.className = 'mini-ring knowledge';
                ringsDiv.appendChild(ring);
            }
            if (dayData.rings.exp > 0) {
                const ring = document.createElement('div');
                ring.className = 'mini-ring exp';
                ringsDiv.appendChild(ring);
            }
            cell.appendChild(ringsDiv);
        }
    }

    if (!otherMonth && dateKey) {
        cell.addEventListener('click', () => onCalendarDateSelect(dateKey));
    }

    return cell;
}

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

function goToToday() {
    const today = new Date();
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();
    renderCalendar();
}

function onCalendarDateSelect(dateKey) {
    setActiveDate(dateKey);
    renderCalendar();

    if (currentPage !== 'home') {
        switchPage('home');
    }

    openAddModal({ dateKey });
}

// 添加任务
function openAddModal(options = {}) {
    addModalMode = options.mode || 'task';
    addModalTargetDate = options.dateKey || selectedDateKey;

    resetAddTaskForm();

    const modal = document.getElementById('addModal');
    modal.classList.add('active');

    const titleEl = document.getElementById('addModalTitle');
    if (titleEl) {
        titleEl.textContent = addModalMode === 'preset' ? '添加预设任务' : '添加新任务';
    }

    const dateHint = document.getElementById('addModalDateHint');
    if (dateHint) {
        if (addModalMode === 'preset') {
            dateHint.textContent = '保存为常用模板，随时快速复用。';
        } else {
            const label = formatDateLabel(addModalTargetDate);
            dateHint.textContent = `目标日期：${label}`;
        }
    }

    setTimeout(() => {
        const titleInput = document.getElementById('taskTitle');
        if (titleInput) {
            titleInput.focus();
        }
    }, 0);
}

function closeAddModal() {
    document.getElementById('addModal').classList.remove('active');
    resetAddTaskForm();
    addModalMode = 'task';
    addModalTargetDate = selectedDateKey;
}

function resetAddTaskForm() {
    const form = document.getElementById('addTaskForm');
    if (!form) return;

    form.reset();

    const ringInputs = document.querySelectorAll('input[name="taskRings"]');
    ringInputs.forEach(input => {
        input.checked = input.value === 'health';
    });

    const ringValueInput = document.getElementById('taskRingValue');
    if (ringValueInput) {
        ringValueInput.value = DEFAULT_RING_VALUE;
    }

    const iconInput = document.getElementById('taskIcon');
    if (iconInput) {
        iconInput.value = '';
        iconInput.dispatchEvent(new Event('input'));
    }
}

document.getElementById('addTaskForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value.trim();
    if (!title) {
        alert('请输入任务名称');
        const titleInput = document.getElementById('taskTitle');
        if (titleInput) {
            titleInput.focus();
        }
        return;
    }

    const selectedRings = Array.from(document.querySelectorAll('input[name="taskRings"]:checked'))
        .map(input => input.value)
        .filter(type => RING_LABELS[type]);

    const ringValueInput = document.getElementById('taskRingValue');
    let ringValue = parseInt(ringValueInput.value, 10);
    if (!Number.isFinite(ringValue) || ringValue <= 0) {
        ringValue = DEFAULT_RING_VALUE;
    }
    ringValue = Math.min(Math.max(ringValue, 1), RING_TARGET);
    ringValueInput.value = ringValue;

    const basePayload = {
        id: Date.now(),
        title,
        description: document.getElementById('taskDesc').value.trim(),
        icon: document.getElementById('taskIcon').value || '📝',
        completed: false,
        rings: selectedRings.length ? selectedRings : ['health'],
        ringValue,
        time: '自定义时间',
        mood: '😊',
        locked: false
    };

    if (addModalMode === 'preset') {
        const preset = normalizeTask({ ...basePayload });
        preset.completed = false;
        preset.locked = false;
        presetTasks.push({ ...preset, id: Date.now() + Math.floor(Math.random() * 1000) });
        savePresetTasks();
        renderPresetTasks();
    } else {
        const targetDate = addModalTargetDate || selectedDateKey;
        const taskList = ensureDateCollection(targetDate);
        const newTask = normalizeTask({ ...basePayload, id: Date.now() + Math.floor(Math.random() * 1000) });
        taskList.push(newTask);
        saveData(targetDate);

        if (targetDate === selectedDateKey) {
            renderTasks();
            updateRings();
        }

        renderCalendar();
    }

    closeAddModal();
});

document.getElementById('addModal').addEventListener('click', (e) => {
    if (e.target.id === 'addModal') {
        closeAddModal();
    }
});

document.getElementById('countdownModal').addEventListener('click', (e) => {
    if (e.target.id === 'countdownModal') {
        closeCountdownModal();
    }
});

function showConfirmDialog(message) {
    const modal = document.getElementById('confirmModal');
    const messageEl = document.getElementById('confirmMessage');

    if (!modal || !messageEl) {
        return Promise.resolve(window.confirm(message));
    }

    messageEl.textContent = message;
    modal.classList.add('active');

    return new Promise(resolve => {
        confirmDialogResolver = resolve;
    });
}

function resolveConfirmDialog(result) {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.classList.remove('active');
    }

    if (typeof confirmDialogResolver === 'function') {
        confirmDialogResolver(result);
        confirmDialogResolver = null;
    }
}

const confirmOkBtn = document.getElementById('confirmOk');
if (confirmOkBtn) {
    confirmOkBtn.addEventListener('click', () => resolveConfirmDialog(true));
}

const confirmCancelBtn = document.getElementById('confirmCancel');
if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', () => resolveConfirmDialog(false));
}

const confirmModalEl = document.getElementById('confirmModal');
if (confirmModalEl) {
    confirmModalEl.addEventListener('click', (event) => {
        if (event.target.id === 'confirmModal') {
            resolveConfirmDialog(false);
        }
    });
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
}

function handleBgUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const bgImg = document.getElementById('bg-image');
            bgImg.src = e.target.result;
            bgImg.classList.add('active');
            localStorage.setItem(BG_KEY, e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

function openPresetModal() {
    openAddModal({ mode: 'preset' });
}

init();
