import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { getApiBase } from "../lib/apiBase";
import { useAuth } from "./AuthContext";

export interface Truck {
  id: string;
  /** Listing reference, e.g. SA-0000042 (from API). */
  refNo?: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  type: "commercial" | "pickup" | "van" | "dump" | "flatbed" | "semi";
  condition: "excellent" | "good" | "fair" | "notWorking";
  transmission: "automatic" | "manual";
  fuelType: "diesel" | "gasoline" | "electric" | "hybrid";
  location: string;
  cityId?: number | null;
  seller: "individual" | "company";
  sellerName: string;
  sellerPhone?: string;
  ownerUserId?: number | null;
  description: string;
  features: string[];
  images: string[];
  videoUrl?: string | null;
  listingStatus?: "active" | "reserved" | "sold";
  dateAdded: string;
}

interface TruckContextType {
  trucks: Truck[];
  loading: boolean;
  error: string | null;
  addTruck: (truck: Omit<Truck, "id" | "dateAdded" | "refNo">) => Promise<void>;
  updateTruck: (id: string, truck: Omit<Truck, "id" | "dateAdded" | "refNo">) => Promise<void>;
  refreshTrucks: () => Promise<void>;
}

const TruckContext = createContext<TruckContextType | undefined>(undefined);

const apiBase = getApiBase();

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { detail?: string | unknown };
    if (typeof j.detail === "string") return j.detail;
  } catch {
    /* ignore */
  }
  return text || res.statusText;
}

export function TruckProvider({ children }: { children: ReactNode }) {
  const { getAccessToken } = useAuth();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTrucks = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/trucks`);
      if (!res.ok) throw new Error(await parseError(res));
      const data = (await res.json()) as Truck[];
      setTrucks(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trucks");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/trucks`);
        if (!res.ok) throw new Error(await parseError(res));
        const data = (await res.json()) as Truck[];
        if (!cancelled) setTrucks(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load trucks");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addTruck = async (truckData: Omit<Truck, "id" | "dateAdded" | "refNo">) => {
    const token = getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${apiBase}/trucks`, {
      method: "POST",
      headers,
      body: JSON.stringify(truckData),
    });
    if (!res.ok) throw new Error(await parseError(res));
    const created = (await res.json()) as Truck;
    setTrucks((prev) => [created, ...prev]);
  };

  const updateTruck = async (id: string, truckData: Omit<Truck, "id" | "dateAdded" | "refNo">) => {
    const token = getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${apiBase}/trucks/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(truckData),
    });
    if (!res.ok) throw new Error(await parseError(res));
    const updated = (await res.json()) as Truck;
    setTrucks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  return (
    <TruckContext.Provider value={{ trucks, loading, error, addTruck, updateTruck, refreshTrucks }}>
      {children}
    </TruckContext.Provider>
  );
}

export function useTrucks() {
  const context = useContext(TruckContext);
  if (!context) {
    throw new Error("useTrucks must be used within TruckProvider");
  }
  return context;
}
