"use client";

import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

interface PatientSearchProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function PatientSearch({ onSearch, isLoading }: PatientSearchProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={handleChange}
        placeholder="Search patients by name, phone, or reference number"
        className="pl-10"
        aria-label="Search patients"
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
