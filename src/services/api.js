// This URL will be replaced with the actual Google Apps Script Web App URL later
const API_URL = 'https://script.google.com/macros/s/AKfycbz9_3RPLzV0zDdl_X0MOq21fAc7UtpfIHgTho2_8571FrVqln9APpbwe0ldv-5zC2wHWg/exec';

/**
 * Utility to fetch data from Google Apps Script
 * Note: GAS uses CORS, so we often use POST with text/plain or GET
 * For this mock, we just use a generic fetch wrapper
 */

// Batas waktu request agar tidak gantung 1 menit saat backend mati/lambat (GAS cold start / deployment 404)
const REQUEST_TIMEOUT_MS = 15000;

const fetchWithTimeout = async (url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

// Baca JSON dengan pesan error yang jelas kalau GAS mengembalikan halaman HTML (deployment 404 / akses ditutup)
const readJson = async (response, label) => {
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (body.trimStart().startsWith('<')) {
      throw new Error(
        `${label} gagal (HTTP ${response.status}): backend Google Apps Script mengembalikan halaman HTML, bukan JSON. ` +
        `Penyebab umum: deployment Web App sudah tidak valid / belum di-deploy sebagai versi baru dengan akses "Anyone".`
      );
    }
    throw new Error(`${label} gagal (HTTP ${response.status})`);
  }
  if (!contentType.includes('json')) {
    const body = await response.text().catch(() => '');
    if (body.trimStart().startsWith('<')) {
      throw new Error(
        `${label} gagal: backend mengembalikan halaman HTML, bukan JSON. ` +
        `Redeploy Apps Script (New version, Execute as Me, Who has access Anyone) lalu update API_URL.`
      );
    }
  }
  return response.json();
};

const timedError = (error, label) => {
  if (error?.name === 'AbortError') {
    throw new Error(`${label} timeout (> ${REQUEST_TIMEOUT_MS / 1000} dtk): backend tidak merespons. Cek koneksi / deployment GAS.`);
  }
  throw error;
};

export const api = {
  login: async (nik, password) => {
    // Mock implementation for UI showcase
    if (!API_URL || API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
      console.warn("API_URL is not set. Using mock login.");
      return { success: true, role: 'admin', name: 'User Mock' };
    }

    // Real implementation
    try {
      const response = await fetchWithTimeout(`${API_URL}?action=login&nik=${nik}&password=${password}`);
      return await readJson(response, 'Login');
    } catch (error) {
      console.error("Login Error", error);
      return timedError(error, 'Login');
    }
  },

  getTransactions: async () => {
    if (!API_URL || API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
      return []; // Return mock data in components if not set
    }

    try {
      const response = await fetchWithTimeout(`${API_URL}?action=getTransactions`);
      return await readJson(response, 'Ambil transaksi');
    } catch (error) {
      console.error("Fetch Error", error);
      return timedError(error, 'Ambil transaksi');
    }
  },

  addProgress: async (transactionId, stage, notes, inputBy) => {
    if (!API_URL || API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
      console.warn("API_URL is not set. Mocking progress addition.");
      return { success: true };
    }

    try {
      // For GAS POST, often we need to send form data or text/plain
      const response = await fetchWithTimeout(API_URL, {
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
      return await readJson(response, 'Simpan progress');
    } catch (error) {
      console.error("Submit Error", error);
      return timedError(error, 'Simpan progress');
    }
  },

  createTransaction: async (id, item, inputBy) => {
    if (!API_URL || API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
      console.warn("API_URL is not set. Mocking transaction creation.");
      return { success: true };
    }

    try {
      const response = await fetchWithTimeout(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'createTransaction',
          id,
          item,
          inputBy
        })
      });
      return await readJson(response, 'Buat transaksi');
    } catch (error) {
      console.error("Create Transaction Error", error);
      return timedError(error, 'Buat transaksi');
    }
  },

  getUsers: async () => {
    if (!API_URL || API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
      return []; // mock data if not connected
    }

    try {
      const response = await fetchWithTimeout(`${API_URL}?action=getUsers`);
      return await readJson(response, 'Ambil users');
    } catch (error) {
      console.error("Get Users Error", error);
      return timedError(error, 'Ambil users');
    }
  },

  addUser: async (nik, password, role, name) => {
    if (!API_URL || API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
      console.warn("API_URL is not set. Mocking user addition.");
      return { success: true };
    }

    try {
      const response = await fetchWithTimeout(API_URL, {
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
      return await readJson(response, 'Tambah user');
    } catch (error) {
      console.error("Add User Error", error);
      return timedError(error, 'Tambah user');
    }
  },

  updateUser: async (nik, password, role, name) => {
    if (!API_URL || API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
      console.warn("API_URL is not set. Mocking user update.");
      return { success: true };
    }

    try {
      const response = await fetchWithTimeout(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'updateUser',
          nik,
          password,
          role,
          name
        })
      });
      return await readJson(response, 'Update user');
    } catch (error) {
      console.error("Update User Error", error);
      return timedError(error, 'Update user');
    }
  },

  deleteUser: async (nik) => {
    if (!API_URL || API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
      console.warn("API_URL is not set. Mocking user deletion.");
      return { success: true };
    }

    try {
      const response = await fetchWithTimeout(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'deleteUser',
          nik
        })
      });
      return await readJson(response, 'Hapus user');
    } catch (error) {
      console.error("Delete User Error", error);
      return timedError(error, 'Hapus user');
    }
  },

  deleteTransaction: async (id) => {
    if (!API_URL || API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
      console.warn("API_URL is not set. Mocking transaction deletion.");
      return { success: true };
    }

    try {
      const response = await fetchWithTimeout(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'deleteTransaction',
          id
        })
      });
      return await readJson(response, 'Hapus transaksi');
    } catch (error) {
      console.error("Delete Transaction Error", error);
      return timedError(error, 'Hapus transaksi');
    }
  }
};
