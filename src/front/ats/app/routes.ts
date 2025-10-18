import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("cabinet", "routes/cabinet.tsx"),
  route("cabinet/my-companies", "routes/my-companies.tsx"),
  route("cabinet/my-vacancies", "routes/my-vacancies.tsx"),
  route("cabinet/funnel", "routes/funnel.tsx"),
  route("admin", "routes/admin.tsx"),
  route("apply", "routes/apply.tsx"),
  route("job_page/:id", "routes/job_page.tsx"),
] satisfies RouteConfig;
