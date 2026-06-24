import { createBrowserRouter } from "react-router-dom";
import { lazyRoute } from "./lib/lazyRoute";
import { AppShell } from "./shell/AppShell";
import { ProtectedLayout } from "./shell/ProtectedLayout";
import { RouteErrorPage } from "./views/RouteErrorPage";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: "/",
        lazy: lazyRoute(() => import("./views/NewHomePage"), "NewHomePage")
      },
      {
        path: "/classic-home",
        lazy: lazyRoute(() => import("./views/HomePage"), "HomePage")
      },
      {
        path: "/login",
        lazy: lazyRoute(() => import("./views/LoginPage"), "LoginPage")
      },
      {
        path: "/signup",
        lazy: lazyRoute(() => import("./views/SignupPage"), "SignupPage")
      },
      {
        path: "/terms",
        lazy: lazyRoute(() => import("./views/TermsPage"), "TermsPage")
      },
      {
        path: "/creators/:slug",
        lazy: lazyRoute(() => import("./views/PublicProfilePage"), "PublicProfilePage")
      },
      {
        path: "/profiles/:id",
        lazy: lazyRoute(() => import("./views/PublicProfilePage"), "PublicProfilePage")
      },
      {
        element: <ProtectedLayout />,
        children: [
          {
            path: "/feed",
            lazy: lazyRoute(() => import("./views/FeedPage"), "FeedPage")
          },
          {
            path: "/dashboard",
            lazy: lazyRoute(() => import("./views/DashboardPage"), "DashboardPage")
          },
          {
            path: "/messages",
            lazy: lazyRoute(() => import("./views/MessagesPage"), "MessagesPage")
          },
          {
            path: "/notifications",
            lazy: lazyRoute(() => import("./views/NotificationsPage"), "NotificationsPage")
          }
        ]
      }
    ]
  },
  {
    path: "*",
    errorElement: <RouteErrorPage />,
    lazy: lazyRoute(() => import("./views/NotFoundPage"), "NotFoundPage")
  }
]);
