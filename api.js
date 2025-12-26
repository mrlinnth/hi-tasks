// Cockpit CMS API wrapper
const API_URL = "https://cms.hiyan.xyz/:hi-tasks/api";
const CONTENT_NAME = "tasks";
const STORAGE_KEY = "cockpit_api_token";

class CockpitAPI {
  constructor() {
    this.baseUrl = API_URL;
    this.contentName = CONTENT_NAME;
  }

  getToken() {
    return localStorage.getItem(STORAGE_KEY) || "";
  }

  setToken(token) {
    localStorage.setItem(STORAGE_KEY, token);
  }

  hasToken() {
    return !!this.getToken();
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();

    if (!token) {
      throw new Error(
        "API token not configured. Please set your token in Settings."
      );
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "api-key": token,
      ...options.headers,
    };

    const config = {
      ...options,
      headers,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Get all tasks
  async getTasks() {
    try {
      const data = await this.request(`/content/items/${this.contentName}`, {
        method: "GET",
      });
      return data || [];
    } catch (error) {
      console.error("Error fetching tasks:", error);
      throw error;
    }
  }

  // Get single task
  async getTask(id) {
    try {
      const data = await this.request(
        `/content/item/${this.contentName}/${id}`,
        {
          method: "GET",
        }
      );
      return data;
    } catch (error) {
      console.error("Error fetching task:", error);
      throw error;
    }
  }

  // Create or update task (Cockpit uses same endpoint for both)
  async saveTask(taskData, id = null) {
    try {
      const payload = {
        data: {
          title: taskData.title,
          completed: taskData.completed || false,
          important: taskData.important || false,
          dueDate: taskData.dueDate || null,
          description: taskData.description || "",
          _state: 1, // Publish state
        },
      };

      // If ID is provided, append it to the payload for update
      if (id) {
        payload.data._id = id;
      }

      const endpoint = `/content/item/${this.contentName}`;

      const data = await this.request(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      return data;
    } catch (error) {
      console.error(`Error ${id ? "updating" : "creating"} task:`, error);
      throw error;
    }
  }

  // Create task (convenience method)
  async createTask(taskData) {
    return this.saveTask(taskData);
  }

  // Update task (convenience method)
  async updateTask(id, taskData) {
    return this.saveTask(taskData, id);
  }

  // Delete task
  async deleteTask(id) {
    try {
      const data = await this.request(
        `/content/item/${this.contentName}/${id}`,
        {
          method: "DELETE",
        }
      );

      return data;
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  }
}

export default new CockpitAPI();
