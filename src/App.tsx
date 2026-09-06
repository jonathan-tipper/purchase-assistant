import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/features/decisions/WorkspaceContext";
import Shell from "@/components/Shell";
const Home = lazy(() => import("@/pages/Home"));
const Decision = lazy(() => import("@/pages/Decision"));
const Outcomes = lazy(() => import("@/pages/Outcomes"));
const Workspace = lazy(() => import("@/pages/Workspace"));
const Auth = lazy(() => import("@/pages/Auth"));
function Root() {
  const { user, loading } = useAuth();
  return loading ? (
    <div className="loading-state" role="status">
      Restoring your session…
    </div>
  ) : (
    <WorkspaceProvider key={user?.id ?? "guest"}>
      <Shell />
    </WorkspaceProvider>
  );
}
function ErrorPage() {
  return (
    <div className="page empty-state">
      <h1>Something interrupted this page.</h1>
      <p>Your last saved decisions have been kept. Reload to try again.</p>
      <a className="button primary" href="/">
        Open workspace
      </a>
    </div>
  );
}
const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/decisions/:id", element: <Decision /> },
      { path: "/outcomes", element: <Outcomes /> },
      { path: "/workspace", element: <Workspace /> },
      { path: "/advisor", element: <Navigate to="/" replace /> },
      { path: "/journal", element: <Navigate to="/outcomes" replace /> },
      { path: "*", element: <ErrorPage /> },
    ],
  },
  { path: "/auth", element: <Auth />, errorElement: <ErrorPage /> },
]);
export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <Suspense
          fallback={
            <div className="loading-state" role="status">
              Opening your decision…
            </div>
          }
        >
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  );
}
