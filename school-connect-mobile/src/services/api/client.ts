import axios from "axios";

import { env } from "../../config/env";
import { setupApiInterceptors } from "./interceptors";

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

setupApiInterceptors(apiClient);