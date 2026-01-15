const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');

// Fetch tasks on load
document.addEventListener('DOMContentLoaded', fetchTasks);

async function fetchTasks() {
    try {
        const response = await fetch('/api/tasks');
        const result = await response.json();
        const tasks = result.data;
        renderTasks(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

function renderTasks(tasks) {
    taskList.innerHTML = '';

    if (tasks.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        tasks.forEach(task => addTaskToDOM(task));
    }
}

function addTaskToDOM(task) {
    const li = document.createElement('li');
    li.dataset.id = task.id;
    if (task.completed) {
        li.classList.add('completed');
    }

    const categoryClass = `badge-${(task.category || 'General').toLowerCase()}`;

    li.innerHTML = `
        <div class="task-content">
            <div class="checkbox-custom">
                <i class="fa-solid fa-check"></i>
            </div>
            <span class="category-badge ${categoryClass}">${task.category || 'General'}</span>
            <span class="text">${escapeHtml(task.text)}</span>
        </div>
        <button class="delete-btn" aria-label="Delete task">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;

    // Event Listeners
    li.addEventListener('click', (e) => {
        // Prevent toggling when clicking delete button
        if (e.target.closest('.delete-btn')) return;
        toggleTask(task.id, !li.classList.contains('completed'), li);
    });

    li.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // Double safety
        deleteTask(task.id, li);
    });

    taskList.prepend(li); // Add new tasks to the top visually
}

// Add Task
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    const category = document.getElementById('category-select').value;

    if (text) {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, category })
            });
            const result = await response.json();

            if (result.message === "success") {
                addTaskToDOM(result.data);
                taskInput.value = '';
                // document.getElementById('category-select').value = 'General'; 
                emptyState.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error adding task:', error);
        }
    }
});

// Toggle Task
async function toggleTask(id, completedState, listElement) {
    // Optimistic UI update
    listElement.classList.toggle('completed');

    try {
        await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: completedState ? 1 : 0 })
        });
    } catch (error) {
        console.error('Error toggling task:', error);
        // Revert if error
        listElement.classList.toggle('completed');
    }
}

// Delete Task
async function deleteTask(id, listElement) {
    // Animate out
    listElement.style.transform = 'translateX(100px)';
    listElement.style.opacity = '0';

    setTimeout(async () => {
        try {
            const response = await fetch(`/api/tasks/${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();

            if (result.message === "deleted") {
                listElement.remove();
                if (taskList.children.length === 0) {
                    emptyState.classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            // Revert animation if needed, but usually we just log
            listElement.style.transform = 'none';
            listElement.style.opacity = '1';
        }
    }, 300);
}

function escapeHtml(text) {
    if (!text) return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
