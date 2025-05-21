export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      {children}
    </main>
  );
}
