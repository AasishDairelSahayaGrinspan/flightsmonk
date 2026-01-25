import { type InsertSearchHistory, type SearchHistory } from "@shared/schema";

export interface IStorage {
  getSearchHistory(): Promise<SearchHistory[]>;
  addSearchHistory(item: InsertSearchHistory): Promise<SearchHistory>;
}

export class MemStorage implements IStorage {
  private history: SearchHistory[];
  private currentId: number;

  constructor() {
    this.history = [];
    this.currentId = 1;
  }

  async getSearchHistory(): Promise<SearchHistory[]> {
    return [...this.history].sort((a, b) => b.timestamp - a.timestamp);
  }

  async addSearchHistory(item: InsertSearchHistory): Promise<SearchHistory> {
    const newItem: SearchHistory = {
      id: this.currentId++,
      ...item,
    };
    this.history.push(newItem);
    return newItem;
  }
}

export const storage = new MemStorage();
