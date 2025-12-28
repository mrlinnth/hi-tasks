// Main application logic
import api from "./api.js";
import db from "./db.js";
import sync from "./sync.js";

class TodoApp {
  constructor() {
    this.tasks = [];
    this.currentTask = null;
    this.isOnline = navigator.onLine;
    this.currentFilter = "all";
    this.searchText = "";
    this.elements = {};
  }

  async init() {
    // Initialize database
    await db.init();

    // Initialize sync manager
    sync.init();
    sync.addListener(this.handleSyncStatus.bind(this));

    // Cache DOM elements
    this.cacheElements();

    // Bind event listeners
    this.bindEvents();

    // Load saved API token
    this.loadSavedToken();

    // Register service worker
    this.registerServiceWorker();

    // Load initial tasks
    await this.loadTasks();

    // Initial sync if online and token is set
    if (this.isOnline && api.hasToken()) {
      this.syncTasks();
    } else if (!api.hasToken()) {
      console.log("API token not set. Please configure in Settings.");
    }
  }

  cacheElements() {
    this.elements = {
      addTaskForm: document.getElementById("addTaskForm"),
      taskInput: document.getElementById("taskInput"),
      taskList: document.getElementById("taskList"),
      emptyState: document.getElementById("emptyState"),
      syncStatus: document.getElementById("syncStatus"),
      taskDetail: document.getElementById("taskDetail"),
      backdrop: document.getElementById("backdrop"),
      closeDetail: document.getElementById("closeDetail"),
      detailTitle: document.getElementById("detailTitle"),
      detailComplete: document.getElementById("detailComplete"),
      detailDueDate: document.getElementById("detailDueDate"),
      detailDescription: document.getElementById("detailDescription"),
      toggleImportant: document.getElementById("toggleImportant"),
      deleteTask: document.getElementById("deleteTask"),
      settingsBtn: document.getElementById("settingsBtn"),
      settingsPanel: document.getElementById("settingsPanel"),
      closeSettings: document.getElementById("closeSettings"),
      apiTokenInput: document.getElementById("apiTokenInput"),
      saveToken: document.getElementById("saveToken"),
      tokenStatus: document.getElementById("tokenStatus"),
      clearAllData: document.getElementById("clearAllData"),
      filterBtns: document.querySelectorAll(".filter-btn"),
    };
  }

  bindEvents() {
    // Add task form
    this.elements.addTaskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleAddTask();
    });

    // Task input for real-time filtering
    this.elements.taskInput.addEventListener("input", (e) => {
      this.searchText = e.target.value.trim();
      this.renderTasks();
    });

    // Detail panel
    this.elements.closeDetail.addEventListener("click", () =>
      this.closeDetail()
    );
    this.elements.backdrop.addEventListener("click", () => {
      this.closeDetail();
      this.closeSettings();
    });

    // Detail inputs
    this.elements.detailTitle.addEventListener("blur", () =>
      this.saveCurrentTask()
    );
    this.elements.detailComplete.addEventListener("change", () =>
      this.saveCurrentTask()
    );
    this.elements.detailDueDate.addEventListener("change", () =>
      this.saveCurrentTask()
    );
    this.elements.detailDescription.addEventListener("blur", () =>
      this.saveCurrentTask()
    );
    this.elements.toggleImportant.addEventListener("click", () =>
      this.toggleImportant()
    );
    this.elements.deleteTask.addEventListener("click", () =>
      this.handleDeleteTask()
    );

    // Settings panel
    this.elements.settingsBtn.addEventListener("click", () =>
      this.openSettings()
    );
    this.elements.closeSettings.addEventListener("click", () =>
      this.closeSettings()
    );
    this.elements.saveToken.addEventListener("click", () =>
      this.saveApiToken()
    );
    this.elements.clearAllData.addEventListener("click", () =>
      this.clearAllData()
    );

    // Filter buttons
    this.elements.filterBtns.forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.handleFilterClick(e.target.dataset.filter)
      );
    });
  }

  async loadTasks() {
    try {
      this.tasks = await db.getAllTasks();
      this.renderTasks();
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  }

  async syncTasks() {
    try {
      await sync.fullSync();
      await this.loadTasks();
    } catch (error) {
      console.error("Error syncing tasks:", error);
    }
  }

  renderTasks() {
    const container = this.elements.taskList;
    const emptyState = this.elements.emptyState;

    // Filter tasks based on current filter
    const filteredTasks = this.getFilteredTasks();

    // Update filter counts
    this.updateFilterCounts();

    if (filteredTasks.length === 0) {
      container.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    // Sort: incomplete first, then by importance, then by due date
    const sortedTasks = [...filteredTasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.important !== b.important) return b.important ? 1 : -1;
      if (a.dueDate && b.dueDate)
        return new Date(a.dueDate) - new Date(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

    container.innerHTML = sortedTasks
      .map((task) => this.createTaskHTML(task))
      .join("");

    // Bind task item events
    container.querySelectorAll(".task-item").forEach((item) => {
      const taskId = item.dataset.taskId;
      const checkbox = item.querySelector(".task-checkbox");

      checkbox.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleComplete(taskId);
      });

      item.addEventListener("click", () => {
        this.openDetail(taskId);
      });
    });
  }

  getFilteredTasks() {
    let filteredTasks;

    switch (this.currentFilter) {
      case "active":
        filteredTasks = this.tasks.filter((task) => !task.completed);
        break;
      case "completed":
        filteredTasks = this.tasks.filter((task) => task.completed);
        break;
      case "priority":
        // Priority: active tasks that are due today OR important
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filteredTasks = this.tasks.filter((task) => {
          if (task.completed) return false;

          // Check if due date is today
          const dueToday = task.dueDate
            ? (() => {
                const taskDate = new Date(task.dueDate);
                taskDate.setHours(0, 0, 0, 0);
                return taskDate.getTime() === today.getTime();
              })()
            : false;

          // Return if due today OR important
          return dueToday || task.important;
        });
        break;
      case "all":
      default:
        filteredTasks = this.tasks;
    }

    // Filter by search text if present
    if (this.searchText) {
      const searchTerm = this.searchText.toLowerCase();
      filteredTasks = filteredTasks.filter((task) =>
        task.title.toLowerCase().startsWith(searchTerm)
      );
    }

    return filteredTasks;
  }

  handleFilterClick(filter) {
    this.currentFilter = filter;

    // Update active button
    this.elements.filterBtns.forEach((btn) => {
      if (btn.dataset.filter === filter) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    this.renderTasks();
  }

  updateFilterCounts() {
    const allCount = this.tasks.length;
    const activeCount = this.tasks.filter((task) => !task.completed).length;
    const completedCount = this.tasks.filter((task) => task.completed).length;

    // Priority count: active tasks that are due today OR important
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const priorityCount = this.tasks.filter((task) => {
      if (task.completed) return false;

      // Check if due date is today
      const dueToday = task.dueDate
        ? (() => {
            const taskDate = new Date(task.dueDate);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate.getTime() === today.getTime();
          })()
        : false;

      // Return if due today OR important
      return dueToday || task.important;
    }).length;

    this.elements.filterBtns.forEach((btn) => {
      const filter = btn.dataset.filter;
      const countSpan = btn.querySelector(".filter-count");
      if (!countSpan) return;

      switch (filter) {
        case "all":
          countSpan.textContent = allCount;
          break;
        case "priority":
          countSpan.textContent = priorityCount;
          break;
        case "active":
          countSpan.textContent = activeCount;
          break;
        case "completed":
          countSpan.textContent = completedCount;
          break;
      }
    });
  }

  createTaskHTML(task) {
    const dueDate = task.dueDate ? this.formatDueDate(task.dueDate) : null;
    const isOverdue =
      dueDate && new Date(task.dueDate) < new Date() && !task.completed;

    return `
            <div class="task-item ${task.completed ? "completed" : ""} ${
      task.important ? "important" : ""
    }" data-task-id="${task._id}">
                <input type="checkbox" class="task-checkbox" ${
                  task.completed ? "checked" : ""
                }>
                <div class="task-content">
                    <div class="task-title">${this.escapeHTML(task.title)}</div>
                    ${
                      dueDate || task.description
                        ? `
                        <div class="task-meta">
                            ${
                              dueDate
                                ? `<span class="task-due-date ${
                                    isOverdue ? "overdue" : ""
                                  }">📅 ${dueDate}</span>`
                                : ""
                            }
                        </div>
                    `
                        : ""
                    }
                </div>
                <span class="task-star">${task.important ? "★" : "☆"}</span>
            </div>
        `;
  }

  async handleAddTask() {
    const title = this.elements.taskInput.value.trim();
    if (!title) return;

    const newTask = {
      title,
      completed: false,
      important: false,
      dueDate: null,
      description: "",
    };

    try {
      if (this.isOnline) {
        // Create on server
        const created = await api.createTask(newTask);
        await db.saveTask(created);
        this.tasks.push(created);
      } else {
        // Create locally with temporary ID
        const tempId = `temp_${Date.now()}`;
        const localTask = { ...newTask, _id: tempId };
        await db.saveTask(localTask);
        await sync.queueOperation("create", newTask);
        this.tasks.push(localTask);
      }

      // Clear input and reset search filter
      this.elements.taskInput.value = "";
      this.searchText = "";

      // Re-render tasks to show all
      this.renderTasks();
    } catch (error) {
      console.error("Error adding task:", error);
      alert("Failed to add task. Please try again.");
    }
  }

  async toggleComplete(taskId) {
    const task = this.tasks.find((t) => t._id === taskId);
    if (!task) return;

    task.completed = !task.completed;

    try {
      await db.saveTask(task);

      if (this.isOnline) {
        await api.updateTask(taskId, task);
      } else {
        await sync.queueOperation("update", task);
      }

      this.renderTasks();

      if (this.currentTask && this.currentTask._id === taskId) {
        this.elements.detailComplete.checked = task.completed;
      }
    } catch (error) {
      console.error("Error toggling task:", error);
      task.completed = !task.completed;
      this.renderTasks();
    }
  }

  async toggleImportant() {
    if (!this.currentTask) return;

    this.currentTask.important = !this.currentTask.important;

    try {
      await db.saveTask(this.currentTask);

      if (this.isOnline) {
        await api.updateTask(this.currentTask._id, this.currentTask);
      } else {
        await sync.queueOperation("update", this.currentTask);
      }

      const taskIndex = this.tasks.findIndex(
        (t) => t._id === this.currentTask._id
      );
      if (taskIndex !== -1) {
        this.tasks[taskIndex] = { ...this.currentTask };
      }

      this.renderTasks();
      this.updateImportantButton();
    } catch (error) {
      console.error("Error toggling important:", error);
      this.currentTask.important = !this.currentTask.important;
    }
  }

  async handleDeleteTask() {
    if (!this.currentTask) return;

    if (!confirm("Delete this task?")) return;

    const taskId = this.currentTask._id;

    try {
      await db.deleteTask(taskId);

      if (this.isOnline) {
        await api.deleteTask(taskId);
      } else {
        await sync.queueOperation("delete", { _id: taskId });
      }

      this.tasks = this.tasks.filter((t) => t._id !== taskId);
      this.closeDetail();
      this.renderTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task. Please try again.");
    }
  }

  openDetail(taskId) {
    const task = this.tasks.find((t) => t._id === taskId);
    if (!task) return;

    this.currentTask = { ...task };

    this.elements.detailTitle.value = task.title;
    this.elements.detailComplete.checked = task.completed;
    this.elements.detailDueDate.value = task.dueDate || "";
    this.elements.detailDescription.value = task.description || "";

    this.updateImportantButton();

    this.elements.taskDetail.classList.add("open");
    this.elements.backdrop.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  closeDetail() {
    this.elements.taskDetail.classList.remove("open");
    this.elements.backdrop.classList.remove("active");
    document.body.style.overflow = "";
    this.currentTask = null;
  }

  async saveCurrentTask() {
    if (!this.currentTask) return;

    this.currentTask.title =
      this.elements.detailTitle.value.trim() || "Untitled";
    this.currentTask.completed = this.elements.detailComplete.checked;
    this.currentTask.dueDate = this.elements.detailDueDate.value || null;
    this.currentTask.description = this.elements.detailDescription.value.trim();

    try {
      await db.saveTask(this.currentTask);

      if (this.isOnline) {
        await api.updateTask(this.currentTask._id, this.currentTask);
      } else {
        await sync.queueOperation("update", this.currentTask);
      }

      const taskIndex = this.tasks.findIndex(
        (t) => t._id === this.currentTask._id
      );
      if (taskIndex !== -1) {
        this.tasks[taskIndex] = { ...this.currentTask };
      }

      this.renderTasks();
    } catch (error) {
      console.error("Error saving task:", error);
    }
  }

  updateImportantButton() {
    const btn = this.elements.toggleImportant;
    const starSpan = btn.querySelector(".star");
    if (this.currentTask && this.currentTask.important) {
      btn.classList.add("active");
      starSpan.textContent = "★";
    } else {
      btn.classList.remove("active");
      starSpan.textContent = "☆";
    }
  }

  handleSyncStatus(status) {
    const syncStatus = this.elements.syncStatus;

    if (status.online !== undefined) {
      this.isOnline = status.online;
      if (status.online) {
        syncStatus.classList.remove("offline");
        syncStatus.querySelector(".sync-text").textContent = "Online";
      } else {
        syncStatus.classList.add("offline");
        syncStatus.querySelector(".sync-text").textContent = "Offline";
      }
    }

    if (status.syncing !== undefined) {
      if (status.syncing) {
        syncStatus.classList.add("syncing");
        syncStatus.querySelector(".sync-text").textContent = "Syncing...";
      } else {
        syncStatus.classList.remove("syncing");
        syncStatus.querySelector(".sync-text").textContent = this.isOnline
          ? "Online"
          : "Offline";
      }
    }
  }

  async registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register("/sw.js");
        console.log("Service Worker registered");
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    }
  }

  formatDueDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return "Today";
    } else if (date.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  }

  escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Settings Panel Methods
  loadSavedToken() {
    const savedToken = api.getToken();
    if (savedToken) {
      this.elements.apiTokenInput.value = savedToken;
    }
  }

  openSettings() {
    this.closeDetail(); // Close task detail if open
    this.elements.settingsPanel.classList.add("open");
    this.elements.backdrop.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  closeSettings() {
    this.elements.settingsPanel.classList.remove("open");
    this.elements.backdrop.classList.remove("active");
    document.body.style.overflow = "";
    // Clear status message
    this.elements.tokenStatus.className = "token-status";
  }

  async saveApiToken() {
    const token = this.elements.apiTokenInput.value.trim();

    if (!token) {
      this.showTokenStatus("Please enter a valid API token", "error");
      return;
    }

    // Save token
    api.setToken(token);

    // Test the token by trying to fetch tasks
    try {
      await api.getTasks();
      this.showTokenStatus("Token saved successfully!", "success");

      // Sync tasks after successful token save
      setTimeout(() => {
        this.closeSettings();
        if (this.isOnline) {
          this.syncTasks();
        }
      }, 1500);
    } catch (error) {
      this.showTokenStatus(
        "Invalid token or network error. Please check and try again.",
        "error"
      );
      console.error("Token validation error:", error);
    }
  }

  showTokenStatus(message, type) {
    this.elements.tokenStatus.textContent = message;
    this.elements.tokenStatus.className = `token-status ${type}`;

    // Auto-hide success messages
    if (type === "success") {
      setTimeout(() => {
        this.elements.tokenStatus.className = "token-status";
      }, 3000);
    }
  }

  async clearAllData() {
    const confirmed = confirm(
      "This will delete all tasks, clear the cache, and reset all settings. This action cannot be undone. Continue?"
    );

    if (!confirmed) return;

    try {
      // 1. Clear IndexedDB
      await db.clearTasks();
      await db.clearQueue();

      // 2. Clear localStorage
      localStorage.clear();

      // 3. Clear all caches
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // 4. Unregister service worker
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => registration.unregister())
        );
      }

      // 5. Reload the page to show clean state
      window.location.reload(true);
    } catch (error) {
      console.error("Error clearing data:", error);
      alert(
        "Failed to clear all data. Please try again or clear manually through browser settings."
      );
    }
  }
}

// Initialize app
const app = new TodoApp();
app.init();
