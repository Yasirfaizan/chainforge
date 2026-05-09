import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-cf-muted">Error 404</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-cf-text">Page not found</h1>
      <p className="mt-3 max-w-lg text-sm text-cf-muted">
        The resource you are looking for does not exist or has been moved.
      </p>
      <Link to="/" className="mt-6 rounded-lg border border-cf-border bg-cf-card px-4 py-2 text-sm text-cf-text">
        Back to home
      </Link>
    </main>
  );
}

