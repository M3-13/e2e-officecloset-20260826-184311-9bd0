export default function DatenschutzPage() {
  return (
    <section className="page">
      <h1 className="page__title">Datenschutzerklärung</h1>

      <h2>1. Verantwortlicher</h2>
      <p className="page__text">
        Verantwortlicher für die Datenverarbeitung ist der Betreiber dieser
        Anwendung (siehe Impressum).
      </p>

      <h2>2. Verarbeitete Daten</h2>
      <p className="page__text">
        Bei der Nutzung der Anwendung werden folgende Daten verarbeitet:
      </p>
      <ul>
        <li>
          Benutzerkonto: Benutzername und Passwort (das Passwort wird nur als
          Hash gespeichert)
        </li>
        <li>Garderobe: Namen, Kategorien und Zuordnungen deiner Kleidungsstücke</li>
        <li>Outfits: Namen und die darin kombinierten Kleidungsstücke</li>
      </ul>

      <h2>3. Bild-Uploads</h2>
      <p className="page__text">
        Hochgeladene Bilder deiner Kleidungsstücke werden ausschließlich auf
        unserem eigenen Server gespeichert und nicht an Dritte weitergegeben.
        Es werden nur die Formate JPEG und PNG akzeptiert; die maximale
        Dateigröße ist begrenzt (standardmäßig 5 MB). Die Dateien werden unter
        zufällig generierten Namen gespeichert und sind nur für dein eigenes
        Benutzerkonto zugänglich.
      </p>

      <h2>4. Tokens und Sitzungen</h2>
      <p className="page__text">
        Für die Anmeldung verwenden wir ein JSON Web Token (JWT). Das Token wird
        auf deinem Gerät gespeichert und bei jeder Anfrage übertragen, um dich
        zu authentifizieren. Es enthält deinen Benutzernamen und eine
        Ablaufzeit. Nach dem Abmelden wird das Token verworfen.
      </p>

      <h2>5. Account-Löschung</h2>
      <p className="page__text">
        Du kannst dein Konto jederzeit über die Konto-Seite löschen. Dabei
        werden dein Benutzerkonto, deine Garderobe, deine Outfits und alle von
        dir hochgeladenen Bilder vollständig und endgültig entfernt.
      </p>

      <h2>6. Keine Drittanbieter-Ressourcen</h2>
      <p className="page__text">
        Diese Anwendung lädt keine Schriftarten, Skripte oder Bilder von
        Drittanbietern. Alle Ressourcen werden von unserem eigenen Server
        bereitgestellt.
      </p>

      <h2>7. Ihre Rechte</h2>
      <p className="page__text">
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung und
        Einschränkung der Verarbeitung Ihrer personenbezogenen Daten sowie das
        Recht auf Datenübertragbarkeit.
      </p>
    </section>
  );
}
