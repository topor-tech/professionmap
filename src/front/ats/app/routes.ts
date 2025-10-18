import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("cabinet", "routes/cabinet.tsx"),
  route("cabinet/my-companies", "routes/my-companies.tsx"),
  route("cabinet/my-vacancies", "routes/my-vacancies.tsx"),
  route("admin", "routes/admin.tsx"),
] satisfies RouteConfig;
