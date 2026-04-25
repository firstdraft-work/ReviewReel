import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="px-6 py-4 flex items-center justify-between border-b border-line">
        <span className="text-sm font-bold uppercase tracking-[0.18em] text-muted">ReviewReel</span>
        <Link
          href="/generate"
          className="bg-ink px-5 py-2 text-sm font-bold text-white hover:bg-black transition"
        >
          Start Creating
        </Link>
      </nav>

      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl sm:text-6xl font-black leading-[1.08] text-balance">
            Turn reviews into<br />
            <span className="text-accent">15-second ads</span>
          </h1>
          <p className="mt-6 text-lg text-muted leading-7 max-w-lg mx-auto">
            Paste your business name and customer reviews. Upload store photos. Get a ready-to-post
            vertical marketing video in seconds — no editing skills needed.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/generate"
              className="bg-ink px-8 py-4 text-base font-black text-white hover:bg-black transition"
            >
              Generate Your Video
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 border-t border-line">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8">
          <Feature
            title="One-click generation"
            description="Enter business name and reviews. Select a template. Click generate. Done."
          />
          <Feature
            title="Chinese ready"
            description="Native Chinese script, voiceover, and industry-specific copy for local businesses."
          />
          <Feature
            title="Upload your photos"
            description="Add real store images as video backgrounds. Up to 5 photos, auto-cropped to 9:16."
          />
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-line text-center">
        <p className="text-muted text-sm font-semibold">ReviewReel — Local business video ads, made simple.</p>
      </footer>
    </main>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center sm:text-left">
      <h3 className="text-lg font-black">{title}</h3>
      <p className="mt-2 text-muted text-sm leading-6">{description}</p>
    </div>
  );
}
