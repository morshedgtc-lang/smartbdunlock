"use client";

import { useState, useRef, useEffect } from "react";

interface DropdownItem {
  id: string;
  icon: string;
  label: string;
  badge?: string;
  shortcut?: string;
  danger?: boolean;
}

interface GlassDropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  label?: string;
  onSelect?: (item: DropdownItem) => void;
  align?: "left" | "right";
}

export function GlassDropdown({
  trigger,
  items,
  label,
  onSelect,
  align = "left",
}: GlassDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const currentIndex = items.findIndex((i) => i.id === activeId);
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        setActiveId(items[nextIndex].id);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const currentIndex = items.findIndex((i) => i.id === activeId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        setActiveId(items[prevIndex].id);
      }
      if (e.key === "Enter" && activeId) {
        const item = items.find((i) => i.id === activeId);
        if (item) {
          handleSelect(item);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeId, items]);

  const handleSelect = (item: DropdownItem) => {
    setActiveId(item.id);
    onSelect?.(item);
    setIsOpen(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!panelRef.current || !glowRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
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
    <div
      ref={wrapperRef}
      className={`glass-dropdown ${isOpen ? "open" : ""}`}
    >
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      <div
        ref={panelRef}
        className={`glass-dropdown-panel ${align === "right" ? "right-0 left-auto" : ""}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Mouse glow overlay */}
        <div ref={glowRef} className="dropdown-mouse-glow" />

        {/* Left specular highlight */}
        <div className="dropdown-specular-left" />

        {label && <div className="glass-dropdown-label">{label}</div>}

        {items.map((item, index) => (
          <div key={item.id}>
            <div
              className={`glass-dropdown-item ${activeId === item.id ? "active" : ""} ${item.danger ? "text-red-400 hover:text-red-300" : ""}`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setActiveId(item.id)}
            >
              <span className="w-5 h-5 flex items-center justify-center text-sm opacity-70">
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-[var(--muted)] font-medium">
                  {item.badge}
                </span>
              )}
              {item.shortcut && (
                <span className="text-xs text-[var(--muted)] font-mono">
                  {item.shortcut}
                </span>
              )}
            </div>
            {index < items.length - 1 && !item.danger && (
              <div className="glass-dropdown-divider" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}