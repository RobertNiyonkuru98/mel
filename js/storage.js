/* ============================================
   CAMPUS PLANNER - STORAGE MODULE
   LocalStorage data persistence for tasks
   ============================================ */

const STORAGE_KEYS = {
  TASKS: "campusPlanner_tasks",
  SETTINGS: "campusPlanner_settings",
  VERSION: "campusPlanner_version",
};

const CURRENT_VERSION = "1.0.0";

/* ============================================
   TASKS STORAGE
   ============================================ */

/**
 * Load all tasks from localStorage
 */
export function loadTasks() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!data) return [];

    const tasks = JSON.parse(data);

    if (!Array.isArray(tasks)) {
      console.error("Invalid tasks data");
      return [];
    }

    return tasks;
  } catch (error) {
    console.error("Error loading tasks:", error);
    return [];
  }
}

/**
 * Save tasks to localStorage
 */
export function saveTasks(tasks) {
  try {
    if (!Array.isArray(tasks)) {
      throw new Error("Tasks must be an array");
    }

    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_KEYS.VERSION, CURRENT_VERSION);

    return true;
  } catch (error) {
    console.error("Error saving tasks:", error);
    return false;
  }
}

/**
 * Add a new task
 */
export function addTask(taskData) {
  try {
    const tasks = loadTasks();

    const task = {
      id: generateId("task"),
      ...taskData,
      status: taskData.status || "Todo",
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tasks.push(task);

    if (saveTasks(tasks)) {
      return task;
    }

    return null;
  } catch (error) {
    console.error("Error adding task:", error);
    return null;
  }
}

/**
 * Update an existing task
 */
export function updateTask(id, updates) {
  try {
    const tasks = loadTasks();
    const index = tasks.findIndex((t) => t.id === id);

    if (index === -1) {
      console.error("Task not found:", id);
      return null;
    }

    tasks[index] = {
      ...tasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (saveTasks(tasks)) {
      return tasks[index];
    }

    return null;
  } catch (error) {
    console.error("Error updating task:", error);
    return null;
  }
}

/**
 * Delete a task
 */
export function deleteTask(id) {
  try {
    const tasks = loadTasks();
    const filtered = tasks.filter((t) => t.id !== id);

    if (filtered.length === tasks.length) {
      console.error("Task not found:", id);
      return false;
    }

    return saveTasks(filtered);
  } catch (error) {
    console.error("Error deleting task:", error);
    return false;
  }
}

/**
 * Mark task as completed
 */
export function completeTask(id) {
  return updateTask(id, {
    status: "Completed",
    completed: true,
    completedAt: new Date().toISOString(),
  });
}

/**
 * Undo task completion
 */
export function uncompleteTask(id) {
  return updateTask(id, {
    status: "Todo",
    completed: false,
    completedAt: null,
  });
}

/**
 * Get a single task
 */
export function getTask(id) {
  try {
    const tasks = loadTasks();
    return tasks.find((t) => t.id === id) || null;
  } catch (error) {
    console.error("Error getting task:", error);
    return null;
  }
}

/**
 * Clear all tasks
 */
export function clearTasks() {
  try {
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    return true;
  } catch (error) {
    console.error("Error clearing tasks:", error);
    return false;
  }
}

/* ============================================
   SETTINGS STORAGE
   ============================================ */

/**
 * Load settings
 */
export function loadSettings() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);

    const defaults = {
      timeUnit: "minutes",
      weeklyTarget: 40,
      theme: "light",
    };

    if (!data) return defaults;

    const settings = JSON.parse(data);
    return { ...defaults, ...settings };
  } catch (error) {
    console.error("Error loading settings:", error);
    return {
      timeUnit: "minutes",
      weeklyTarget: 40,
      theme: "light",
    };
  }
}

/**
 * Save settings
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error("Error saving settings:", error);
    return false;
  }
}

/**
 * Update specific setting
 */
export function updateSetting(key, value) {
  try {
    const settings = loadSettings();
    settings[key] = value;
    return saveSettings(settings);
  } catch (error) {
    console.error("Error updating setting:", error);
    return false;
  }
}

/* ============================================
   DATA IMPORT/EXPORT
   ============================================ */

/**
 * Export all data
 */
export function exportData() {
  try {
    return {
      version: CURRENT_VERSION,
      exportDate: new Date().toISOString(),
      tasks: loadTasks(),
      settings: loadSettings(),
    };
  } catch (error) {
    console.error("Error exporting data:", error);
    return null;
  }
}

/**
 * Import data with validation
 */
export function importData(data) {
  try {
    if (!data || typeof data !== "object") {
      return { success: false, message: "Invalid data format" };
    }

    if (!data.tasks || !Array.isArray(data.tasks)) {
      return { success: false, message: "Missing or invalid tasks array" };
    }

    const requiredFields = ["id", "title", "dueDate", "duration", "tag"];
    for (const task of data.tasks) {
      for (const field of requiredFields) {
        if (!(field in task)) {
          return {
            success: false,
            message: `Task missing required field: ${field}`,
          };
        }
      }
    }

    if (!saveTasks(data.tasks)) {
      return { success: false, message: "Failed to save tasks" };
    }

    if (data.settings && typeof data.settings === "object") {
      saveSettings(data.settings);
    }

    return {
      success: true,
      message: `Successfully imported ${data.tasks.length} tasks`,
    };
  } catch (error) {
    console.error("Error importing data:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Upload data from file
 */
export function uploadDataFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }

    if (!file.name.endsWith(".json")) {
      reject(new Error("File must be a JSON file"));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const result = importData(data);
        resolve(result);
      } catch (error) {
        reject(new Error("Invalid JSON file: " + error.message));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

/* ============================================
   QUERIES & STATISTICS
   ============================================ */

/**
 * Get tasks by date range
 */
export function getTasksByDateRange(startDate, endDate) {
  try {
    const tasks = loadTasks();
    return tasks.filter((t) => {
      const taskDate = new Date(t.dueDate);
      return taskDate >= startDate && taskDate <= endDate;
    });
  } catch (error) {
    console.error("Error getting tasks by date range:", error);
    return [];
  }
}

/**
 * Get tasks by tag
 */
export function getTasksByTag(tag) {
  try {
    const tasks = loadTasks();
    return tasks.filter((t) => t.tag === tag);
  } catch (error) {
    console.error("Error getting tasks by tag:", error);
    return [];
  }
}

/**
 * Get tasks by status
 */
export function getTasksByStatus(status) {
  try {
    const tasks = loadTasks();
    return tasks.filter((t) => t.status === status);
  } catch (error) {
    console.error("Error getting tasks by status:", error);
    return [];
  }
}

/**
 * Get completed tasks
 */
export function getCompletedTasks() {
  try {
    const tasks = loadTasks();
    return tasks.filter((t) => t.completed === true);
  } catch (error) {
    console.error("Error getting completed tasks:", error);
    return [];
  }
}

/**
 * Calculate total duration
 */
export function calculateTotalDuration(tasks = null) {
  try {
    const data = tasks || loadTasks();
    return data.reduce((sum, t) => sum + parseInt(t.duration), 0);
  } catch (error) {
    console.error("Error calculating total duration:", error);
    return 0;
  }
}

/**
 * Get tasks grouped by tag
 */
export function getTasksByTagGrouped() {
  try {
    const tasks = loadTasks();
    const grouped = {};

    tasks.forEach((t) => {
      if (!grouped[t.tag]) {
        grouped[t.tag] = [];
      }
      grouped[t.tag].push(t);
    });

    return grouped;
  } catch (error) {
    console.error("Error grouping tasks:", error);
    return {};
  }
}

/**
 * Get task counts by tag
 */
export function getTaskCountsByTag() {
  try {
    const tasks = loadTasks();
    const counts = {};

    tasks.forEach((t) => {
      counts[t.tag] = (counts[t.tag] || 0) + 1;
    });

    return counts;
  } catch (error) {
    console.error("Error getting task counts:", error);
    return {};
  }
}

/**
 * Get tasks due within N days
 */
export function getTasksDueInDays(days = 7) {
  try {
    const tasks = loadTasks();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);

    return tasks.filter((t) => {
      const dueDate = new Date(t.dueDate);
      return dueDate >= today && dueDate <= futureDate && !t.completed;
    });
  } catch (error) {
    console.error("Error getting tasks due soon:", error);
    return [];
  }
}

/* ============================================
   UTILITY FUNCTIONS
   ============================================ */

/**
 * Generate unique ID
 */
function generateId(prefix = "task") {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Check localStorage availability
 */
export function isStorageAvailable() {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get storage info
 */
export function getStorageInfo() {
  try {
    const tasks = localStorage.getItem(STORAGE_KEYS.TASKS) || "";
    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS) || "";

    const tasksSize = new Blob([tasks]).size;
    const settingsSize = new Blob([settings]).size;
    const totalSize = tasksSize + settingsSize;

    return {
      tasksSize,
      settingsSize,
      totalSize,
      tasksCount: loadTasks().length,
      formattedSize: formatBytes(totalSize),
    };
  } catch (error) {
    console.error("Error getting storage info:", error);
    return {
      tasksSize: 0,
      settingsSize: 0,
      totalSize: 0,
      tasksCount: 0,
      formattedSize: "0 B",
    };
  }
}

/**
 * Format bytes
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/* ============================================
   EXPORTS
   ============================================ */

export default {
  loadTasks,
  saveTasks,
  addTask,
  updateTask,
  deleteTask,
  completeTask,
  uncompleteTask,
  getTask,
  clearTasks,
  loadSettings,
  saveSettings,
  updateSetting,
  exportData,
  importData,
  uploadDataFromFile,
  getTasksByDateRange,
  getTasksByTag,
  getTasksByStatus,
  getCompletedTasks,
  calculateTotalDuration,
  getTasksByTagGrouped,
  getTaskCountsByTag,
  getTasksDueInDays,
  isStorageAvailable,
  getStorageInfo,
};
