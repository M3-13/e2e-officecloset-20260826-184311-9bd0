import { useCallback, useEffect, useState } from "react";
import { ApiError, request } from "../api";
import ItemCard, { type ClothingItem } from "../components/ItemCard";
import ItemForm, { type ItemFormValues } from "../components/ItemForm";
import "../styles/wardrobe.css";

const DEFAULT_CATEGORIES = ["oberteile", "unterteile", "schuhe", "accessoires"];

function buildFormData(values: ItemFormValues): FormData {
  const formData = new FormData();
  formData.append("name", values.name);
  formData.append("category", values.category);
  if (values.image) {
    formData.append("image", values.image);
  }
  return formData;
}

export default function WardrobePage() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClothingItem | null>(null);

  const loadItems = useCallback(async (category: string | null) => {
    setLoading(true);
    setPageError(null);
    try {
      const query = category ? `?category=${encodeURIComponent(category)}` : "";
      const data = await request<ClothingItem[]>(`/wardrobe/items${query}`);
      setItems(data);
    } catch (err) {
      setItems([]);
      setPageError(
        err instanceof ApiError
          ? err.message
          : "Die Garderobe konnte nicht geladen werden."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await request<{ categories: string[] }>(
        "/wardrobe/categories"
      );
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        setCategories(data.categories);
      }
    } catch {
      // fall back to the default category list
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadItems(selectedCategory);
  }, [selectedCategory, loadItems]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: ClothingItem) {
    setEditing(item);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  async function handleCreate(values: ItemFormValues) {
    const formData = buildFormData(values);
    await request("/wardrobe/items", { method: "POST", body: formData });
    closeForm();
    await loadItems(selectedCategory);
  }

  async function handleUpdate(values: ItemFormValues) {
    if (!editing) {
      return;
    }
    const formData = buildFormData(values);
    await request(`/wardrobe/items/${editing.id}`, {
      method: "PUT",
      body: formData,
    });
    closeForm();
    await loadItems(selectedCategory);
  }

  async function handleDelete(item: ClothingItem) {
    try {
      await request(`/wardrobe/items/${item.id}`, { method: "DELETE" });
      await loadItems(selectedCategory);
    } catch (err) {
      setPageError(
        err instanceof ApiError
          ? err.message
          : "Das Kleidungsstück konnte nicht gelöscht werden."
      );
    }
  }

  const filteredItems =
    selectedCategory === null
      ? items
      : items.filter((item) => item.category === selectedCategory);

  return (
    <section className="page wardrobe">
      <div className="wardrobe__toolbar">
        <h1 className="page__title">Garderobe</h1>
        <button type="button" className="btn" onClick={openCreate}>
          Kleidungsstück anlegen
        </button>
      </div>

      <div className="filter-bar" role="group" aria-label="Nach Kategorie filtern">
        <button
          type="button"
          className={`filter-chip${selectedCategory === null ? " filter-chip--active" : ""}`}
          onClick={() => setSelectedCategory(null)}
        >
          Alle
        </button>
        {categories.map((categoryName) => (
          <button
            key={categoryName}
            type="button"
            className={`filter-chip${selectedCategory === categoryName ? " filter-chip--active" : ""}`}
            onClick={() => setSelectedCategory(categoryName)}
          >
            {categoryName}
          </button>
        ))}
      </div>

      {pageError ? (
        <div className="form-error" role="alert">
          <span className="form-error__icon" aria-hidden="true">
            !
          </span>
          {pageError}
        </div>
      ) : null}

      {loading ? (
        <p className="page__text">Lade Garderobe …</p>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <h2 className="empty-state__title">
            {selectedCategory === null
              ? "Noch keine Kleidungsstücke"
              : "Keine Kleidungsstücke in dieser Kategorie"}
          </h2>
          <p className="empty-state__description">
            {selectedCategory === null
              ? "Legen Sie Ihr erstes Kleidungsstück an, um Ihre Garderobe zu füllen."
              : "Wählen Sie eine andere Kategorie oder legen Sie ein neues Stück an."}
          </p>
        </div>
      ) : (
        <div className="item-grid">
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {formOpen ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={
            editing ? "Kleidungsstück bearbeiten" : "Kleidungsstück anlegen"
          }
        >
          <div className="modal">
            <div className="modal__header">
              <h2 className="modal__title">
                {editing ? "Kleidungsstück bearbeiten" : "Kleidungsstück anlegen"}
              </h2>
              <button
                type="button"
                className="modal__close"
                onClick={closeForm}
                aria-label="Schließen"
              >
                ×
              </button>
            </div>
            <ItemForm
              categories={categories}
              initial={editing ? { name: editing.name, category: editing.category } : null}
              onSubmit={editing ? handleUpdate : handleCreate}
              onCancel={closeForm}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
