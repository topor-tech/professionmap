import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("vacancies", "routes/vacancies.tsx"),
] satisfies RouteConfig;
