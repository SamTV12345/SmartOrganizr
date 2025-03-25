import {ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";

interface NavigationButtonProps {
    children: React.ReactNode;
    onClick: () => void;
    className?: string;
}

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const NavigationButton: React.FC<NavigationButtonProps> = ({ children, onClick, className }) => {
    return (
        <button
            onClick={onClick}
            className={cn("px-4 py-2  text-black font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-300", className)}
        >
            {children}
        </button>
    )
}
