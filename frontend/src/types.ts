export interface Item {
  id: number;
  name: string;
  category: string;
  image_url: string | null;
  created_at: string;
}

export interface Outfit {
  id: number;
  name: string;
  item_ids: number[];
  items: Item[];
  created_at: string;
}
