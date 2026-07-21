"use client";

export type FilterOption = "All" | "Emergency" | "My Requests" | "Today" | "Fulfilled";

const FILTERS: FilterOption[] = ["All", "Emergency", "My Requests", "Today", "Fulfilled"];

interface FilterPillsProps {
    active: FilterOption;
    onChange: (filter: FilterOption) => void;
    counts?: Partial<Record<FilterOption, number>>;
}

export function FilterPills({ active, onChange, counts }: FilterPillsProps) {
    return (
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filter requests">
            {FILTERS.map((filter) => {
                const count = counts?.[filter];
                return (
                    <button
                        key={filter}
                        onClick={() => onChange(filter)}
                        aria-pressed={active === filter}
                        className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors min-h-[36px] flex items-center gap-1.5 ${
                            active === filter
                                ? "bg-[#1E1E1E] text-white"
                                : "bg-[#F4F4F4] text-[#737373] hover:bg-[#ECECEC] hover:text-[#1E1E1E]"
                        }`}
                    >
                        {filter}
                        {count !== undefined && count > 0 && (
                            <span
                                className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                                    active === filter
                                        ? "bg-white/20 text-white"
                                        : "bg-[#ECECEC] text-[#525252]"
                                }`}
                            >
                                {count > 99 ? "99+" : count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
