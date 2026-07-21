"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, Search } from "lucide-react";
import { Input } from "./Input";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (details: any) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function LocationAutocomplete({ value, onChange, onSelect, placeholder, className, style }: Props) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState(value);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (text: string) => {
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5`);
      const data = await response.json();
      setSuggestions(data.features || []);
    } catch (err) {
      console.error("Geocoding error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen && searchTerm !== value) {
        fetchSuggestions(searchTerm);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, isOpen, value]);

  const handleSelect = (item: any) => {
    const name = item.properties.name || "";
    const city = item.properties.city || item.properties.state || "";
    const label = city ? `${name}, ${city}` : name;
    
    setSearchTerm(label);
    onChange(label);
    onSelect?.({
      name: label,
      lat: item.geometry.coordinates[1],
      lng: item.geometry.coordinates[0]
    });
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || "Search location..."}
          className={className}
          style={style}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading ? (
            <Loader2 className="w-4 h-4 text-[var(--color-base-400)] animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-[var(--color-base-400)]" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 w-full mt-2 bg-white border border-[var(--color-base-200)] rounded-[var(--radius-card)] shadow-[var(--shadow-clay-hard)] overflow-hidden"
          >
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full px-4 py-3 text-left hover:bg-[var(--color-base-50)] transition-colors flex items-start gap-3 border-b border-[var(--color-base-100)] last:border-0"
              >
                <MapPin className="w-4 h-4 text-[var(--color-base-400)] mt-1 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[var(--color-base-900)]">
                    {item.properties.name}
                  </p>
                  <p className="text-xs text-[var(--color-base-500)] font-medium">
                    {[item.properties.city, item.properties.state, item.properties.country].filter(Boolean).join(", ")}
                  </p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
