import { SearchExperience } from "@/components/search-experience";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <div className="shell">
      <SiteHeader />
      <main>
        <SearchExperience />
      </main>
    </div>
  );
}
