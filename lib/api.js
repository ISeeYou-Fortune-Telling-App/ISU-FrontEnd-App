import axios from 'axios';
import * as SecureStore from "expo-secure-store";

const API = axios.create({
  baseURL: "https://localhost:8080",
});

API.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

//export const getUser = (id) => API.get(`/users/${id}`);
export const loginUser = (data) => API.post("/auth/login", data);
export const registerUser = (data) => API.post("/auth/register", data);

export default API;