import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import "../styles/LanguageSelector.css";

/**
 * Compact Language Selector Component
 * @param {string} variant - 'navbar' (inline in header) | 'floating' (bottom-left corner)
 */
export default function LanguageSelector({ variant = "navbar", className = "" }) {
  const { language, setLanguage, languages, currentLanguageMeta } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (langCode) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`lang-selector-container lang-${variant} ${className}`}
      title="Change Language / భాష మార్చండి / भाषा बदलें"
    >
      <button
        type="button"
        className={`lang-toggle-btn ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change Language"
        aria-expanded={isOpen}
      >
        <span className="lang-globe-icon" aria-hidden="true">🌐</span>
        <span className="lang-current-code">{currentLanguageMeta?.label || "EN"}</span>
        <span className="lang-arrow" aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <div className="lang-dropdown-menu" role="menu">
          <div className="lang-dropdown-header">Select Language</div>
          {languages.map((l) => {
            const isSelected = l.code === language;
            return (
              <button
                key={l.code}
                type="button"
                className={`lang-option-btn ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelect(l.code)}
                role="menuitem"
              >
                <span className="lang-option-badge">{l.label}</span>
                <span className="lang-option-native">{l.nativeName}</span>
                {isSelected && <span className="lang-check" aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
