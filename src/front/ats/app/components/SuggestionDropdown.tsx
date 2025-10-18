import React, { useState, useEffect, useRef } from 'react';

export interface SuggestionItem {
  id: number;
  name: string;
  email?: string;
  telegram?: string | null;
}

interface SuggestionDropdownProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: SuggestionItem) => void;
  suggestions: SuggestionItem[];
  showSuggestions: boolean;
  onShowSuggestions: (show: boolean) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  renderSuggestion?: (item: SuggestionItem) => React.ReactNode;
  onBlur?: () => void;
  onFocus?: () => void;
}

export function SuggestionDropdown({
  value,
  onChange,
  onSelect,
  suggestions,
  showSuggestions,
  onShowSuggestions,
  placeholder = "Поиск...",
  className = "",
  inputRef,
  renderSuggestion,
  onBlur,
  onFocus
}: SuggestionDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  // Update suggestion refs array
  useEffect(() => {
    suggestionRefs.current = suggestionRefs.current.slice(0, suggestions.length);
  }, [suggestions.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        onShowSuggestions(true);
        setSelectedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : 0;
        setSelectedIndex(nextIndex);
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : suggestions.length - 1;
        setSelectedIndex(prevIndex);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          onSelect(suggestions[selectedIndex]);
        }
        break;
      
      case 'Escape':
        onShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (item: SuggestionItem) => {
    onSelect(item);
  };

  const handleInputFocus = () => {
    if (value.length > 0) {
      onShowSuggestions(true);
    }
    onFocus?.();
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      onShowSuggestions(false);
      setSelectedIndex(-1);
      onBlur?.();
    }, 200);
  };

  const defaultRenderSuggestion = (item: SuggestionItem) => (
    <div className="suggestion-item-content">
      <div className="suggestion-item-name">{item.name}</div>
      {item.email && (
        <div className="suggestion-item-email">{item.email}</div>
      )}
      {item.telegram && (
        <div className="suggestion-item-telegram">@{item.telegram}</div>
      )}
    </div>
  );

  return (
    <div className={`suggestion-dropdown ${className}`} ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className="suggestion-input"
        autoComplete="off"
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestion-dropdown-list">
          {suggestions.map((item, index) => (
            <button
              key={item.id}
              ref={(el) => (suggestionRefs.current[index] = el)}
              type="button"
              className={`suggestion-item ${selectedIndex === index ? 'selected' : ''}`}
              onClick={() => handleSuggestionClick(item)}
            >
              {renderSuggestion ? renderSuggestion(item) : defaultRenderSuggestion(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
