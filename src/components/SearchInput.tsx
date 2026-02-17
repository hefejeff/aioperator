import React from 'react';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  rightElement?: React.ReactNode;
  containerClassName?: string;
  inputClassName?: string;
  size?: 'sm' | 'lg';
}

const SearchInput: React.FC<SearchInputProps> = ({
  rightElement,
  containerClassName = 'relative',
  inputClassName,
  size = 'lg',
  className,
  ...props
}) => {
  const baseClasses =
    size === 'sm'
      ? 'w-full px-4 py-2 text-sm border border-wm-neutral/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-wm-accent/50 focus:border-wm-accent'
      : 'w-full px-6 py-4 text-lg border-2 border-wm-neutral/30 rounded-xl focus:outline-none focus:border-wm-accent transition-colors';
  return (
    <div className={containerClassName}>
      <input
        {...props}
        className={`${baseClasses} ${inputClassName || ''} ${className || ''}`}
      />
      {rightElement && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
