// タスク管理アプリケーションのフロントエンドロジック

const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const categorySelect = document.getElementById('category-select');

// Modal Elements
const categoryModal = document.getElementById('category-modal');
const newCategoryBtn = document.getElementById('new-category-btn');
const cancelCatBtn = document.getElementById('cancel-cat-btn');
const saveCatBtn = document.getElementById('save-cat-btn');
const newCatName = document.getElementById('new-cat-name');
const newCatColor = document.getElementById('new-cat-color');

// Global state for categories (id -> color map)
let categoryColors = {};

// Fetch tasks and categories on load
document.addEventListener('DOMContentLoaded', async () => {
    await fetchCategories();
    await fetchTasks();
});

// --- Category Logic ---

async function fetchCategories() {
    try {
        const response = await fetch('/api/categories');
        const result = await response.json();
        const categories = result.data;

        categorySelect.innerHTML = ''; // Clear existing
        categoryColors = {};

        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id; // Use ID as value
            option.textContent = cat.name;
            option.dataset.color = cat.color;
            categorySelect.appendChild(option);

            categorySelect.appendChild(option);

            // Store color map
            categoryColors[cat.name] = cat.color;
        });

        // Ensure default colors exist for legacy/fallback
        if (!categoryColors['General']) categoryColors['General'] = '#95a5a6';
        if (!categoryColors['Work']) categoryColors['Work'] = '#3498db';
        if (!categoryColors['Personal']) categoryColors['Personal'] = '#9b59b6';
        if (!categoryColors['Shopping']) categoryColors['Shopping'] = '#2ecc71';
        if (!categoryColors['Health']) categoryColors['Health'] = '#e74c3c';
        if (!categoryColors['Gaming']) categoryColors['Gaming'] = '#7c6cf5';
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

// Open Modal
newCategoryBtn.addEventListener('click', () => {
    categoryModal.classList.remove('hidden');
    newCatName.focus();
});

// Close Modal
cancelCatBtn.addEventListener('click', () => {
    categoryModal.classList.add('hidden');
    newCatName.value = '';
    newCatColor.value = '#6c5ce7';
});

// Save New Category
saveCatBtn.addEventListener('click', async () => {
    const name = newCatName.value.trim();
    const color = newCatColor.value;

    if (name) {
        try {
            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, color })
            });
            const result = await response.json();

            if (result.message === "success") {
                // Refresh categories
                await fetchCategories();
                // Select the new category
                const newCatId = result.data.id;
                categorySelect.value = newCatId;

                // Close modal
                categoryModal.classList.add('hidden');
                newCatName.value = '';
            }
        } catch (error) {
            console.error('Error creating category:', error);
            alert('Categories must be unique.');
        }
    }
});


// --- Task Logic ---

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

    // Determine color: favor returned color from JOIN, fallback to memory map
    const badgeColor = task.color || categoryColors[task.category] || '#95a5a6';
    const bgColor = hexToRgba(badgeColor, 0.15);
    const borderColor = hexToRgba(badgeColor, 0.3);

    li.innerHTML = `
        <div class="task-content">
            <div class="checkbox-custom">
                <i class="fa-solid fa-check"></i>
            </div>
            <span class="category-badge" style="background: ${bgColor}; color: ${badgeColor}; border-color: ${borderColor};">
                ${escapeHtml(task.category || 'General')}
            </span>
            <span class="text">${escapeHtml(task.text)}</span>
        </div>
        <button class="delete-btn" aria-label="タスクを削除">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;

    // Event Listeners
    li.addEventListener('click', (e) => {
        if (e.target.closest('.delete-btn')) return;
        toggleTask(task.id, !li.classList.contains('completed'), li);
    });

    li.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(task.id, li);
    });

    taskList.prepend(li);
}

// Add Task
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    // Get ID from the select now
    const category_id = categorySelect.value;
    const category_name = categorySelect.options[categorySelect.selectedIndex].text;

    if (text) {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    category_id,
                    category: category_name // redundant but useful for UI immediate feedback if we didn't refetch
                })
            });
            const result = await response.json();

            if (result.message === "success") {
                // Manually construct task object for UI to save a fetch
                // The API returns what we sent back
                const newTask = {
                    id: result.data.id,
                    text: result.data.text,
                    completed: 0,
                    category: category_name,
                    // Look up color from our local map since we didn't fetch it fresh from DB join
                    color: categoryColors[category_name]
                };
                addTaskToDOM(newTask);
                taskInput.value = '';
                emptyState.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error adding task:', error);
        }
    }
});

// Toggle Task
async function toggleTask(id, completedState, listElement) {
    listElement.classList.toggle('completed');

    try {
        await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: completedState ? 1 : 0 })
        });
    } catch (error) {
        console.error('Error toggling task:', error);
        listElement.classList.toggle('completed');
    }
}

// Delete Task
async function deleteTask(id, listElement) {
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
            listElement.style.transform = 'none';
            listElement.style.opacity = '1';
        }
    }, 300);
}

// Helper to convert hex to rgba for badges
function hexToRgba(hex, alpha) {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length == 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
    }
    return `rgba(150, 150, 150, ${alpha})`; // fallback
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
