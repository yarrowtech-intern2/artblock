import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";

const getErrorMessage = (error: unknown) => {
  if (isRouteErrorResponse(error)) {
    return error.statusText || "The page could not be loaded.";
  }

  if (error instanceof Error) {
    if (error.message.includes("Failed to fetch dynamically imported module")) {
      return "A fresh app version was deployed. Reload the page and try again.";
    }

    return error.message;
  }

  return "Something went wrong while loading this page.";
};

export const RouteErrorPage = () => {
  const error = useRouteError();
  const message = getErrorMessage(error);

  return (
    <div className="status-screen">
      <div className="status-screen__card">
        <h1>Page unavailable</h1>
        <p>{message}</p>
        <div className="dashboard-page__actions">
          <button className="solid-button" onClick={() => window.location.reload()} type="button">
            Reload
          </button>
          <Link className="ghost-button" to="/">
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
};
