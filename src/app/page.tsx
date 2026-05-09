import { AppBrand } from "@/components/app/app-brand";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-[2rem] border border-black/5 bg-white/75 p-10 shadow-[0_24px_80px_rgba(15,23,32,0.08)] backdrop-blur">
        <AppBrand />
      </div>
    </main>
  );
}

