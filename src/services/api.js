import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080",
});

API.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
export const getServicePackages = (params) => API.get("/service-packages", { params });
export const getServicePackageDetail = (id) =>
  API.get("/service-packages/detail", { params: { id } });
export const getKnowledgeItems = (params) => API.get("/knowledge-items", { params });
export const searchKnowledgeItems = (params) => API.get("/knowledge-items/search", { params });
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

export const chatWithAI = (payload) => API.post("/ai-chat/query", payload);

export const updateUserStatus = (id, status) =>
  API.patch(`/account/${id}/status`, null, { params: { id, status } });

export const createServicePackage = (seerId, data) =>
  API.post(`/service-packages?seerId=${seerId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateServicePackage = (id, seerId, data) =>
  API.put(`/service-packages?id=${id}&seerId=${seerId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const forgotPassword = (email) =>
  API.post("/auth/forgot-password", { email });

export const resendOTP = (email) =>
  API.post("/auth/resend-otp", { email });

export const verifyForgotPassword = (data) =>
  API.post("/auth/forgot-password/verify", data);

export default API;
