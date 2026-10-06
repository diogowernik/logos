"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="workspace"><h1>Não foi possível carregar.</h1>
    <p>Tente novamente em alguns instantes.</p><button onClick={reset}>Tentar novamente</button>
  </main>;
}
