import api from "./api";

export const dashboardService = {
  getAdminStats: () => api.get("/dashboard/admin"),
};
