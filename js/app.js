/* ============================================
   CAMPUS PLANNER - MULTI-PAGE APP
   Works with separate HTML files
   ============================================ */

// Import modules
import {
  validateTitle,
  validateDuration,
  validateDueDate,
  validateTag,
  validatePriority,
} from "./validators.js";
import {
  loadTasks,
  addTask as saveNewTask,
  updateTask as saveUpdatedTask,
  deleteTask as removeTask,
  completeTask,
  uncompleteTask,
  clearTasks,
  loadSettings,
  saveSettings,
  exportData,
  uploadDataFromFile,
} from "./storage.js";
import {
  renderTasks,
  updateDashboard,
  updateCompletedPage,
  updateTimelinePage,
  filterTasksByRegex,
  sortTasks,
} from "./ui.js";

/* ============================================
   PAGE INITIALIZATION
   ============================================ */

class App {
  constructor() {
    this.currentPage = this.detectCurrentPage();
    this.init();
  }

  detectCurrentPage() {
    const path = window.location.pathname;

    if (path.includes("dashboard")) return "dashboard";
    if (path.includes("add-task")) return "add-task";
    if (path.includes("task")) return "tasks";
    if (path.includes("completed")) return "completed";
    if (path.includes("timeline")) return "timeline";
    if (path.includes("settings")) return "settings";
    if (path.includes("about")) return "about";
    if (path.includes("home")) return "home";

    return "home";
  }

  init() {
    console.log(`📅 Campus Planner initialized on ${this.currentPage} page!`);

    // Initialize mobile menu
    this.setupMobileMenu();

    // Initialize based on current page
    switch (this.currentPage) {
      case "home":
        this.initHomePage();
        break;
      case "dashboard":
        this.initDashboardPage();
        break;
      case "tasks":
        this.initTasksPage();
        break;
      case "add-task":
        this.initAddTaskPage();
        break;
      case "completed":
        this.initCompletedPage();
        break;
      case "timeline":
        this.initTimelinePage();
        break;
      case "settings":
        this.initSettingsPage();
        break;
      case "about":
        this.initAboutPage();
        break;
    }
  }

  setupMobileMenu() {
    const navToggle = document.querySelector(".nav-toggle");
    const navMenu = document.querySelector(".nav-menu");

    if (navToggle && navMenu) {
      navToggle.addEventListener("click", () => {
        const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
        navToggle.setAttribute("aria-expanded", !isExpanded);
        navMenu.classList.toggle("active");
      });
    }
  }

  /* ============================================
     HOME PAGE
     ============================================ */
  initHomePage() {
    const tasks = loadTasks();

    // Update home stats
    const totalTasks = document.getElementById("home-total-tasks");
    const dueWeek = document.getElementById("home-due-week");

    if (totalTasks) {
      const activeTasks = tasks.filter((t) => !t.completed);
      totalTasks.textContent = activeTasks.length;
    }

    if (dueWeek) {
      const today = new Date();
      const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const dueThisWeek = tasks.filter((t) => {
        const dueDate = new Date(t.dueDate);
        return dueDate >= today && dueDate <= weekLater && !t.completed;
      });

      dueWeek.textContent = dueThisWeek.length;
    }
  }

  /* ============================================
     DASHBOARD PAGE
     ============================================ */
  initDashboardPage() {
    updateDashboard();
  }

  /* ============================================
     TASKS PAGE
     ============================================ */
  initTasksPage() {
    // Render tasks
    renderTasks();

    // Setup search
    this.setupSearch();

    // Setup sort buttons
    this.setupSortButtons();

    // Setup add task button
    const addBtn = document.getElementById("add-task-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        window.location.href = "./add-task.html";
      });
    }
  }

  setupSearch() {
    const searchInput = document.getElementById("regex-search");
    const caseSensitive = document.getElementById("case-sensitive");
    const searchError = document.getElementById("search-error");

    if (!searchInput) return;

    let searchTimeout;

    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const pattern = searchInput.value.trim();

        if (!pattern) {
          renderTasks();
          if (searchError) searchError.textContent = "";
          return;
        }

        try {
          const flags = caseSensitive?.checked ? "" : "i";
          const regex = new RegExp(pattern, flags);

          if (searchError) searchError.textContent = "";
          filterTasksByRegex(regex);
        } catch (error) {
          if (searchError) {
            searchError.textContent = `Invalid regex: ${error.message}`;
          }
        }
      }, 300);
    });

    if (caseSensitive) {
      caseSensitive.addEventListener("change", () => {
        searchInput.dispatchEvent(new Event("input"));
      });
    }
  }

  setupSortButtons() {
    let currentSort = { field: "dueDate", order: "asc" };

    const sortBtns = {
      date: document.getElementById("sort-date"),
      title: document.getElementById("sort-title"),
      duration: document.getElementById("sort-duration"),
    };

    Object.entries(sortBtns).forEach(([field, btn]) => {
      if (btn) {
        btn.addEventListener("click", () => {
          // Map button names to actual field names
          const fieldMap = {
            date: "dueDate",
            title: "title",
            duration: "duration",
          };

          const actualField = fieldMap[field];

          // Toggle order if same field
          if (currentSort.field === actualField) {
            currentSort.order = currentSort.order === "desc" ? "asc" : "desc";
          } else {
            currentSort.field = actualField;
            currentSort.order = field === "date" ? "asc" : "desc";
          }

          sortTasks(currentSort.field, currentSort.order);
        });
      }
    });
  }

  /* ============================================
     ADD/EDIT TASK PAGE
     ============================================ */
  initAddTaskPage() {
    const form = document.getElementById("task-form");
    if (!form) return;

    // Check if editing (ID in URL)
    const params = new URLSearchParams(window.location.search);
    const editingId = params.get("id");

    if (editingId) {
      this.loadTaskForEdit(editingId);
      const heading = document.getElementById("form-heading");
      if (heading) heading.textContent = "Edit Task";
    }

    // Setup form submit
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleTaskSubmit(editingId);
    });

    // Setup cancel button
    const cancelBtn = document.getElementById("cancel-form");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        window.location.href = "./tasks.html";
      });
    }
  }

  loadTaskForEdit(id) {
    const tasks = loadTasks();
    const task = tasks.find((t) => t.id === id);

    if (task) {
      document.getElementById("title").value = task.title;
      document.getElementById("dueDate").value = task.dueDate;
      document.getElementById("duration").value = task.duration;
      document.getElementById("tag").value = task.tag;
      document.getElementById("priority").value = task.priority || "Medium";
      if (task.location) {
        document.getElementById("location").value = task.location;
      }
    }
  }

  handleTaskSubmit(editingId) {
    const formData = {
      title: document.getElementById("title").value.trim(),
      dueDate: document.getElementById("dueDate").value.trim(),
      duration: document.getElementById("duration").value.trim(),
      tag: document.getElementById("tag").value,
      priority: document.getElementById("priority").value,
      location: document.getElementById("location").value.trim(),
    };

    // Validate
    const errors = this.validateTaskForm(formData);

    if (errors.length > 0) {
      this.displayErrors(errors);
      return;
    }

    this.clearErrors();

    // Save
    let result;
    if (editingId) {
      result = saveUpdatedTask(editingId, formData);
    } else {
      result = saveNewTask(formData);
    }

    if (result) {
      alert("✅ Task saved!");
      window.location.href = "./tasks.html";
    } else {
      alert("❌ Failed to save task");
    }
  }

  validateTaskForm(data) {
    const errors = [];

    const titleResult = validateTitle(data.title);
    if (!titleResult.valid) {
      errors.push({ field: "title", message: titleResult.error });
    }

    const durationResult = validateDuration(data.duration);
    if (!durationResult.valid) {
      errors.push({ field: "duration", message: durationResult.error });
    }

    const dateResult = validateDueDate(data.dueDate);
    if (!dateResult.valid) {
      errors.push({ field: "dueDate", message: dateResult.error });
    }

    const tagResult = validateTag(data.tag);
    if (!tagResult.valid) {
      errors.push({ field: "tag", message: tagResult.error });
    }

    if (data.priority) {
      const priorityResult = validatePriority(data.priority);
      if (!priorityResult.valid) {
        errors.push({ field: "priority", message: priorityResult.error });
      }
    }

    return errors;
  }

  displayErrors(errors) {
    errors.forEach((error) => {
      const errorEl = document.getElementById(`${error.field}-error`);
      const inputEl = document.getElementById(error.field);

      if (errorEl) errorEl.textContent = error.message;
      if (inputEl) {
        inputEl.classList.add("error");
        inputEl.setAttribute("aria-invalid", "true");
      }
    });

    if (errors.length > 0) {
      const firstField = document.getElementById(errors[0].field);
      if (firstField) firstField.focus();
    }
  }

  clearErrors() {
    document
      .querySelectorAll(".error-message")
      .forEach((el) => (el.textContent = ""));
    document.querySelectorAll(".form-input.error").forEach((el) => {
      el.classList.remove("error");
      el.removeAttribute("aria-invalid");
    });
  }

  /* ============================================
     COMPLETED PAGE
     ============================================ */
  initCompletedPage() {
    updateCompletedPage();
  }

  /* ============================================
     TIMELINE PAGE
     ============================================ */
  initTimelinePage() {
    updateTimelinePage();

    // Setup time filter buttons
    const timeFilterBtns = document.querySelectorAll(".time-filter .btn");

    timeFilterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        timeFilterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const period = btn.dataset.period;
        console.log("Filter timeline by:", period, "days");
        // Can call updateTimelinePage with period if needed
      });
    });
  }

  /* ============================================
     SETTINGS PAGE
     ============================================ */
  initSettingsPage() {
    const settings = loadSettings();

    // Populate form
    const timeUnit = document.getElementById("time-unit");
    const weeklyTarget = document.getElementById("weekly-target");

    if (timeUnit && settings.timeUnit) {
      timeUnit.value = settings.timeUnit;
    }
    if (weeklyTarget && settings.weeklyTarget !== undefined) {
      weeklyTarget.value = settings.weeklyTarget;
    }

    // Setup form submit
    const settingsForm = document.getElementById("settings-form");
    if (settingsForm) {
      settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveSettingsData();
      });
    }

    // Setup export
    const exportBtn = document.getElementById("export-data");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportData());
    }

    // Setup import
    const importBtn = document.getElementById("import-data");
    if (importBtn) {
      importBtn.addEventListener("change", (e) =>
        this.importData(e.target.files[0])
      );
    }

    // Setup clear
    const clearBtn = document.getElementById("clear-data");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.clearData());
    }
  }

  saveSettingsData() {
    const settings = {
      timeUnit: document.getElementById("time-unit").value,
      weeklyTarget: parseFloat(document.getElementById("weekly-target").value),
    };

    const success = saveSettings(settings);

    const statusEl = document.getElementById("settings-status");
    if (statusEl) {
      if (success) {
        statusEl.textContent = "✅ Settings saved successfully!";
        statusEl.className = "form-status success";
      } else {
        statusEl.textContent = "❌ Failed to save settings";
        statusEl.className = "form-status error";
      }

      setTimeout(() => {
        statusEl.textContent = "";
        statusEl.className = "form-status";
      }, 3000);
    }
  }

  exportData() {
    const data = exportData();
    if (!data) {
      alert("❌ Failed to export data");
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campus-planner-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    alert("✅ Data exported successfully!");
  }

  async importData(file) {
    if (!file) return;

    try {
      const result = await uploadDataFromFile(file);

      if (result.success) {
        alert(`✅ ${result.message}\n\nRefreshing page...`);
        location.reload();
      } else {
        alert(`❌ Import failed: ${result.message}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }
  }

  clearData() {
    if (confirm("⚠️ Are you sure? This will delete ALL tasks!")) {
      if (confirm("⚠️ Really sure? This cannot be undone!")) {
        const success = clearTasks();
        if (success) {
          alert("✅ All data cleared!");
          location.reload();
        } else {
          alert("❌ Failed to clear data");
        }
      }
    }
  }

  /* ============================================
     ABOUT PAGE
     ============================================ */
  initAboutPage() {
    console.log("About page loaded");
  }
}

/* ============================================
   GLOBAL HANDLERS
   ============================================ */

// Delete task handler
window.handleDelete = function (id) {
  if (!confirm("⚠️ Delete this task?")) return;

  const success = removeTask(id);

  if (success) {
    alert("✅ Task deleted!");
    location.reload();
  } else {
    alert("❌ Failed to delete");
  }
};

// Complete task handler
window.handleComplete = function (id) {
  const success = completeTask(id);

  if (success) {
    alert("✅ Task marked as completed!");
    location.reload();
  } else {
    alert("❌ Failed to complete task");
  }
};

// Uncomplete task handler
window.handleUncomplete = function (id) {
  const success = uncompleteTask(id);

  if (success) {
    alert("✅ Task restored!");
    location.reload();
  } else {
    alert("❌ Failed to restore task");
  }
};

// Edit task handler
window.handleEdit = function (id) {
  window.location.href = `./add-task.html?id=${id}`;
};

/* ============================================
   INITIALIZE ON PAGE LOAD
   ============================================ */

document.addEventListener("DOMContentLoaded", () => {
  window.app = new App();
});

export { App };
