"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface CustomSearchBoxProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  defaultValue?: string;
}

export function CustomSearchBox({
  onSearch,
  placeholder = "Search...",
  defaultValue = "",
}: CustomSearchBoxProps) {
  const [query, setQuery] = useState(defaultValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        className="pl-10 pr-4"
      />
    </form>
  );
}
