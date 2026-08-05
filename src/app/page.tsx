export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-3xl border border-black/5 bg-white p-8 shadow-sm sm:p-12">
        <p className="mb-3 text-sm font-semibold tracking-widest text-emerald-700 uppercase">
          Foundation ready
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Habit Ledger
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-black/65">
          A private, encouraging place to check in quickly and see your week
          clearly.
        </p>
      </section>
    </main>
  );
}
