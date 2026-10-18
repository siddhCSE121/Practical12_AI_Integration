const express = require('express');
const router = express.Router();

let tasks = [
    {
        id: 1,
        title: 'Review Sprint Deliverables',
        description: 'Verify all practical requirements and conduct code review before release.',
        priority: 'high',
        completed: false,
        isAiAssisted: true,
        createdAt: new Date()
    },
    {
        id: 2,
        title: 'Document AI Integration Architecture',
        description: 'Write detailed diagrams explaining why API keys must remain strictly backend-only.',
        priority: 'medium',
        completed: true,
        isAiAssisted: false,
        createdAt: new Date()
    }
];

// GET /tasks - Fetch all tasks
router.get('/', (req, res) => {
    res.status(200).json({ success: true, count: tasks.length, tasks });
});

// POST /tasks - Create task
router.post('/', (req, res) => {
    const { title, description, priority, isAiAssisted } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    const newTask = {
        id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
        title: title.trim(),
        description: description || '',
        priority: priority || 'medium',
        completed: false,
        isAiAssisted: isAiAssisted || false,
        createdAt: new Date()
    };

    tasks.unshift(newTask);
    res.status(201).json({ success: true, task: newTask });
});

// PUT /tasks/:id - Toggle or update task
router.put('/:id', (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const task = tasks.find(t => t.id === taskId);

    if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (req.body.title !== undefined) task.title = req.body.title;
    if (req.body.description !== undefined) task.description = req.body.description;
    if (req.body.priority !== undefined) task.priority = req.body.priority;
    if (req.body.completed !== undefined) task.completed = req.body.completed;

    res.status(200).json({ success: true, task });
});

// DELETE /tasks/:id - Delete task
router.delete('/:id', (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const index = tasks.findIndex(t => t.id === taskId);

    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Task not found' });
    }

    tasks.splice(index, 1);
    res.status(200).json({ success: true, message: 'Task deleted' });
});

module.exports = router;
