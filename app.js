document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const taskForm = document.getElementById('task-form');
    const taskIdInput = document.getElementById('task-id');
    const titleInput = document.getElementById('task-title');
    const dateInput = document.getElementById('task-date');
    const cutoffInput = document.getElementById('task-cutoff');
    const timeInput = document.getElementById('task-time');
    const prioritySelect = document.getElementById('task-priority');
    const statusSelect = document.getElementById('task-status');
    const categoryInput = document.getElementById('task-category');
    const clearBtn = document.getElementById('clear-btn');
    const saveBtn = document.getElementById('save-btn');
    const tasksList = document.getElementById('tasks-list');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const spinner = document.getElementById('loading-spinner');

    let currentTasks = [];
    let currentFilter = 'all';

    // Initialize
    fetchTasks();

    // Event Listeners
    taskForm.addEventListener('submit', handleSaveTask);
    clearBtn.addEventListener('click', clearForm);
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderTasks();
        });
    });

    // API Functions
    async function fetchTasks() {
        showLoading(true);
        try {
            const response = await fetch('/api/tasks');
            if (!response.ok) throw new Error('Failed to fetch tasks');
            currentTasks = await response.json();
            
            // Sort by created_at descending (newest first)
            currentTasks.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            
            renderTasks();
        } catch (error) {
            console.error(error);
            alert('Failed to load tasks. Please check your connection.');
        } finally {
            showLoading(false);
        }
    }

    async function handleSaveTask(e) {
        e.preventDefault();
        
        const taskData = {
            task_id: taskIdInput.value || Date.now().toString(),
            title: titleInput.value.trim(),
            date: dateInput.value,
            cutoff_date: cutoffInput.value,
            due_time: timeInput.value,
            priority: prioritySelect.value,
            status: statusSelect.value,
            category: categoryInput.value.trim(),
        };

        if (!taskData.title || !taskData.date) {
            alert('Title and Date are required!');
            return;
        }

        const isEditing = !!taskIdInput.value;
        const method = isEditing ? 'PUT' : 'POST';

        showLoading(true);
        saveBtn.disabled = true;

        try {
            const response = await fetch('/api/tasks', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });

            if (!response.ok) throw new Error('Failed to save task');
            
            clearForm();
            await fetchTasks(); // Refresh list
        } catch (error) {
            console.error(error);
            alert('Failed to save task. Check console for details.');
        } finally {
            showLoading(false);
            saveBtn.disabled = false;
        }
    }

    async function deleteTask(id) {
        if (!confirm('Are you sure you want to delete this task?')) return;

        showLoading(true);
        try {
            const response = await fetch(`/api/tasks?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete task');
            
            // Optimistic UI update
            currentTasks = currentTasks.filter(t => t.task_id !== id);
            renderTasks();
        } catch (error) {
            console.error(error);
            alert('Failed to delete task.');
        } finally {
            showLoading(false);
        }
    }

    // UI Functions
    function renderTasks() {
        tasksList.innerHTML = '';
        
        let filteredTasks = currentTasks;
        if (currentFilter !== 'all') {
            let filterValue = currentFilter;
            // Handle classname vs value differences if any, but they match here exactly.
            filteredTasks = currentTasks.filter(t => t.status === filterValue);
        }

        if (filteredTasks.length === 0) {
            tasksList.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">No tasks found.</div>`;
            return;
        }

        filteredTasks.forEach(task => {
            tasksList.appendChild(createTaskElement(task));
        });
    }

    function createTaskElement(task) {
        const div = document.createElement('div');
        div.className = 'task-item';
        div.id = `task-${task.task_id}`;

        const priorityClass = `priority-${task.priority.toLowerCase()}`;
        const statusClass = `status-${task.status.toLowerCase().replace(' ', '-')}`;

        div.innerHTML = `
            <div class="task-header">
                <div class="task-title">${escapeHTML(task.title)}</div>
                <div class="task-badges">
                    <span class="badge ${priorityClass}">${task.priority}</span>
                    <span class="badge ${statusClass}">${task.status}</span>
                </div>
            </div>
            
            <div class="task-details">
                <div class="detail-item">
                    <span class="detail-label">Date</span>
                    <span class="detail-value">${task.date || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Cutoff Date</span>
                    <span class="detail-value">${task.cutoff_date || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Due Time</span>
                    <span class="detail-value">${task.due_time || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Category</span>
                    <span class="detail-value">${escapeHTML(task.category) || '-'}</span>
                </div>
            </div>

            <div class="task-actions">
                <button class="action-btn edit" data-id="${task.task_id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Edit
                </button>
                <button class="action-btn delete" data-id="${task.task_id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Delete
                </button>
            </div>
        `;

        // Bind events
        div.querySelector('.edit').addEventListener('click', () => loadTaskIntoForm(task));
        div.querySelector('.delete').addEventListener('click', () => deleteTask(task.task_id));

        return div;
    }

    function loadTaskIntoForm(task) {
        taskIdInput.value = task.task_id;
        titleInput.value = task.title;
        dateInput.value = task.date;
        cutoffInput.value = task.cutoff_date;
        timeInput.value = task.due_time;
        prioritySelect.value = task.priority || 'Medium';
        statusSelect.value = task.status || 'Pending';
        categoryInput.value = task.category;

        saveBtn.textContent = 'Update Task';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function clearForm() {
        taskForm.reset();
        taskIdInput.value = '';
        saveBtn.textContent = 'Save Task';
    }

    function showLoading(isLoading) {
        if (isLoading) {
            spinner.classList.remove('hidden');
        } else {
            spinner.classList.add('hidden');
        }
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    }
});
