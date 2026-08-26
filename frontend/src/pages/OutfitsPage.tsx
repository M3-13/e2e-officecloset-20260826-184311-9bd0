import { useCallback, useState } from "react";
import OutfitCreator from "../components/OutfitCreator";
import OutfitList from "../components/OutfitList";

export default function OutfitsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <section className="page">
      <h1 className="page__title">Outfits</h1>
      <OutfitCreator onSaved={reload} />
      <OutfitList refreshKey={refreshKey} />
    </section>
  );
}
