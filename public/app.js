// DOM Elements
const taskForm = document.getElementById('task-form');
const taskTitle = document.getElementById('task-title');
const taskDesc = document.getElementById('task-desc');
const taskPriority = document.getElementById('task-priority');
const btnGenerateAi = document.getElementById('btn-generate-ai');
const toggleFailure = document.getElementById('toggle-failure');

const aiLoading = document.getElementById('ai-loading');
const aiDisclaimer = document.getElementById('ai-disclaimer');
const aiSourceBadge = document.getElementById('ai-source-badge');
const tasksList = document.getElementById('tasks-list');
const taskCount = document.getElementById('task-count');
const toast = document.getElementById('toast');

let isLastDescriptionAi = false;

document.addEventListener('DOMContentLoaded', () => {
    fetchTasks();
    btnGenerateAi.addEventListener('click', handleGenerateAi);
    taskForm.addEventListener('submit', handleCreateTask);
});

function showToast(msg, type = 'info') {
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    setTimeout(() => {
        toast.className = 'toast hidden';
    }, 4500);
}

// Fetch all tasks
async function fetchTasks() {
    try {
        const res = await fetch('/tasks');
        const data = await res.json();
        renderTasks(data.tasks || []);
    } catch (err) {}
}

function renderTasks(tasks) {
    if (taskCount) {
        taskCount.textContent = tasks.length;
    }

    if (tasks.length === 0) {
        tasksList.innerHTML = `
            <li class="empty-state">
                <span class="empty-icon" aria-hidden="true">◇</span>
                <span>Your queue is empty. Compose your first task on the left.</span>
            </li>
        `;
        return;
    }

    tasksList.innerHTML = tasks.map(t => {
        const priority = ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium';

        return `
            <li class="task-item priority-${priority} ${t.completed ? 'completed' : ''}">
                <label class="task-check">
                    <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask(${t.id}, this.checked)" aria-label="Mark task complete">
                </label>
                <div class="task-body">
                    <div class="task-head">
                        <strong class="task-title">${escapeHtml(t.title)}</strong>
                        ${t.isAiAssisted ? '<span class="ai-pill">✦ AI-assisted</span>' : ''}
                    </div>
                    ${t.description ? `<p class="task-desc">${escapeHtml(t.description)}</p>` : ''}
                    <div class="task-meta">
                        <span class="priority-chip ${priority}">${priority}</span>
                    </div>
                </div>
                <button class="icon-btn" title="Delete task" aria-label="Delete task" onclick="deleteTask(${t.id})">✕</button>
            </li>
        `;
    }).join('');
}

// Generate Description with AI (Steps 4, 5, 6 & Supplementary 1, 2, 3)
async function handleGenerateAi() {
    const title = taskTitle.value.trim();
    if (!title) {
        showToast('Please enter a task title first to generate an AI description.', 'error');
        taskTitle.focus();
        return;
    }

    // Supplementary Problem 1: Show loading state
    aiLoading.classList.remove('hidden');
    aiDisclaimer.classList.add('hidden');
    btnGenerateAi.disabled = true;

    try {
        const res = await fetch('/api/ai/generate-description', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                testFailure: toggleFailure.checked
            })
        });

        const data = await res.json();

        if (res.status === 429) {
            // Supplementary Problem 2: Rate limit caught
            showToast(data.message, 'error');
            return;
        }

        if (data.success && data.description) {
            // Step 5: Put returned description into editable textarea as a suggestion
            taskDesc.value = data.description;
            if (data.priority) {
                taskPriority.value = data.priority;
            }
            isLastDescriptionAi = true;

            // Supplementary Problem 3: Show disclaimer banner
            aiSourceBadge.textContent = data.fallback 
                ? `Mode: Graceful Degradation (${data.message})`
                : `Model: ${data.source}`;
            aiDisclaimer.classList.remove('hidden');

            if (data.fallback) {
                showToast('AI API offline or failed. Graceful degradation served a template suggestion.', 'info');
            } else {
                showToast('AI description generated successfully! You can edit it before saving.', 'success');
            }
        } else {
            showToast('Unable to generate suggestion: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (err) {
        // Network-level fallback
        showToast('Network error calling AI backend: ' + err.message, 'error');
    } finally {
        aiLoading.classList.add('hidden');
        btnGenerateAi.disabled = false;
    }
}

// Create Task
async function handleCreateTask(e) {
    e.preventDefault();
    const title = taskTitle.value.trim();
    const description = taskDesc.value.trim();
    if (!title) return;

    try {
        const res = await fetch('/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                description,
                priority: taskPriority.value,
                isAiAssisted: isLastDescriptionAi
            })
        });

        const data = await res.json();
        if (data.success) {
            showToast('Task created successfully!', 'success');
            taskForm.reset();
            aiDisclaimer.classList.add('hidden');
            isLastDescriptionAi = false;
            fetchTasks();
        }
    } catch (err) {
        showToast('Error saving task', 'error');
    }
}

// Toggle Task
async function toggleTask(id, completed) {
    try {
        await fetch(`/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed })
        });
        fetchTasks();
    } catch (err) {}
}

// Delete Task
async function deleteTask(id) {
    if (!confirm('Delete task?')) return;
    try {
        await fetch(`/tasks/${id}`, { method: 'DELETE' });
        fetchTasks();
        showToast('Task deleted', 'info');
    } catch (err) {}
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}
