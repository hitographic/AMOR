// This URL will be replaced with the actual Google Apps Script Web App URL later
const API_URL = 'https://script.google.com/macros/s/AKfycbxOhC--2gllnQ_nyzEI7epfdtHB1EYTPmCWBW6_8Eb9VuGu0N420yGVQSFSyWghsWYb4A/exec';

/**
 * Utility to fetch data from Google Apps Script
 * Note: GAS uses CORS, so we often use POST with text/plain or GET
 * For this mock, we just use a generic fetch wrapper
 */

export const api = {
  login: async (nik, password) => {
    // Mock implementation for UI showcase
    if (!API_URL || API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
      console.warn("API_URL is not set. Using mock login.");
      return { success: true, role: 'admin', name: 'User Mock' };
    }

    // Real implementation
    try {
      const response = await fetch(`${API_URL}?action=login&nik=${nik}&password=${password}`);
      return await response.json();
    } catch (error) {
      console.error("Login Error", error);
      throw error;
    }
  },

  getTransactions: async () => {
    if (!API_URL || API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
      return []; // Return mock data in components if not set
    }

    try {
      const response = await fetch(`${API_URL}?action=getTransactions`);
      return await response.json();
    } catch (error) {
      console.error("Fetch Error", error);
      throw error;
    }
  },

  addProgress: async (transactionId, stage, notes, inputBy) => {
    if (!API_URL || API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
      console.warn("API_URL is not set. Mocking progress addition.");
      return { success: true };
    }

    try {
      // For GAS POST, often we need to send form data or text/plain
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'addProgress',
          transactionId,
          stage,
          notes,
          inputBy
        })
      });
      return await response.json();
    } catch (error) {
      console.error("Submit Error", error);
      throw error;
    }
  },

  addUser: async (nik, password, role, name) => {
    if (!API_URL || API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
      console.warn("API_URL is not set. Mocking user addition.");
      return { success: true };
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'addUser',
          nik,
          password,
          role,
          name
        })
      });
      return await response.json();
    } catch (error) {
      console.error("Add User Error", error);
      throw error;
    }
  }
};
