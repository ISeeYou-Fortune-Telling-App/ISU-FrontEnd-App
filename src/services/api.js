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
export const deleteAccount = (reason) => {
  const config = reason
    ? { data: { reason } }
    : {};
  return API.delete("/users/me", config);
};
export const getProfile = () => API.get("/account/me");
export const updateProfile = (data) => API.patch("/account/me", data);
export const getServicePackages = (params) => API.get("/service-packages", { params });
export const getServicePackageDetail = (id) =>
  API.get("/service-packages/detail-with-seer", { params: { id } });
export const getKnowledgeItems = (params) => API.get("/knowledge-items", { params });

export const updateUserStatus = (id, status) =>
  API.patch(`/account/${id}/status`, { id, status });

export const createServicePackage = (seerId, data) =>
  API.post(`/service-packages?seerId=${seerId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateServicePackage = (id, seerId, data) =>
  API.put(`/service-packages?id=${id}&seerId=${seerId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export default API;
