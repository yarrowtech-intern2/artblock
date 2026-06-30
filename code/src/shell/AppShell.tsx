import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "../components/layout/BottomNav";
import { Footer } from "../components/layout/Footer";
import { Header } from "../components/layout/Header";
import { useAuth } from "../providers/AuthProvider";

export const AppShell = () => {
  const { status } = useAuth();
  const location = useLocation();
  const isAuthed = status === "authenticated";
  const isShortsRoute = location.pathname === "/shorts";
  const isLandingRoute =
    location.pathname === "/" ||
    location.pathname === "/classic-home" ||
    location.pathname === "/login" ||
    location.pathname === "/signup";
  const isChromelessRoute =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    isShortsRoute;
  const hasSharedHeader = !isChromelessRoute;

  return (
    <div
      className={`app-frame${isAuthed ? " app-frame--authed" : ""}${
        isShortsRoute ? " app-frame--immersive" : ""
      }${
        hasSharedHeader ? " app-frame--with-header" : ""
      }`}
    >
      {hasSharedHeader ? <Header /> : null}
      <main
        className={`page-shell${isLandingRoute ? " page-shell--landing" : ""}${
          isShortsRoute ? " page-shell--immersive" : ""
        }`}
      >
        <Outlet />
      </main>
      {isChromelessRoute ? null : isAuthed ? <BottomNav /> : <Footer />}
    </div>
  );
};
