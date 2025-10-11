import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API = axios.create({
  baseURL: "https://192.168.100.175:8080",
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

export default API;
