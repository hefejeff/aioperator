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
      className={`${isCollapsed ? 'w-16' : 'w-72'} bg-wm-white border-r border-wm-blue/10 flex flex-col transition-all duration-300 ease-in-out`}
    >
      <div className="p-4 border-b border-wm-blue/10 bg-wm-white">
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

      <div className="flex-1 py-4">
        <div className="px-3 space-y-3">
          {items.map((item) => {
            const renderItem = (navItem: SidebarNavItem, depth: number) => {
              const children = navItem.children ?? [];
              const hasChildren = children.length > 0;
              const isExpanded = !!expandedItems[navItem.id];
              return (
                <div key={navItem.id} className={depth === 0 ? 'bg-white rounded-xl border border-wm-blue/10 shadow-sm' : ''}>
                  <div
                    className={`flex items-center justify-between ${depth === 0 ? 'px-4 py-3' : 'px-3 py-2'} ${
                      depth > 0 ? 'ml-2 border border-transparent rounded-lg' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        navItem.onClick();
                      }}
                      className="flex items-center gap-3 text-left flex-1"
                      title={isCollapsed ? navItem.label : undefined}
                    >
                      <span
                        className={`rounded-md p-1.5 ${
                          navItem.isActive
                            ? 'text-wm-accent bg-wm-accent/15'
                            : 'text-wm-blue bg-wm-blue/10'
                        }`}
                      >
                        {navItem.icon}
                      </span>
                      {!isCollapsed && (
                        <span className={`font-semibold ${navItem.isActive ? 'text-wm-accent' : 'text-wm-blue'} ${depth > 0 ? 'text-sm' : ''}`}>
                          {navItem.label}
                        </span>
                      )}
                    </button>
                    {!isCollapsed && hasChildren && (
                      <div className="flex items-center gap-2">
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
                    <div className={depth === 0 ? 'px-4 pb-3' : 'pl-4 pr-2 pb-2'}>
                      <div className="space-y-1.5">
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

      <div className="p-4 border-t border-wm-neutral/20 bg-white/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-wm-accent flex items-center justify-center text-sm font-bold text-white">
            {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-wm-blue truncate">{user.displayName || 'User'}</p>
              <p className="text-xs text-wm-blue/50 truncate">{user.email}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default SidebarNav;
