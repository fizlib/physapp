import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 gap-4">
      <h1 className="text-4xl font-bold">Physapp</h1>
      <p className="text-xl text-muted-foreground">Physics Education Platform</p>
      <div className="flex gap-4">
        <Link href="/login" className="text-blue-500 hover:underline">
          Login
        </Link>
      </div>
    </div>
  );
}
