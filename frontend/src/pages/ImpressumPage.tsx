export default function ImpressumPage() {
  return (
    <section className="page">
      <h1 className="page__title">Impressum</h1>

      <h2>Angaben gemäß § 5 DDG</h2>
      <p className="page__text">
        Glamour Garderobe
        <br />
        Beispielstraße 1
        <br />
        10115 Berlin
        <br />
        Deutschland
      </p>

      <h2>Vertreten durch</h2>
      <p className="page__text">Max Mustermann (Geschäftsführung)</p>

      <h2>Kontakt</h2>
      <p className="page__text">
        Telefon: +49 (0)30 1234567
        <br />
        E-Mail: kontakt@glamour-garderobe.example
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p className="page__text">Max Mustermann (Anschrift wie oben)</p>

      <h2>Haftungshinweis</h2>
      <p className="page__text">
        Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung
        für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten
        sind ausschließlich deren Betreiber verantwortlich.
      </p>
    </section>
  );
}
