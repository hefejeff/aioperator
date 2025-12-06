import React from 'react';
import { Icons } from '../constants';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  isCurrent?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-sm flex-wrap">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <Icons.ChevronRight className="w-3.5 h-3.5 text-wm-neutral flex-shrink-0" />
            )}
            {item.isCurrent ? (
              <span 
                className="text-wm-blue font-semibold truncate max-w-[200px]"
                aria-current="page"
                title={item.label}
              >
                {item.label}
              </span>
            ) : item.onClick ? (
              <button
                onClick={item.onClick}
                className="text-wm-accent hover:text-wm-accent/80 hover:underline transition-colors truncate max-w-[200px]"
                title={item.label}
              >
                {item.label}
              </button>
            ) : (
              <span 
                className="text-wm-blue/60 truncate max-w-[200px]"
                title={item.label}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
