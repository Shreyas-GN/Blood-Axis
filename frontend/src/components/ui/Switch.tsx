"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ className, checked, onCheckedChange, ...props }, ref) => (
        <div className="relative inline-flex items-center">
            <input
                type="checkbox"
                className="sr-only peer"
                ref={ref}
                checked={checked}
                onChange={(e) => onCheckedChange?.(e.target.checked)}
                {...props}
            />
            <div
                onClick={(e) => {
                    // Trigger click on input
                    e.currentTarget.previousElementSibling?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                }}
                className={cn(
                    "w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[var(--color-bg-elevated)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-bg-elevated)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:bg-[var(--color-primary)] cursor-pointer transition-colors",
                    className
                )}
            ></div>
        </div>
    )
)
Switch.displayName = "Switch"

export { Switch }
