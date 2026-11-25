import type { ComponentPropsWithoutRef } from "react";

type Props = Omit<ComponentPropsWithoutRef<"input">, "type">;

export default function CampoBusqueda({ className, ...props }: Props) {
  return (
    <span className="relative block min-w-0">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-brand-dark" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </svg>
      </span>
      <input {...props} type="search" className={`${className ?? ""} pl-11 font-normal`} />
    </span>
  );
}
