export default async function StatusPage() {
  // You can also use an env var: process.env.NEXT_PUBLIC_API_BASE
  const res = await fetch("http://localhost:4000/health", { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text();
    return (
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-3">System Status</h1>
        <p className="text-red-600">Request failed: {res.status} {res.statusText}</p>
        <pre className="bg-gray-100 p-4 rounded text-xs">{text}</pre>
      </main>
    );
  }

  const data = await res.json();

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-3">System Status</h1>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm">{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
