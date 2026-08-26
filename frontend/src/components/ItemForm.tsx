import { useState, type ChangeEvent, type FormEvent } from "react";
import { ApiError } from "../api";

export interface ItemFormValues {
  name: string;
  category: string;
  image: File | null;
}

interface ItemFormProps {
  categories: string[];
  initial?: { name: string; category: string } | null;
  onSubmit: (values: ItemFormValues) => Promise<void>;
  onCancel: () => void;
}

function messageForError(status: number, detail: string): string {
  switch (status) {
    case 413:
      return "Die Bilddatei ist zu groß. Bitte wählen Sie eine kleinere Datei (maximal 5 MB).";
    case 415:
      return "Dieses Dateiformat wird nicht unterstützt. Bitte wählen Sie ein JPEG- oder PNG-Bild.";
    case 422:
      return detail || "Die Eingaben sind ungültig. Bitte überprüfen Sie Ihre Angaben.";
    default:
      return detail || "Ein unerwarteter Fehler ist aufgetreten.";
  }
}

export default function ItemForm({
  categories,
  initial,
  onSubmit,
  onCancel,
}: ItemFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setImage(event.target.files?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Bitte geben Sie einen Namen ein.");
      return;
    }
    if (!category) {
      setError("Bitte wählen Sie eine Kategorie aus.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), category, image });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(messageForError(err.status, err.message));
      } else {
        setError("Ein unerwarteter Fehler ist aufgetreten.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="item-form" onSubmit={handleSubmit} noValidate>
      <div className="item-form__field">
        <label htmlFor="item-name">Name</label>
        <input
          id="item-name"
          type="text"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="z. B. Abendkleid"
        />
      </div>

      <div className="item-form__field">
        <label htmlFor="item-category">Kategorie</label>
        <select
          id="item-category"
          className="input"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="" disabled>
            Kategorie wählen
          </option>
          {categories.map((categoryName) => (
            <option key={categoryName} value={categoryName}>
              {categoryName}
            </option>
          ))}
        </select>
      </div>

      <div className="item-form__field">
        <label htmlFor="item-image">Bild (optional)</label>
        <input
          id="item-image"
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileChange}
        />
      </div>

      {error ? (
        <div className="form-error" role="alert">
          <span className="form-error__icon" aria-hidden="true">
            !
          </span>
          {error}
        </div>
      ) : null}

      <div className="item-form__actions">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Wird gespeichert …" : "Speichern"}
        </button>
        <button
          type="button"
          className="btn item-form__cancel"
          onClick={onCancel}
          disabled={submitting}
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
