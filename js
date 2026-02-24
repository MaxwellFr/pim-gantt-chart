const DEFAULT_PROJECT_DATA = [
    { id: 1, name: "Audit & Cadrage", start: "2026-03-01", end: "2026-03-25", progress: 100, phase: "planning", color: "#3b82f6", details: "Analyse des besoins..." },
    { id: 2, name: "Modélisation des Données", start: "2026-03-20", end: "2026-04-30", progress: 45, phase: "design", color: "#818cf8", details: "Structuration..." },
    { id: 3, name: "Configuration & Workflows", start: "2026-04-15", end: "2026-05-30", progress: 10, phase: "design", color: "#8b5cf6", details: "Paramétrage..." },
    { id: 4, name: "Nettoyage & Migration", start: "2026-05-15", end: "2026-08-15", progress: 0, phase: "migration", color: "#06b6d4", details: "Dédoublonnage..." },
    { id: 5, name: "Intégration ERP / E-commerce", start: "2026-08-01", end: "2026-09-30", progress: 0, phase: "integration", color: "#10b981", details: "Connecteurs..." },
    { id: 6, name: "Recette / UAT", start: "2026-10-01", end: "2026-10-31", progress: 0, phase: "integration", color: "#059669", details: "Tests..." },
    { id: 7, name: "Formation & Go-Live", start: "2026-11-01", end: "2026-11-20", progress: 0, phase: "training", color: "#f59e0b", details: "Compétences..." },
    { id: 8, name: "Accompagnement post-lancement", start: "2026-11-21", end: "2026-12-31", progress: 0, phase: "support", color: "#ec4899", details: "Support..." }
];

let projectData = [];

const config = {
    monthWidth: 240,
    rowHeight: 56,
    startDate: new Date("2026-02-01"),
    endDate: new Date("2026-12-31")
};

let activeAction = null;

async function init() {
    const saved = localStorage.getItem('gantt_project_data');
    if (saved) {
        projectData = JSON.parse(saved);
    } else {
        try {
            const response = await fetch('data.json?t=' + Date.now());
            if (response.ok) {
                projectData = await response.json();
            } else {
                projectData = DEFAULT_PROJECT_DATA;
            }
        } catch (err) {
            projectData = DEFAULT_PROJECT_DATA;
        }
    }
    renderGantt();
    setupEventListeners();
}

function updateStats() {
    if (projectData.length === 0) return;
    const avgProgress = projectData.reduce((acc, task) => acc + (task.progress || 0), 0) / projectData.length;
    document.getElementById('stat-progression').innerText = `${Math.round(avgProgress)}%`;
    const lastTask = projectData[projectData.length - 1];
    const goLiveDate = new Date(lastTask.end);
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    document.getElementById('stat-golive').innerText = `${months[goLiveDate.getMonth()]} ${goLiveDate.getFullYear()}`;
    const today = new Date();
    const diffMs = goLiveDate - today;
    const diffWeeks = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7));
    document.getElementById('stat-weeks').innerText = Math.max(0, diffWeeks);
}

function renderGantt() {
    const tasksSidebar = document.getElementById('tasks-sidebar');
    const timelineHeader = document.getElementById('timeline-header');
    const gridBody = document.getElementById('grid-body');

    tasksSidebar.innerHTML = '<div class="sidebar-header">Phases du Projet</div>';
    timelineHeader.innerHTML = '';
    gridBody.innerHTML = '';

    updateStats();

    const months = getMonthsArray(config.startDate, config.endDate);
    months.forEach(month => {
        const monthEl = document.createElement('div');
        monthEl.className = 'month-slot';
        monthEl.style.width = `${config.monthWidth}px`;
        monthEl.innerHTML = `
            <div class="month-label">${month.name} ${month.year}</div>
            <div class="weeks-labels">
                <div class="week-label">S1</div><div class="week-label">S2</div>
                <div class="week-label">S3</div><div class="week-label">S4</div>
            </div>
        `;
        timelineHeader.appendChild(monthEl);
    });

    const monthsDiff = (config.endDate.getFullYear() - config.startDate.getFullYear()) * 12 + (config.endDate.getMonth() - config.startDate.getMonth()) + 1;
    const totalWidth = monthsDiff * config.monthWidth;
    gridBody.style.width = `${totalWidth}px`;

    projectData.forEach((task, index) => {
        const sidebarItem = document.createElement('div');
        sidebarItem.className = 'task-item';
        const nameContainer = document.createElement('div');
        nameContainer.style.display = 'flex';
        nameContainer.style.alignItems = 'center';
        nameContainer.style.flexGrow = '1';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'editable';
        nameSpan.contentEditable = true;
        nameSpan.innerText = task.name;
        nameSpan.addEventListener('blur', (e) => { task.name = e.target.innerText; updateStats(); });
        nameContainer.appendChild(nameSpan);
        sidebarItem.appendChild(nameContainer);

        const controls = document.createElement('div');
        controls.className = 'item-controls';
        controls.style.display = 'flex';
        controls.style.alignItems = 'center';

        const upBtn = document.createElement('span');
        upBtn.className = 'move-btn';
        upBtn.innerHTML = '▲';
        upBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
        upBtn.onclick = () => moveTask(index, -1);

        const downBtn = document.createElement('span');
        downBtn.className = 'move-btn';
        downBtn.innerHTML = '▼';
        downBtn.style.visibility = index === projectData.length - 1 ? 'hidden' : 'visible';
        downBtn.onclick = () => moveTask(index, 1);

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.style.display = 'none';
        colorInput.value = task.color || '#3b82f6';

        const hexInput = document.createElement('input');
        hexInput.className = 'hex-input';
        hexInput.type = 'text';
        hexInput.value = (task.color || '#3b82f6').toUpperCase();

        const colorBtn = document.createElement('div');
        colorBtn.className = 'color-picker-btn';
        colorBtn.style.backgroundColor = task.color || '#3b82f6';

        colorInput.addEventListener('input', (e) => {
            const val = e.target.value;
            task.color = val;
            hexInput.value = val.toUpperCase();
            colorBtn.style.backgroundColor = val;
            const bars = document.querySelectorAll('.task-bar');
            if (bars[index]) bars[index].style.background = val;
        });

        hexInput.addEventListener('change', (e) => {
            let val = e.target.value;
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-F]{6}$/i.test(val)) {
                task.color = val;
                colorBtn.style.backgroundColor = val;
                colorInput.value = val;
                renderGantt();
            } else {
                hexInput.value = task.color.toUpperCase();
            }
        });

        colorBtn.onclick = () => colorInput.click();

        const delBtn = document.createElement('span');
        delBtn.className = 'delete-btn';
        delBtn.innerHTML = '×';
        delBtn.onclick = () => {
            if (confirm(`Supprimer "${task.name}" ?`)) {
                projectData.splice(index, 1);
                renderGantt();
            }
        };

        controls.appendChild(upBtn);
        controls.appendChild(downBtn);
        controls.appendChild(hexInput);
        controls.appendChild(colorBtn);
        controls.appendChild(delBtn);
        sidebarItem.appendChild(controls);
        tasksSidebar.appendChild(sidebarItem);

        const gridRow = document.createElement('div');
        gridRow.className = 'grid-row';
        gridRow.style.width = `${totalWidth}px`;
        const bar = document.createElement('div');
        bar.className = 'task-bar';
        bar.style.background = task.color || '#3b82f6';
        const startPos = getPositionFromDate(new Date(task.start));
        const endPos = getPositionFromDate(new Date(task.end));
        bar.style.left = `${startPos}px`;
        bar.style.width = `${Math.max(20, endPos - startPos)}px`;
        const barText = document.createElement('span');
        barText.className = 'editable';
        barText.contentEditable = true;
        barText.innerText = task.name;
        barText.addEventListener('blur', (e) => { task.name = e.target.innerText; renderGantt(); });
        barText.addEventListener('mousedown', (e) => e.stopPropagation());
        bar.appendChild(barText);

        const resizer = document.createElement('div');
        resizer.className = 'resizer';
        resizer.addEventListener('mousedown', (e) => { e.stopPropagation(); startAction(e, 'resize', task, bar, index); });
        bar.appendChild(resizer);

        bar.addEventListener('mousedown', (e) => startAction(e, 'drag', task, bar, index));
        bar.addEventListener('mouseenter', (e) => showTooltip(e, task));
        bar.addEventListener('mouseleave', hideTooltip);
        bar.addEventListener('mousemove', (e) => updateTooltipPos(e));
        gridRow.appendChild(bar);
        gridBody.appendChild(gridRow);
    });

    const addContainer = document.createElement('div');
    addContainer.className = 'add-task-container';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-add';
    addBtn.innerText = '+ Ajouter une étape';
    addBtn.onclick = addNewTask;
    addContainer.appendChild(addBtn);
    tasksSidebar.appendChild(addContainer);
}

function moveTask(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= projectData.length) return;
    const temp = projectData[index];
    projectData[index] = projectData[targetIndex];
    projectData[targetIndex] = temp;
    renderGantt();
}

function addNewTask() {
    const lastTask = projectData[projectData.length - 1];
    let startStr = "2026-06-01";
    let endStr = "2026-06-15";
    if (lastTask) {
        const lastEnd = new Date(lastTask.end);
        lastEnd.setDate(lastEnd.getDate() + 1);
        startStr = lastEnd.toISOString().split('T')[0];
        lastEnd.setDate(lastEnd.getDate() + 14);
        endStr = lastEnd.toISOString().split('T')[0];
    }
    const newTask = { id: Date.now(), name: "Nouvelle étape", start: startStr, end: endStr, progress: 0, color: "#94a3b8", details: "Détails..." };
    projectData.push(newTask);
    renderGantt();
}

function startAction(e, type, task, bar, index) {
    if (e.target.contentEditable === "true") return;
    activeAction = { type, task, bar, index, startX: e.pageX, originalLeft: parseFloat(bar.style.left), originalWidth: parseFloat(bar.style.width) };
    bar.classList.add(type === 'drag' ? 'dragging' : 'resizing');
    hideTooltip();
    window.addEventListener('mousemove', handleActionMove);
    window.addEventListener('mouseup', stopAction);
}

function handleActionMove(e) {
    if (!activeAction) return;
    const deltaX = e.pageX - activeAction.startX;
    const containerWidth = document.getElementById('grid-body').offsetWidth;
    if (activeAction.type === 'drag') {
        let newLeft = activeAction.originalLeft + deltaX;
        newLeft = Math.max(0, Math.min(newLeft, containerWidth - activeAction.originalWidth));
        activeAction.bar.style.left = `${newLeft}px`;
    } else if (activeAction.type === 'resize') {
        let newWidth = activeAction.originalWidth + deltaX;
        newWidth = Math.max(20, Math.min(newWidth, containerWidth - activeAction.originalLeft));
        activeAction.bar.style.width = `${newWidth}px`;
    }
}

function stopAction() {
    if (!activeAction) return;
    const newLeft = parseFloat(activeAction.bar.style.left);
    const newWidth = parseFloat(activeAction.bar.style.width);
    const newStart = getDateFromPosition(newLeft);
    const newEnd = getDateFromPosition(newLeft + newWidth);
    const oldStart = new Date(activeAction.task.start);
    const shiftMs = newStart.getTime() - oldStart.getTime();

    activeAction.task.start = newStart.toISOString().split('T')[0];
    activeAction.task.end = newEnd.toISOString().split('T')[0];

    if (activeAction.type === 'drag' && shiftMs !== 0) {
        for (let i = activeAction.index + 1; i < projectData.length; i++) {
            const t = projectData[i];
            const s = new Date(t.start);
            const e = new Date(t.end);
            s.setTime(s.getTime() + shiftMs);
            e.setTime(e.getTime() + shiftMs);
            t.start = s.toISOString().split('T')[0];
            t.end = e.toISOString().split('T')[0];
        }
    }

    activeAction.bar.classList.remove('dragging', 'resizing');
    activeAction = null;
    window.removeEventListener('mousemove', handleActionMove);
    window.removeEventListener('mouseup', stopAction);
    renderGantt();
}

function getDateFromPosition(px) {
    const containerWidth = document.getElementById('grid-body').offsetWidth;
    const ratio = px / containerWidth;
    const startMs = config.startDate.getTime();
    const endMs = config.endDate.getTime();
    return new Date(startMs + ratio * (endMs - startMs));
}

function getMonthsArray(start, end) {
    const months = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const stop = new Date(end.getFullYear(), end.getMonth(), 1);
    const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    while (current <= stop) {
        months.push({ name: monthNames[current.getMonth()], year: current.getFullYear() });
        current.setMonth(current.getMonth() + 1);
    }
    return months;
}

function getPositionFromDate(date) {
    const startMs = config.startDate.getTime();
    const ratio = (date.getTime() - startMs) / (config.endDate.getTime() - startMs);
    const monthsDiff = (config.endDate.getFullYear() - config.startDate.getFullYear()) * 12 + (config.endDate.getMonth() - config.startDate.getMonth()) + 1;
    return ratio * (monthsDiff * config.monthWidth);
}

function setupEventListeners() {
    document.getElementById('zoom-in').onclick = () => { config.monthWidth += 40; renderGantt(); };
    document.getElementById('zoom-out').onclick = () => { if (config.monthWidth > 120) { config.monthWidth -= 40; renderGantt(); } };
    document.getElementById('next-month').onclick = () => { document.getElementById('gantt-container').scrollBy({ left: config.monthWidth, behavior: 'smooth' }); };
    document.getElementById('prev-month').onclick = () => { document.getElementById('gantt-container').scrollBy({ left: -config.monthWidth, behavior: 'smooth' }); };

    document.getElementById('save-btn').onclick = (e) => {
        // Uniquement Save en LocalStorage
        localStorage.setItem('gantt_project_data', JSON.stringify(projectData));
        const btn = e.target;
        const orgText = btn.innerText;
        btn.innerText = "✓ Enregistré !";
        btn.style.background = "#10b981";
        setTimeout(() => { btn.innerText = orgText; btn.style.background = ""; }, 2000);
    };

    document.getElementById('import-btn').onclick = () => {
        // On remet la fonction simple d'export JSON ici pour que vous puissiez quand même sortir les datas
        const dataStr = JSON.stringify(projectData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', 'planning_pim.json');
        linkElement.click();
    };
}

function showTooltip(e, task) {
    if (activeAction) return;
    const tooltip = document.getElementById('tooltip');
    tooltip.innerHTML = `<div class="tooltip-title">${task.name}</div><div class="tooltip-row"><span>Début:</span><span>${formatDate(task.start)}</span></div><div class="tooltip-row"><span>Fin:</span><span>${formatDate(task.end)}</span></div>`;
    tooltip.classList.add('active');
    updateTooltipPos(e);
}
function hideTooltip() { document.getElementById('tooltip').classList.remove('active'); }
function updateTooltipPos(e) {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.left = `${e.pageX + 15}px`;
    tooltip.style.top = `${e.pageY + 15}px`;
}
function formatDate(d) { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }

window.onload = init;
