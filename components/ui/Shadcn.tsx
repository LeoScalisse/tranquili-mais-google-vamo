
import React, { useState } from 'react';
import { X, Check, ChevronRight, Circle } from './Icons';

// --- Helper for classes ---
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

// --- Card Components ---
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("rounded-lg border bg-white text-gray-900 shadow-sm", className)} {...props}>
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6 pb-2", className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, children, ...props }) => (
  <h3 className={cn("text-lg font-bold leading-none tracking-tight text-gray-900", className)} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, children, ...props }) => (
  <p className={cn("text-sm text-gray-600 font-medium", className)} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("p-6 pt-0 text-gray-800", className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("flex items-center p-6 pt-0", className)} {...props}>
      {children}
  </div>
);

// --- Badge Component ---
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'accent' | 'destructive';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', children, ...props }) => {
  const variants = {
    default: "border-transparent bg-[#38b6ff] text-white hover:bg-[#38b6ff]/80",
    secondary: "border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200",
    outline: "text-gray-900 border border-gray-200",
    accent: "border-transparent bg-[#ffde59] text-gray-900 hover:bg-[#ffde59]/80",
    destructive: "border-transparent bg-red-500 text-white hover:bg-red-600",
  };

  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )} 
      {...props}
    >
        {children}
    </div>
  );
};

// --- Button Component ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
     const variants = {
        default: "bg-[#38b6ff] text-white hover:bg-[#38b6ff]/90",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border border-gray-300 bg-white hover:bg-gray-100 text-gray-800 font-bold",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 font-bold",
        ghost: "hover:bg-gray-100 hover:text-gray-900 font-bold",
        link: "text-[#38b6ff] underline-offset-4 hover:underline font-bold",
     };
     const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
     };

     return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// --- Input Component ---
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38b6ff] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

// --- Label Component ---
export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
    ({ className, ...props }, ref) => (
      <label
        ref={ref}
        className={cn(
          "text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-800",
          className
        )}
        {...props}
      />
    )
);
Label.displayName = "Label";

// --- Textarea Component ---
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
    ({ className, ...props }, ref) => {
      return (
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38b6ff] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
      )
    }
  )
Textarea.displayName = "Textarea";


// --- Mock Dialog Components for EventManager ---
interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}
export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
             <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
             <div className="relative z-50 w-full p-4">{children}</div>
        </div>
    );
}
export const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
    <div className={cn("bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto p-6 border border-gray-100 animate-fade-in text-gray-900", className)} {...props}>
        {children}
    </div>
);
export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)} {...props} />
);
export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6", className)} {...props} />
);
export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
    <h2 className={cn("text-xl font-bold leading-none tracking-tight text-gray-900", className)} {...props} />
);
export const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
    <p className={cn("text-sm text-gray-600 mt-2", className)} {...props} />
);


// --- Mock Select Components ---
export const Select: React.FC<{ value: string; onValueChange: (val: string) => void; children: React.ReactNode }> = ({ value, onValueChange, children }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
             {React.Children.map(children, child => {
                 if (React.isValidElement(child)) {
                    // @ts-ignore
                    return React.cloneElement(child, { value, onValueChange, open, setOpen });
                 }
                 return child;
             })}
        </div>
    );
};
export const SelectTrigger: React.FC<any> = ({ children, onClick, setOpen, open, className }) => (
    <button className={cn("flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#38b6ff] disabled:cursor-not-allowed disabled:opacity-50", className)} onClick={() => setOpen(!open)}>
        {children}
    </button>
);
export const SelectValue: React.FC<any> = ({ placeholder, value }) => <span className="text-gray-900 font-medium">{value || placeholder}</span>;
export const SelectContent: React.FC<any> = ({ children, open }) => {
    if (!open) return null;
    return (
        <div className="absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white text-gray-900 shadow-md animate-fade-in mt-1 w-full border-gray-200">
            <div className="p-1">{children}</div>
        </div>
    );
};
export const SelectItem: React.FC<any> = ({ value, children, onValueChange, setOpen }) => (
    <div 
        className="relative flex w-full cursor-default select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm text-gray-900 outline-none hover:bg-gray-100 cursor-pointer"
        onClick={() => { onValueChange(value); setOpen(false); }}
    >
        {children}
    </div>
);

// --- Mock Dropdown Menu ---
export const DropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [open, setOpen] = useState(false);
    return <div className="relative inline-block text-left">{React.Children.map(children, c => React.isValidElement(c) ? React.cloneElement(c as any, { open, setOpen }) : c)}</div>;
};
export const DropdownMenuTrigger: React.FC<any> = ({ asChild, children, setOpen, open }) => {
    return <div onClick={() => setOpen(!open)} className="cursor-pointer">{children}</div>;
};
export const DropdownMenuContent: React.FC<any> = ({ children, open, align }) => {
    if (!open) return null;
    return <div className={`absolute z-50 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg p-1 ${align === 'end' ? 'right-0' : 'left-0'}`}>{children}</div>;
};
export const DropdownMenuLabel: React.FC<any> = ({ children }) => <div className="px-2 py-1.5 text-sm font-bold text-gray-900">{children}</div>;
export const DropdownMenuSeparator: React.FC<any> = () => <div className="-mx-1 my-1 h-px bg-gray-100" />;
export const DropdownMenuCheckboxItem: React.FC<any> = ({ children, checked, onCheckedChange }) => (
    <div className="relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-gray-700 outline-none hover:bg-gray-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); onCheckedChange(!checked); }}>
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">{checked && <Check className="w-4 h-4 text-[#38b6ff]" />}</span>
        {children}
    </div>
);
