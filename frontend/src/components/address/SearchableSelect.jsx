// src/components/address/SearchableSelect.jsx
import { useEffect, useMemo, useRef, useState } from "react";

function SearchableSelect({
    label,
    options = [],
    value = "",
    onSelect,
    placeholder = "Search...",
    disabled = false,
    optional = false
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const selected = options.find((option) => option.psgc_code === value);
        setQuery(selected?.name || "");
    }, [value, options]);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const filteredOptions = useMemo(() => {
        const search = query.trim().toLowerCase();

        if (!search) return options.slice(0, 50);

        return options
            .filter((option) => option.name.toLowerCase().includes(search))
            .slice(0, 50);
    }, [options, query]);

    const handleInputChange = (e) => {
        const nextQuery = e.target.value;
        setQuery(nextQuery);
        setOpen(true);

        const selected = options.find((option) => option.psgc_code === value);

        if (selected && nextQuery !== selected.name) {
            onSelect(null);
        }
    };

    const handleSelect = (option) => {
        setQuery(option.name);
        setOpen(false);
        onSelect(option);
    };

    return (
        <div ref={wrapperRef} className="relative flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#6E473B] tracking-wide uppercase">
                {label}
                {optional && <span className="ml-1 normal-case text-[#A07060]">(optional)</span>}
            </label>

            <input
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => !disabled && setOpen(true)}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete="off"
                className="w-full px-4 py-2.5 bg-[#FCF8EE]/50 border border-[#E6CCA2] rounded-xl text-sm text-[#6E473B] placeholder-[#CBB294] outline-none focus:border-[#C05A11] focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />

            {open && !disabled && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-[#E6CCA2] rounded-xl shadow-lg">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                            <button
                                key={option.psgc_code}
                                type="button"
                                onClick={() => handleSelect(option)}
                                className="w-full px-4 py-2.5 text-left text-sm text-[#6E473B] hover:bg-[#FCF8EE] transition-colors cursor-pointer"
                            >
                                {option.name}
                            </button>
                        ))
                    ) : (
                        <p className="px-4 py-3 text-xs text-[#A07060]">
                            No matching location found.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default SearchableSelect;