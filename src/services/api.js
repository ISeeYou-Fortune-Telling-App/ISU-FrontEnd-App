import { logoutCometChatUser } from "@/src/services/cometchat";
import { ensureHttpProtocol, resolveHostFromExpo } from "@/src/utils/network";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

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

const chatBaseURL =
  ensureHttpProtocol(process.env.EXPO_PUBLIC_CHAT_BASE_URL) ??
  resolveHostFromExpo(process.env.EXPO_PUBLIC_CHAT_PORT || 8081) ??
  "http://localhost:8081";

const API = axios.create({
  baseURL,
});

const ChatAPI = axios.create({
  baseURL: chatBaseURL,
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

ChatAPI.interceptors.request.use(async (config) => {
  if (config.skipAuth) {
    delete config.skipAuth;
    return config;
  }

  const token = await SecureStore.getItemAsync("authToken");
  if (token) {
    config.headers = config.headers ?? {};
    setAuthHeader(config.headers, token);
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
      await logoutCometChatUser();
      await SecureStore.deleteItemAsync("authToken");
      await SecureStore.deleteItemAsync("refreshToken");
      await SecureStore.deleteItemAsync("userRole");
      await SecureStore.deleteItemAsync("userId");
      await SecureStore.deleteItemAsync("cometChatUid");
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
      await logoutCometChatUser();
      await SecureStore.deleteItemAsync("authToken");
      await SecureStore.deleteItemAsync("refreshToken");
      await SecureStore.deleteItemAsync("userRole");
      await SecureStore.deleteItemAsync("userId");
      await SecureStore.deleteItemAsync("cometChatUid");
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export const loginUser = (data) => API.post("/core/auth/login", data);
export const logoutUser = (firebaseToken) => API.get("/core/auth/logout", { firebaseToken });
export const registerUser = (data) => API.post("/core/auth/register", data);
export const verifyEmail = (data) => API.post("/core/auth/verify-email", data);
export const deleteAccount = (userId, reason) => {
  if (!userId) {
    return Promise.reject(new Error("Missing userId"));
  }

  const config = reason
    ? { data: { reason } }
    : undefined;

  return API.delete(`/core/account/${userId}`, config);
};
export const getProfile = () => API.get("/core/account/me");
export const updateProfile = (data) => API.patch("/core/account/me", data);
export const getUser = (id) => API.get(`/core/account/${id}`);
export const getServicePackages = (params) => API.get("/core/public/service-packages", { params });
export const getSeers = (params) => API.get("/core/public/seers", { params });
export const getServicePackageDetail = (id) =>
  API.get("/core/service-packages/detail", { params: { id } });
export const getServicePackageInteractions = (packageId) =>
  API.get(`/core/service-packages/${packageId}/interactions`);
export const getServicePackageReviews = (id, params = {}) =>
  API.get(`/core/service-packages/${id}/reviews`, { params });
export const postServicePackageReview = (id, payload) =>
  API.post(`/core/service-packages/${id}/reviews`, payload);
export const updateServicePackageReview = (reviewId, payload) =>
  API.put(`/core/service-packages/reviews/${reviewId}`, payload);
export const getReviewReplies = (reviewId, params = {}) =>
  API.get(`/core/service-packages/reviews/${reviewId}/replies`, { params });
export const getKnowledgeItems = (params) => API.get("/core/knowledge-items", { params });
export const searchKnowledgeItems = (params) => {
  const queryParams = { ...params };
  if (queryParams.categoryIds && Array.isArray(queryParams.categoryIds)) {
    queryParams.categoryIds = queryParams.categoryIds.join(',');
  }
  return API.get("/core/knowledge-items/search", { params: queryParams });
};
export const getKnowledgeCategories = (params) => API.get("/core/public/knowledge-categories", { params });
export const getKnowledgeItemDetail = (id) => API.get(`/core/knowledge-items/${id}`);

export const getChatConversations = (params) =>
  ChatAPI.get("/chat/conversations", { params });

export const getChatConversation = (conversationId) =>
  ChatAPI.get(`/chat/conversations/${conversationId}`);

export const getChatConversationByBookingId = (bookingId) =>
  ChatAPI.get(`/chat/conversations/booking/${bookingId}`);

export const endChatSession = (conversationId) =>
  ChatAPI.post(`/chat/conversations/${conversationId}/end`);

export const extendChatSession = (conversationId, additionalMinutes) =>
  ChatAPI.post(`/chat/conversations/${conversationId}/extend`, null, {
    params: { additionalMinutes },
  });

// Admin conversations (ADMIN_CHAT)
export const getAdminConversations = (params) =>
  ChatAPI.get("/admin/conversations", { params });

export const getAdminConversation = (conversationId) =>
  ChatAPI.get(`/admin/conversations/${conversationId}`);

export const getCustomerPayments = (params) =>
  API.get("/core/bookings/my-payments", { params });

export const getSeerPayments = (params) =>
  API.get("/core/bookings/seer/payments", { params });

export const getPackageBookingReviews = (params) =>
  API.get("/core/bookings/seer/reviews", { params });

export const getChatMessages = (conversationId, params) =>
  ChatAPI.get(`/chat/conversations/${conversationId}/messages`, { params });

export const sendChatMessage = (conversationId, payload) => {
  const canUseFormData = typeof FormData !== "undefined";

  if (canUseFormData) {
    let formData;

    if (payload instanceof FormData) {
      formData = payload;
    } else {
      formData = new FormData();

      if (payload && typeof payload === "object") {
        Object.entries(payload).forEach(([key, value]) => {
          if (value === null || value === undefined) {
            return;
          }

          if (typeof value === "object" && value?.uri) {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        });
      }
    }

    const hasConversationIdField =
      typeof formData.get === "function"
        ? Boolean(formData.get("conversationId"))
        : Array.isArray(formData?._parts)
          ? formData._parts.some(
            (part) => Array.isArray(part) && part[0] === "conversationId" && part[1],
          )
          : false;

    if (!hasConversationIdField && conversationId) {
      formData.append("conversationId", String(conversationId));
    }

    return ChatAPI.post("/chat/messages", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }

  const body = { ...(payload ?? {}), conversationId };
  return ChatAPI.post("/chat/messages", body);
};

export const markConversationMessagesRead = (conversationId) =>
  ChatAPI.post(`/chat/conversations/${conversationId}/mark-read`);

export const deleteChatMessage = (messageId) =>
  ChatAPI.delete(`/chat/messages/${messageId}`);

export const recallChatMessage = (messageId) =>
  ChatAPI.post(`/chat/messages/${messageId}/recall`);

export const uploadChatFile = (formData) =>
  ChatAPI.post("/chat/messages/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const createReport = (payload) => {
  return API.post("/core/reports", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const updateUserStatus = (id, status) =>
  API.patch(`/core/account/${id}/status`, null, { params: { id, status } });

export const interactWithServicePackage = (packageId, payload) =>
  API.post(`/core/service-packages/${packageId}/interact`, payload);

export const createBooking = (servicePackageId, payload) =>
  API.post(`/core/bookings/${servicePackageId}`, payload);

export const createServicePackage = (seerId, data) =>
  API.post(`/core/service-packages?seerId=${seerId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateServicePackage = (id, data) =>
  API.put(`/core/service-packages?id=${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteServicePackage = (id) =>
  API.delete(`/core/service-packages/${id}`);

export const getMyPackages = (params) =>
  API.get("/core/service-packages/my-packages", { params });

export const forgotPassword = (email) =>
  API.post("/core/auth/forgot-password", { email });

export const resendOTP = (email) =>
  API.post("/core/auth/resend-otp", { email });

export const verifyForgotPassword = (data) =>
  API.post("/core/auth/forgot-password/verify", data);

export const getMyBookings = (params) =>
  API.get("/core/bookings/my-bookings", { params });

export const getBookingDetail = (id) =>
  API.get(`/core/bookings/${id}`);

export const submitBookingReview = (id, data) =>
  API.post(`/core/bookings/${id}/review`, data);

export const cancelBooking = (id) =>
  API.post(`/core/bookings/${id}/cancel`, { id });

export const confirmBooking = (id, data) =>
  API.post(`/core/bookings/${id}/seer-confirm`, data);

export const createChatSessionByBooking = (bookingId) =>
  ChatAPI.post(`/chat/conversations/booking/${bookingId}`);
export const registerSeer = (data) => {
  console.log("registerSeer called with data:", data);
  const formData = new FormData();

  // Add basic fields
  const basicFields = ['email', 'password', 'fullName', 'birthDate', 'gender', 'phoneNumber', 'profileDescription'];
  basicFields.forEach(field => {
    if (data[field] !== null && data[field] !== undefined && data[field] !== '') {
      formData.append(field, String(data[field]));
    }
  });

  // Add specialityIds (array)
  if (data.specialityIds && Array.isArray(data.specialityIds)) {
    data.specialityIds.forEach(id => {
      formData.append('specialityIds', id);
    });
  }

  // Add certificates (nested structure)
  if (data.certificates && Array.isArray(data.certificates)) {
    data.certificates.forEach((cert, index) => {
      if (cert.certificateName) {
        formData.append(`certificates[${index}].certificateName`, cert.certificateName);
      }
      if (cert.certificateDescription) {
        formData.append(`certificates[${index}].certificateDescription`, cert.certificateDescription);
      }
      if (cert.issuedBy) {
        formData.append(`certificates[${index}].issuedBy`, cert.issuedBy);
      }
      if (cert.issuedAt) {
        formData.append(`certificates[${index}].issuedAt`, cert.issuedAt);
      }
      if (cert.expirationDate) {
        formData.append(`certificates[${index}].expirationDate`, cert.expirationDate);
      }
      if (cert.certificateFile) {
        formData.append(`certificates[${index}].certificateFile`, cert.certificateFile);
      }
      // Add categoryIds for certificates
      if (cert.categoryIds && Array.isArray(cert.categoryIds)) {
        cert.categoryIds.forEach(categoryId => {
          formData.append(`certificates[${index}].categoryIds`, categoryId);
        });
      }
    });
  }

  console.log("FormData entries:");
  for (let [key, value] of formData.entries()) {
    console.log(key, value);
  }

  return API.post("/core/auth/seer/register", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const getNotifications = (params) => API.get("/notification/", { params });

export const getMyNotifications = (params) => API.get("/notification/me", { params });

export const getCertificates = (userId, params) => {
  if (!userId) {
    return Promise.reject(new Error("Missing userId"));
  }
  return API.get(`/core/certificates/by-user/${userId}`, { params });
};

export const createCertificate = (formData) => API.post("/core/certificates", formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export const updateCertificate = (id, formData) => API.patch(`/core/certificates/${id}`, formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export const deleteCertificate = (id) => API.delete(`/core/certificates/${id}`);

export const deleteNotification = (id) => API.delete(`/notification/${id}`);

export const markNotificationAsRead = (id) => API.patch(`/notification/${id}/read`);

export const getMyCustomerPotential = (params) => API.get("/report/my-customer-potential", { params });

export const getMySeerPerformance = (params) => API.get("/report/my-seer-performance", { params });

export const getSeerPerformance = (params) => API.get("/report/seer-performance", { params });
export const getSeerSalaryHistory = (params) => API.get("/core/bookings/payment/my-seer-salary", { params });

export default API;
// /notification
// /report
