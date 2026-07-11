import Nav from '@/components/Nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-6 pb-24">{children}</main>
    </div>
  );
}
