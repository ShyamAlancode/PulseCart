"use client";

import * as React from "react";
import { X } from "lucide-react";

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({
  open: false,
  onOpenChange: () => {},
});

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const [isOpen, setIsOpen] = React.useState(open ?? false);

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const handleOpenChange = React.useCallback(
    (value: boolean) => {
      setIsOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange]
  );

  return (
    <DialogContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const { onOpenChange } = React.useContext(DialogContext);

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e);
        onOpenChange(true);
      },
    });
  }

  return (
    <div onClick={() => onOpenChange(true)} className="inline-block cursor-pointer">
      {children}
    </div>
  );
}

export function DialogContent({ children }: { children: React.ReactNode }) {
  const { open, onOpenChange } = React.useContext(DialogContext);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div
        onClick={() => onOpenChange(false)}
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
      />
      {/* Dialog body container */}
      <div className="relative z-50 w-full max-w-lg scale-100 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
        {children}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-5 top-5 rounded-full p-1.5 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-zinc-400 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col space-y-2 text-center sm:text-left mb-6 ${className || ""}`} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-xl sm:text-2xl font-black leading-none tracking-tight text-white ${className || ""}`} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm text-zinc-400 ${className || ""}`} {...props} />;
}
