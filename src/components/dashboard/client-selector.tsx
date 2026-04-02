"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  clients: { id: string; name: string }[];
  selectedId?: string;
};

export function ClientSelector({ clients, selectedId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("clientId", e.target.value);
    } else {
      params.delete("clientId");
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="client-selector">
      <label htmlFor="client-select">Client :</label>
      <select id="client-select" value={selectedId ?? ""} onChange={handleChange}>
        <option value="">— Tous les clients —</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
