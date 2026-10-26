import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Sistema do Pedro
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Página inicial
        </h1>

        <nav aria-label="Caminho de navegação" className="mt-8">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <li>Home</li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href="/aluno/cadastro"
                className="font-semibold text-blue-700 underline-offset-4 hover:underline"
              >
                Cadastro de aluno
              </Link>
            </li>
          </ol>
        </nav>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Alunos</h2>
          <p className="mt-2 text-slate-600">
            Acesse o cadastro de aluno para registrar um novo aluno no sistema.
          </p>
          <Link
            href="/aluno/cadastro"
            className="mt-5 inline-flex rounded-lg bg-blue-700 px-4 py-2 font-medium text-white transition hover:bg-blue-800"
          >
            Ir para cadastro de aluno
          </Link>
        </section>
      </div>
    </main>
  );
}
