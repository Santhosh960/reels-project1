import { ReelFeed } from "@/components/ReelFeed";

const Index = () => {
  return (
    <>
      {/* SEO Meta Tags would be handled by Helmet in a real app */}
      <main className="min-h-screen bg-background">
        <ReelFeed />
      </main>
    </>
  );
};

export default Index;