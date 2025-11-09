import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ensureHttpProtocol = (raw) => {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
};

const resolveHostFromExpo = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.manifest?.debuggerHost ??
    Constants.manifest2?.extra?.expoClient?.hostUri ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (!hostUri) {
    return null;
  }

  const host = hostUri.split(":")[0];
  if (!host) {
    return null;
  }

  if (host.includes("localhost") || host.startsWith("127.")) {
    if (Platform.OS === "android") {
      return "http://10.0.2.2:8085";
    }
    if (Platform.OS === "ios") {
      return "http://localhost:8085";
    }
    return null;
  }

  return `http://${host}:8085`;
};

const setAuthHeader = (headers, token) => {
  if (!headers || !token) {
    return;
  }

  if (typeof headers.set === "function") {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    headers.Authorization = `Bearer ${token}`;
  }
};

const baseURL =
  ensureHttpProtocol(process.env.EXPO_PUBLIC_API_BASE_URL_NOTI) ??
  resolveHostFromExpo() ??
  "http://localhost:8085";

const API = axios.create({
  baseURL,
});

let isRefreshing = false;
const refreshQueue = [];

const processRefreshQueue = (token, error) => {
  while (refreshQueue.length > 0) {
    const { resolve, reject } = refreshQueue.shift();
    if (token) {
      resolve(token);
    } else {
      reject(error);
    }
  }
};

API.interceptors.request.use(async (config) => {
  if (config.skipAuth) {
    delete config.skipAuth;
    return config;
  }

  const token = await SecureStore.getItemAsync("authToken");
  if (token) {
    config.headers = config.headers ?? {};
    setAuthHeader(config.headers, token);
    if (!API.defaults.headers.common) {
      API.defaults.headers.common = {};
    }
    setAuthHeader(API.defaults.headers.common, token);
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;

    if (status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    if (!refreshToken) {
      await SecureStore.deleteItemAsync("authToken");
      await SecureStore.deleteItemAsync("refreshToken");
      await SecureStore.deleteItemAsync("userRole");
      await SecureStore.deleteItemAsync("userId");
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token) => {
            if (!token) {
              reject(error);
              return;
            }
            originalRequest.headers = originalRequest.headers ?? {};
            setAuthHeader(originalRequest.headers, token);
            resolve(API(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshResponse = await API.get("/core/auth/refresh", {
        skipAuth: true,
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      const payload = refreshResponse?.data?.data;
      const newToken = payload?.token;
      const newRefreshToken = payload?.refreshToken;

      if (!newToken) {
        throw new Error("Unable to refresh access token");
      }

      await SecureStore.setItemAsync("authToken", newToken);
      if (newRefreshToken) {
        await SecureStore.setItemAsync("refreshToken", newRefreshToken);
      }

      if (!API.defaults.headers.common) {
        API.defaults.headers.common = {};
      }
      setAuthHeader(API.defaults.headers.common, newToken);
      processRefreshQueue(newToken);

      originalRequest.headers = originalRequest.headers ?? {};
      setAuthHeader(originalRequest.headers, newToken);

      return API(originalRequest);
    } catch (refreshError) {
      processRefreshQueue(null, refreshError);
      await SecureStore.deleteItemAsync("authToken");
      await SecureStore.deleteItemAsync("refreshToken");
      await SecureStore.deleteItemAsync("userRole");
      await SecureStore.deleteItemAsync("userId");
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export const getNotifications = (params) => API.get("/notification", { params });

export const getMyNotifications = (params) => API.get("/notification/me", { params });

export const deleteNotification = (id) => API.delete(`/notification/${id}`);

export const markNotificationAsRead = (id) => API.patch(`/notification/${id}/read`);

export default API;