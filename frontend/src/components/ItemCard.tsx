import { useEffect, useState } from "react";
import { getToken } from "../api";

export interface ClothingItem {
  id: number;
  name: string;
  category: string;
  image_url: string | null;
  created_at: string;
}

interface ItemCardProps {
  item: ClothingItem;
  onEdit: (item: ClothingItem) => void;
  onDelete: (item: ClothingItem) => void;
}

function resolveImagePath(imageUrl: string): string {
  return imageUrl.startsWith("/api") ? imageUrl : `/api${imageUrl}`;
}

async function fetchImageBlob(path: string): Promise<string | null> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(path, { headers });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export default function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;

    if (item.image_url) {
      fetchImageBlob(resolveImagePath(item.image_url)).then((url) => {
        if (active && url) {
          objectUrl = url;
          setImageUrl(url);
        }
      });
    }

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [item.image_url]);

  return (
    <article className="card item-card">
      <div className="item-card__image">
        {imageUrl ? (
          <img src={imageUrl} alt={item.name} />
        ) : (
          <div className="item-card__placeholder" aria-hidden="true" />
        )}
      </div>
      <div className="item-card__body">
        <h3 className="item-card__name">{item.name}</h3>
        <span className="item-card__category">{item.category}</span>
        <div className="item-card__actions">
          <button
            type="button"
            className="item-card__action"
            onClick={() => onEdit(item)}
          >
            Bearbeiten
          </button>
          <button
            type="button"
            className="item-card__action item-card__action--danger"
            onClick={() => onDelete(item)}
          >
            Löschen
          </button>
        </div>
      </div>
    </article>
  );
}
