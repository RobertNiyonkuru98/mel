/* ============================================
   CAMPUS PLANNER - UI MODULE
   Rendering and display logic for tasks
   ============================================ */

import {
  loadTasks,
  loadSettings,
  calculateTotalDuration,
  getTaskCountsByTag,
  getTasksDueInDays,
  getCompletedTasks,
} from "./storage.js";

import { highlightMatches, minutesToHours } from "./validators.js";

/* ============================================
   TASKS RENDERING
   ============================================ */

/**
 * Render all tasks to the page
 */
export function renderTasks(tasks = null, searchRegex = null) {
  const data = tasks || loadTasks().filter((t) => !t.completed);

  const cardsContainer = document.getElementById("tasks-cards");
  const tableBody = document.getElementById("tasks-tbody");
  const emptyState = document.getElementById("empty-state");

  if (cardsContainer) cardsContainer.innerHTML = "";
  if (tableBody) tableBody.innerHTML = "";

  if (data.length === 0) {
    if (emptyState) emptyState.removeAttribute("hidden");
    return;
  }

  if (emptyState) emptyState.setAttribute("hidden", "");

  // Sort by due date (nearest first)
  const sorted = [...data].sort(
    (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
  );

  sorted.forEach((task) => {
    renderTaskCard(task, cardsContainer, searchRegex);
    renderTaskRow(task, tableBody, searchRegex);
  });
}

/**
 * Render task card (mobile)
 */
function renderTaskCard(task, container, searchRegex = null) {
  if (!container) return;

  const card = document.createElement("div");
  card.className = "task-card";
  card.dataset.id = task.id;

  const title = searchRegex
    ? highlightMatches(task.title, searchRegex)
    : escapeHtml(task.title);

  const priorityClass =
    {
      High: "priority-high",
      Medium: "priority-medium",
      Low: "priority-low",
    }[task.priority] || "priority-medium";

  card.innerHTML = `
        <div class="task-card-header">
            <strong class="task-title">${title}</strong>
            <span class="priority-badge ${priorityClass}">${
    task.priority || "Medium"
  }</span>
        </div>
        <div class="task-meta">
            ${getTagEmoji(task.tag)} ${escapeHtml(
    task.tag
  )} • Due: ${formatDate(task.dueDate)} • ${minutesToHours(task.duration)}
            ${task.location ? ` • 📍 ${escapeHtml(task.location)}` : ""}
        </div>
        <div class="task-status">
            <span class="status-badge">${task.status || "Todo"}</span>
        </div>
        <div class="task-actions">
            <button class="btn btn-secondary" onclick="handleEdit('${
              task.id
            }')" aria-label="Edit task">✏️ Edit</button>
            <button class="btn btn-success" onclick="handleComplete('${
              task.id
            }')" aria-label="Complete task">✓ Complete</button>
            <button class="btn btn-danger" onclick="handleDelete('${
              task.id
            }')" aria-label="Delete task">🗑️ Delete</button>
        </div>
    `;

  container.appendChild(card);
}

/**
 * Render task row (desktop table)
 */
function renderTaskRow(task, tbody, searchRegex = null) {
  if (!tbody) return;

  const row = document.createElement("tr");
  row.dataset.id = task.id;

  const title = searchRegex
    ? highlightMatches(task.title, searchRegex)
    : escapeHtml(task.title);

  const priorityClass =
    {
      High: "priority-high",
      Medium: "priority-medium",
      Low: "priority-low",
    }[task.priority] || "priority-medium";

  row.innerHTML = `
        <td>${formatDate(task.dueDate)}</td>
        <td>${title}</td>
        <td>${getTagEmoji(task.tag)} ${escapeHtml(task.tag)}</td>
        <td>${minutesToHours(task.duration)}</td>
        <td><span class="priority-badge ${priorityClass}">${
    task.priority || "Medium"
  }</span></td>
        <td><span class="status-badge">${task.status || "Todo"}</span></td>
        <td>
            <button class="btn btn-secondary" style="padding: 6px 12px;" onclick="handleEdit('${
              task.id
            }')">✏️</button>
            <button class="btn btn-success" style="padding: 6px 12px;" onclick="handleComplete('${
              task.id
            }')">✓</button>
            <button class="btn btn-danger" style="padding: 6px 12px;" onclick="handleDelete('${
              task.id
            }')">🗑️</button>
        </td>
    `;

  tbody.appendChild(row);
}

/* ============================================
   DASHBOARD RENDERING
   ============================================ */

/**
 * Update dashboard
 */
export function updateDashboard() {
  updateMetrics();
  updateTimeStatus();
  updateTimelineChart();
  updateTopTags();
}

/**
 * Update metric cards
 */
function updateMetrics() {
  const tasks = loadTasks();
  const activeTasks = tasks.filter((t) => !t.completed);

  // Total tasks
  const totalEl = document.getElementById("total-tasks");
  if (totalEl) {
    totalEl.textContent = activeTasks.length;
  }

  // Due this week
  const weekTasks = getTasksDueInDays(7);
  const weekEl = document.getElementById("week-tasks");
  if (weekEl) {
    weekEl.textContent = weekTasks.length;
  }

  // Total hours
  const totalDuration = calculateTotalDuration(activeTasks);
  const totalHours = (totalDuration / 60).toFixed(1);
  const hoursEl = document.getElementById("total-hours");
  if (hoursEl) {
    hoursEl.textContent = `${totalHours}h`;
  }

  // Completed count
  const completed = getCompletedTasks();
  const completedEl = document.getElementById("completed-count");
  if (completedEl) {
    completedEl.textContent = completed.length;
  }
}

/**
 * Update time status with progress bar
 */
function updateTimeStatus() {
  const settings = loadSettings();
  const tasks = loadTasks().filter((t) => !t.completed);
  const totalMinutes = calculateTotalDuration(tasks);
  const totalHours = totalMinutes / 60;
  const target = settings.weeklyTarget || 40;

  const percentage = (totalHours / target) * 100;

  const progressBar = document.getElementById("time-progress");
  if (progressBar) {
    progressBar.style.width = `${Math.min(percentage, 100)}%`;
    progressBar.parentElement.setAttribute(
      "aria-valuenow",
      Math.round(percentage)
    );

    progressBar.className = "progress-fill";
    if (percentage >= 100) {
      progressBar.classList.add("danger");
    } else if (percentage >= 80) {
      progressBar.classList.add("warning");
    }
  }

  const timeCapEl = document.getElementById("time-cap");
  if (timeCapEl) {
    timeCapEl.textContent = `${target} hours`;
  }

  const messageEl = document.getElementById("time-message");
  if (messageEl) {
    const remaining = target - totalHours;

    messageEl.className = "time-message";

    if (remaining > 0) {
      messageEl.textContent = `✅ ${remaining.toFixed(1)} hours under target`;
      messageEl.classList.add("success");
      messageEl.setAttribute("aria-live", "polite");
    } else if (remaining === 0) {
      messageEl.textContent = `⚠️ Target reached`;
      messageEl.classList.add("warning");
      messageEl.setAttribute("aria-live", "assertive");
    } else {
      messageEl.textContent = `❌ ${Math.abs(remaining).toFixed(
        1
      )} hours over target!`;
      messageEl.classList.add("danger");
      messageEl.setAttribute("aria-live", "assertive");
    }
  }
}

/**
 * Update timeline chart
 */
function updateTimelineChart() {
  const chartContainer = document.getElementById("timeline-chart");
  if (!chartContainer) return;

  const upcomingTasks = getTasksDueInDays(7);

  chartContainer.innerHTML = "";

  if (upcomingTasks.length === 0) {
    chartContainer.innerHTML =
      '<p style="text-align: center; color: var(--text-secondary);">No upcoming tasks</p>';
    return;
  }

  upcomingTasks.slice(0, 5).forEach((task) => {
    const bar = document.createElement("div");
    const duration = parseInt(task.duration);
    const heightPercent = Math.min((duration / 180) * 100, 100); // Max 3 hours = 100%

    bar.style.cssText = `
            flex: 1;
            background: linear-gradient(to top, var(--primary), var(--primary-light));
            border-radius: 4px 4px 0 0;
            height: ${heightPercent}%;
            min-height: 20px;
            position: relative;
        `;

    bar.title = `${task.title} - ${minutesToHours(duration)}`;

    chartContainer.appendChild(bar);
  });
}

/**
 * Update top tags list
 */
function updateTopTags() {
  const listEl = document.getElementById("top-tags-list");
  if (!listEl) return;

  const tagCounts = getTaskCountsByTag();

  const sorted = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  listEl.innerHTML = "";

  if (sorted.length === 0) {
    listEl.innerHTML = "<li>No tasks yet</li>";
    return;
  }

  sorted.forEach(([tag, count]) => {
    const li = document.createElement("li");
    li.innerHTML = `
            <span>${getTagEmoji(tag)} ${escapeHtml(tag)}</span>
            <strong>${count} tasks</strong>
        `;
    listEl.appendChild(li);
  });
}

/* ============================================
   COMPLETED PAGE
   ============================================ */

/**
 * Update completed page
 */
export function updateCompletedPage() {
  const allTasks = loadTasks();
  const completedTasks = getCompletedTasks();

  // Update completion rate
  const rateEl = document.getElementById("completion-rate");
  const detailEl = document.getElementById("completion-detail");

  if (allTasks.length > 0) {
    const rate = ((completedTasks.length / allTasks.length) * 100).toFixed(0);
    if (rateEl) rateEl.textContent = `${rate}%`;
    if (detailEl)
      detailEl.textContent = `${completedTasks.length} of ${allTasks.length} tasks`;
  } else {
    if (rateEl) rateEl.textContent = "0%";
    if (detailEl) detailEl.textContent = "0 of 0 tasks";
  }

  // Render completed tasks
  const cardsContainer = document.getElementById("completed-cards");
  const noCompleted = document.getElementById("no-completed");

  if (!cardsContainer) return;

  cardsContainer.innerHTML = "";

  if (completedTasks.length === 0) {
    if (noCompleted) noCompleted.style.display = "block";
    return;
  }

  if (noCompleted) noCompleted.style.display = "none";

  completedTasks.forEach((task) => {
    const card = document.createElement("div");
    card.className = "task-card completed";
    card.style.opacity = "0.7";

    card.innerHTML = `
            <div style="text-decoration: line-through;">
                <strong>${escapeHtml(task.title)}</strong>
                <p style="font-size: 12px; color: var(--text-secondary); margin: 5px 0;">
                    ${getTagEmoji(task.tag)} ${escapeHtml(
      task.tag
    )} • Completed ${task.completedAt ? formatDate(task.completedAt) : ""}
                </p>
            </div>
            <div style="margin-top: 10px;">
                <button class="btn btn-secondary" style="padding: 6px 12px;" onclick="handleUncomplete('${
                  task.id
                }')">↩️ Undo</button>
                <button class="btn btn-danger" style="padding: 6px 12px;" onclick="handleDelete('${
                  task.id
                }')">🗑️ Delete</button>
            </div>
        `;

    cardsContainer.appendChild(card);
  });
}

/* ============================================
   TIMELINE PAGE
   ============================================ */

/**
 * Update timeline page
 */
export function updateTimelinePage() {
  updateWeeklyTimeline();
  updateTagBreakdown();
}

/**
 * Update weekly timeline
 */
function updateWeeklyTimeline() {
  const chartContainer = document.getElementById("weekly-timeline");
  if (!chartContainer) return;

  const upcomingTasks = getTasksDueInDays(7);

  // Group by day
  const byDay = {};
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    byDay[dateStr] = [];
  }

  upcomingTasks.forEach((task) => {
    if (byDay[task.dueDate]) {
      byDay[task.dueDate].push(task);
    }
  });

  chartContainer.innerHTML = "";

  Object.entries(byDay).forEach(([date, tasks]) => {
    const totalMinutes = tasks.reduce(
      (sum, t) => sum + parseInt(t.duration),
      0
    );
    const totalHours = (totalMinutes / 60).toFixed(1);

    const bar = document.createElement("div");
    const heightPercent = Math.min((totalMinutes / 360) * 100, 100); // Max 6 hours = 100%

    bar.style.cssText = `
            flex: 1;
            background: linear-gradient(to top, var(--primary), var(--primary-light));
            border-radius: 4px 4px 0 0;
            height: ${heightPercent}%;
            min-height: ${tasks.length > 0 ? "20px" : "5px"};
        `;

    bar.title = `${formatDate(date)}: ${tasks.length} tasks (${totalHours}h)`;

    chartContainer.appendChild(bar);
  });
}

/**
 * Update tag breakdown chart
 */
function updateTagBreakdown() {
  const chartContainer = document.getElementById("tag-breakdown-chart");
  if (!chartContainer) return;

  const tagCounts = getTaskCountsByTag();
  const tasks = loadTasks().filter((t) => !t.completed);

  chartContainer.innerHTML = "";

  if (Object.keys(tagCounts).length === 0) {
    chartContainer.innerHTML =
      '<p style="text-align: center; color: var(--text-secondary);">No active tasks</p>';
    return;
  }

  // Calculate total duration per tag
  const tagDurations = {};
  tasks.forEach((task) => {
    tagDurations[task.tag] =
      (tagDurations[task.tag] || 0) + parseInt(task.duration);
  });

  // Sort by duration
  const sorted = Object.entries(tagDurations).sort((a, b) => b[1] - a[1]);

  const maxDuration = sorted[0][1];

  sorted.forEach(([tag, duration]) => {
    const item = document.createElement("div");
    item.style.margin = "15px 0";

    const percent = ((duration / maxDuration) * 100).toFixed(0);
    const hours = (duration / 60).toFixed(1);

    item.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                <span>${getTagEmoji(tag)} ${escapeHtml(tag)}</span>
                <span style="font-weight: 600;">${hours}h (${percent}%)</span>
            </div>
            <div class="progress-bar" style="height: 16px;">
                <div class="progress-fill" style="width: ${percent}%; background: var(--primary);"></div>
            </div>
        `;

    chartContainer.appendChild(item);
  });
}

/* ============================================
   SEARCH & FILTER
   ============================================ */

/**
 * Filter tasks by regex
 */
export function filterTasksByRegex(regex) {
  const tasks = loadTasks().filter((t) => !t.completed);

  if (!regex) {
    renderTasks(tasks);
    return;
  }

  const filtered = tasks.filter((t) => {
    return (
      regex.test(t.title) ||
      regex.test(t.tag) ||
      regex.test(t.dueDate) ||
      regex.test(t.status || "") ||
      regex.test(t.location || "")
    );
  });

  renderTasks(filtered, regex);
}

/**
 * Sort tasks
 */
export function sortTasks(field, order = "asc") {
  const tasks = loadTasks().filter((t) => !t.completed);

  const sorted = [...tasks].sort((a, b) => {
    let aVal, bVal;

    switch (field) {
      case "dueDate":
        aVal = new Date(a.dueDate);
        bVal = new Date(b.dueDate);
        break;
      case "title":
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
        break;
      case "duration":
        aVal = parseInt(a.duration);
        bVal = parseInt(b.duration);
        break;
      default:
        return 0;
    }

    if (order === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  renderTasks(sorted);
  updateSortButtonStates(field, order);
}

/**
 * Update sort button states
 */
function updateSortButtonStates(field, order) {
  const sortButtons = {
    dueDate: document.getElementById("sort-date"),
    title: document.getElementById("sort-title"),
    duration: document.getElementById("sort-duration"),
  };

  Object.values(sortButtons).forEach((btn) => {
    if (btn) {
      btn.classList.remove("active");
      btn.style.background = "";
      btn.style.color = "";
    }
  });

  const activeBtn = sortButtons[field];
  if (activeBtn) {
    activeBtn.classList.add("active");
    activeBtn.style.background = "var(--primary)";
    activeBtn.style.color = "white";

    const arrow = order === "asc" ? "⬆️" : "⬇️";
    const btnText = activeBtn.textContent.split(" ")[0];
    activeBtn.textContent = `${btnText} ${arrow}`;
  }
}

/* ============================================
   UTILITY FUNCTIONS
   ============================================ */

/**
 * Format date to readable string
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Get emoji for tag
 */
function getTagEmoji(tag) {
  const emojiMap = {
    Academic: "📚",
    Social: "👥",
    Personal: "📦",
    Extracurricular: "🎭",
    Health: "💪",
  };
  return emojiMap[tag] || "📌";
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* ============================================
   EXPORTS
   ============================================ */

export default {
  renderTasks,
  updateDashboard,
  updateCompletedPage,
  updateTimelinePage,
  filterTasksByRegex,
  sortTasks,
};
