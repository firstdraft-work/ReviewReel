import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-6xl font-black">404</h1>
      <p className="text-muted text-lg font-semibold">Page not found.</p>
      <Link
        className="bg-ink px-6 py-3 text-sm font-black text-white transition hover:bg-black"
        href="/"
      >
        Back to Home
      </Link>
    </main>
  );
}
