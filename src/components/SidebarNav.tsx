import React from 'react';
import type { User } from 'firebase/auth';
import { Icons } from '../constants';

export type SidebarNavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
  children?: SidebarNavItem[];
  onDelete?: () => void;
  canDelete?: boolean;
};

interface SidebarNavProps {
  user: User;
  items: SidebarNavItem[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({
  user,
  items,
  isCollapsed,
  onToggleCollapse
}) => {
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({ companies: true });

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  return (
    <aside
      className={`${isCollapsed ? 'w-16' : 'w-64'} bg-gray-100 border-r border-wm-blue/10 flex flex-col transition-all duration-300 ease-in-out`}
    >
      <div className="p-4 border-b border-wm-blue/10 bg-gray-100">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h1 className="text-lg font-bold text-wm-blue">Intellio Agent</h1>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-2 hover:bg-wm-blue/10 rounded-lg transition-colors text-wm-blue/70"
          >
            {isCollapsed ? (
              <Icons.ChevronRight className="w-5 h-5" />
            ) : (
              <Icons.ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 py-3">
        <div className="px-2.5 space-y-2">
          {items.map((item) => {
            const renderItem = (navItem: SidebarNavItem, depth: number) => {
              const children = navItem.children ?? [];
              const hasChildren = children.length > 0;
              const isExpanded = !!expandedItems[navItem.id];
              return (
                <div key={navItem.id} className={depth === 0 ? 'bg-white/70 rounded-lg border border-wm-blue/10 shadow-sm' : ''}>
                  <div
                    className={`flex items-center justify-between ${depth === 0 ? 'px-3 py-2.5' : 'px-2.5 py-1.5'} ${
                      depth > 0 ? 'ml-1.5 border border-transparent rounded-md' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        navItem.onClick();
                      }}
                      className="flex items-center gap-2 text-left flex-1"
                      title={isCollapsed ? navItem.label : undefined}
                    >
                      <span
                        className={`rounded-md ${depth > 0 ? 'p-1' : 'p-1.5'} ${
                          navItem.isActive
                            ? 'text-wm-accent bg-wm-accent/15'
                            : 'text-wm-blue bg-wm-blue/10'
                        }`}
                      >
                        {navItem.icon}
                      </span>
                      {!isCollapsed && (
                        <span className={`font-semibold ${navItem.isActive ? 'text-wm-accent' : 'text-wm-blue/90'} ${depth > 0 ? 'text-xs leading-tight font-medium' : 'text-sm'}`}>
                          {navItem.label}
                        </span>
                      )}
                    </button>
                    {!isCollapsed && (hasChildren || navItem.onDelete) && (
                      <div className="flex items-center gap-2">
                        {navItem.onDelete && depth > 0 && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              if (navItem.canDelete === false) return;
                              navItem.onDelete?.();
                            }}
                            disabled={navItem.canDelete === false}
                            className={`p-1 rounded-md transition-colors ${
                              navItem.canDelete === false
                                ? 'text-wm-blue/25 cursor-not-allowed'
                                : 'text-wm-pink/70 hover:bg-wm-pink/10 hover:text-wm-pink'
                            }`}
                            aria-label={`Delete ${navItem.label}`}
                            title="Delete journey"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            toggleExpanded(navItem.id);
                          }}
                          className="p-1 rounded-md hover:bg-wm-blue/10 text-wm-blue/60"
                          aria-label={`Toggle ${navItem.label}`}
                        >
                          <Icons.ChevronDown
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                  {hasChildren && !isCollapsed && isExpanded && (
                    <div className={depth === 0 ? 'px-3 pb-2.5' : 'pl-3.5 pr-2 pb-1.5'}>
                      <div className="space-y-1">
                        {children.map((child) => renderItem(child, depth + 1))}
                      </div>
                    </div>
                  )}
                </div>
              );
            };

            return renderItem(item, 0);
          })}
        </div>
      </div>

      <div className="p-4 border-t border-wm-neutral/20 bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-wm-accent flex items-center justify-center text-sm font-bold text-white">
            {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-wm-blue truncate">{user.displayName || 'User'}</p>
              <p className="text-sm text-wm-blue/50 truncate">{user.email}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default SidebarNav;
