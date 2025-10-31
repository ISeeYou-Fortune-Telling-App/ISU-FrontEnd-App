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
      return "http://10.0.2.2:8080";
    }
    if (Platform.OS === "ios") {
      return "http://localhost:8080";
    }
    return null;
  }

  return `http://${host}:8080`;
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
  ensureHttpProtocol(process.env.EXPO_PUBLIC_API_BASE_URL) ??
  resolveHostFromExpo() ??
  "http://localhost:8080";

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
      const refreshResponse = await API.get("/auth/refresh", {
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

export const loginUser = (data) => API.post("/auth/login", data);
export const registerUser = (data) => API.post("/auth/register", data);
export const deleteAccount = (userId, reason) => {
  if (!userId) {
    return Promise.reject(new Error("Missing userId"));
  }

  const config = reason
    ? { data: { reason } }
    : undefined;

  return API.delete(`/account/${userId}`, config);
};
export const getProfile = () => API.get("/account/me");
export const updateProfile = (data) => API.patch("/account/me", data);
export const getServicePackages = (params) => API.get("/public/service-packages", { params });
export const getServicePackageDetail = (id) =>
  API.get("/service-packages/detail", { params: { id } });
export const getServicePackageReviews = (id) =>
  API.get(`/service-packages/${id}/reviews`, { params: { id } });
export const getKnowledgeItems = (params) => API.get("/knowledge-items", { params });
export const searchKnowledgeItems = (params) => {
  const queryParams = { ...params };
  if (queryParams.categoryIds && Array.isArray(queryParams.categoryIds)) {
    queryParams.categoryIds = queryParams.categoryIds.join(',');
  }
  return API.get("/knowledge-items/search", { params: queryParams });
};
export const getKnowledgeCategories = (params) => API.get("/knowledge-categories", { params });

export const getChatConversations = (params) =>
  API.get("/chat/conversations", { params });

export const getChatMessages = (conversationId, params) =>
  API.get(`/chat/conversations/${conversationId}/messages`, { params });

export const sendChatMessage = (conversationId, payload) => {
  const config =
    typeof FormData !== "undefined" && payload instanceof FormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined;

  return API.post(`/chat/conversations/${conversationId}/messages`, payload, config);
};

export const createReport = (payload) => {
  return API.post("/reports", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const chatWithAI = (payload) => API.post("/ai-chat/query", payload);

export const updateUserStatus = (id, status) =>
  API.patch(`/account/${id}/status`, null, { params: { id, status } });

export const interactWithServicePackage = (packageId, payload) =>
  API.post(`/service-packages/${packageId}/interact`, payload);

export const createBooking = (servicePackageId, payload) =>
  API.post(`/bookings/${servicePackageId}`, payload);

export const createServicePackage = (seerId, data) =>
  API.post(`/service-packages?seerId=${seerId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateServicePackage = (id, seerId, data) =>
  API.put(`/service-packages?id=${id}&seerId=${seerId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteServicePackage = (id) =>
  API.delete(`/service-packages/${id}`);

export const getMyPackages = (params) =>
  API.get("/service-packages/my-packages", { params });

export const forgotPassword = (email) =>
  API.post("/auth/forgot-password", { email });

export const resendOTP = (email) =>
  API.post("/auth/resend-otp", { email });

export const verifyForgotPassword = (data) =>
  API.post("/auth/forgot-password/verify", data);

export const getMyBookings = (params) =>
  API.get("/bookings/my-bookings", { params });

export const getBookingDetail = (id) =>
  API.get(`/bookings/${id}`);

export default API;
