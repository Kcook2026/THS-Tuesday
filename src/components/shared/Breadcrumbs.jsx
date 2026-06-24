import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumbs({ items }) {
  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="w-3 h-3 shrink-0" />}
          {item.path && i < items.length - 1 ? (
            <Link to={item.path} className="hover:text-foreground transition-colors">{item.label}</Link>
          ) : (
            <span className={i === items.length - 1 ? 'text-foreground font-medium' : ''}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}