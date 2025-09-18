"use client";

import { Input } from "@/components/ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "./ui/button";
import { X } from "lucide-react";

export function SearchBox({
  query,
  disabled,
}: {
  query?: string | null;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isValid, setIsValid] = useState(true);
  const [isPending, startTransition] = useTransition();

  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.toString() ?? "";
  const pathname = usePathname();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const term = formData.get("search") as string;

    if (term && term.length >= 3) {
      const params = new URLSearchParams(searchParams);
      params.set("q", term);
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
      setIsValid(true);
    } else if (term.length === 0) {
      const params = new URLSearchParams(searchParams);
      params.delete("q");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue.length === 0 || newValue.length >= 3) {
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  };

  const resetQuery = () => {
    startTransition(() => {
      router.push("/");
    });
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col">
      <div className="w-full mx-auto mb-4">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <div className="relative w-full flex items-center">
            <Input
              disabled={disabled}
              ref={inputRef}
              name="search"
              defaultValue={query ?? ""}
              minLength={3}
              onChange={handleInputChange}
              className="text-base w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search for games, genres, or features..."
            />
            {q.length > 0 ? (
              <Button
                className="absolute right-2 text-gray-400 rounded-full h-8 w-8"
                variant="ghost"
                type="button"
                size="icon"
                onClick={resetQuery}
              >
                <X height="20" width="20" />
              </Button>
            ) : null}
          </div>
          <Button
            type="submit"
            disabled={disabled || isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            size="icon"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 18 18"
            >
              <title>magnifier-2</title>
              <g fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12.3732 12.3732C12.6661 12.0803 13.1409 12.0803 13.4338 12.3732L16.2803 15.2197C16.5732 15.5126 16.5732 15.9874 16.2803 16.2803C15.9874 16.5732 15.5126 16.5732 15.2197 16.2803L12.3732 13.4338C12.0803 13.1409 12.0803 12.6661 12.3732 12.3732Z"
                ></path>{" "}
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M1.5 7.25C1.5 4.07439 4.07439 1.5 7.25 1.5C10.4256 1.5 13 4.07439 13 7.25C13 10.4256 10.4256 13 7.25 13C4.07439 13 1.5 10.4256 1.5 7.25ZM7.25 3C4.90281 3 3 4.90281 3 7.25C3 9.59719 4.90281 11.5 7.25 11.5C9.59719 11.5 11.5 9.59719 11.5 7.25C11.5 4.90281 9.59719 3 7.25 3Z"
                ></path>
              </g>
            </svg>
          </Button>
        </form>
        {!isValid ? (
          <div className="text-xs pt-2 text-red-500">
            Query must be 3 characters or longer
          </div>
        ) : (
          <div className="h-6" />
        )}
      </div>
    </div>
  );
}
