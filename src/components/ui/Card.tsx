import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'gradient';
  hover?: boolean;
}

export function Card({ 
  children, 
  variant = 'default', 
  hover = false,
  className = '',
  ...props 
}: CardProps) {
  const baseStyles = 'bg-[#181825] rounded-xl border border-gray-700 transition-all';
  const hoverStyles = hover ? 'hover:border-gray-600 hover:shadow-lg' : '';
  
  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 border-b border-gray-700 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 border-t border-gray-700 ${className}`} {...props}>
      {children}
    </div>
  );
}