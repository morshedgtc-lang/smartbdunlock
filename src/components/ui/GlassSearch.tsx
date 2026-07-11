"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  badge?: string;
  href: string;
  type: "order" | "service" | "user" | "nav";
}

interface GlassSearchProps {
  placeholder?: string;
  results?: SearchResult[];
  onSelect?: (result: SearchResult) => void;
  onSearch?: (query: string) => void;
}

export function GlassSearch({
  placeholder = "Search orders, services, users...",
  results = [],
  onSelect,
  onSearch,
}: GlassSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // Default navigation results
  const defaultResults: SearchResult[] = results.length > 0 ? results : [
    { id: "nav-dashboard", icon: "📊", title: "Dashboard", subtitle: "View analytics", href: "/admin/dashboard", type: "nav" },
    { id: "nav-orders", icon: "📦", title: "Orders", subtitle: "Manage orders", href: "/admin/orders", type: "nav" },
    { id: "nav-services", icon: "🔧", title: "Services", subtitle: "Manage services", href: "/admin/services", type: "nav" },
    { id: "nav-users", icon: "👥", title: "Users", subtitle: "Manage users", href: "/admin/users", type: "nav" },
    { id: "nav-wallet", icon: "💰", title: "Wallet", subtitle: "Manage funds", href: "/admin/wallet", type: "nav" },
  ];

  // Filter results based on query
  useEffect(() => {
    if (query.length === 0) {
      setFilteredResults(defaultResults.slice(0, 5));
      return;
    }

    const q = query.toLowerCase();
    const filtered = defaultResults.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
    );
    setFilteredResults(filtered);
    setSelectedIndex(-1);
    onSearch?.(query);
  }, [query, results, onSearch]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut ⌘K and navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setIsOpen(false);
      }
      if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredResults.length - 1 ? prev + 1 : 0
          );
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredResults.length - 1
          );
        }
        if (e.key === "Enter" && selectedIndex >= 0) {
          e.preventDefault();
          handleSelect(filteredResults[selectedIndex]);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex]);

  const handleFocus = () => {
    setIsFocused(true);
    setIsOpen(true);
  };

  const handleSelect = (result: SearchResult) => {
    setQuery("");
    setIsOpen(false);
    onSelect?.(result);
    router.push(result.href);
  };

  const clearQuery = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  };

  const groupedResults = filteredResults.reduce(
    (acc, result) => {
      if (!acc[result.type]) acc[result.type] = [];
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!resultsRef.current || !glowRef.current) return;
    const rect = resultsRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    glowRef.current.style.left = `${x}px`;
    glowRef.current.style.top = `${y}px`;
    glowRef.current.style.opacity = "1";
  };

  const handleMouseLeave = () => {
    if (glowRef.current) {
      glowRef.current.style.opacity = "0";
    }
  };

  return (
    <div ref={wrapperRef} className={`glass-search ${isOpen ? "open" : ""}`}>
      <div className={`glass-search-box ${isFocused ? "focused" : ""}`}>
        <Search size={16} className="text-[var(--muted)]" />
        <input
          ref={inputRef}
          type="text"
          className="glass-search-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        />
        <span className="glass-search-shortcut">⌘K</span>
        {query && (
          <button
            onClick={clearQuery}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 text-[var(--muted)] text-xs hover:bg-red-500/20 hover:text-red-400 transition-all"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div
          ref={resultsRef}
          className="glass-search-results"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Mouse glow overlay */}
          <div ref={glowRef} className="search-mouse-glow" />

          {filteredResults.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-sm text-[var(--muted)]">
                No results for &quot;{query}&quot;
              </div>
            </div>
          ) : (
            Object.entries(groupedResults).map(([type, items], groupIndex) => (
              <div key={type}>
                <div className="glass-dropdown-label">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </div>
                {items.map((result, index) => (
                  <div
                    key={result.id}
                    className={`glass-search-item ${
                      selectedIndex === filteredResults.indexOf(result)
                        ? "active"
                        : ""
                    }`}
                    onClick={() => handleSelect(result)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5 flex items-center justify-center text-base flex-shrink-0">
                      {result.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-medium text-[var(--foreground)] truncate"
                        dangerouslySetInnerHTML={{
                          __html: highlightMatch(result.title, query),
                        }}
                      />
                      <div className="text-xs text-[var(--muted)] mt-0.5 truncate">
                        {result.subtitle}
                      </div>
                    </div>
                    {result.badge && (
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-[var(--muted)] font-medium">
                        {result.badge}
                      </span>
                    )}
                  </div>
                ))}
                {groupIndex < Object.keys(groupedResults).length - 1 && (
                  <div className="glass-dropdown-divider" />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}