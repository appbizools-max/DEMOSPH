import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { ChevronRight, Check, Circle } from 'lucide-react';

interface DropdownContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownContext = createContext<DropdownContextType | null>(null);

interface RadioGroupContextType {
  value: string;
  onValueChange: (val: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextType | null>(null);

export const DropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

export const DropdownMenuTrigger: React.FC<{ asChild?: boolean; children: React.ReactNode }> = ({ children }) => {
  const context = useContext(DropdownContext);
  if (!context) return null;

  return (
    <div onClick={() => context.setOpen(prev => !prev)} style={{ cursor: 'pointer', width: '100%' }}>
      {children}
    </div>
  );
};

export const DropdownMenuContent: React.FC<{ className?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ children, className = '', style = {} }) => {
  const context = useContext(DropdownContext);
  if (!context || !context.open) return null;

  return (
    <div 
      className={`custom-dropdown-scroll ${className}`}
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        right: 0,
        minWidth: '220px',
        maxHeight: '340px',
        overflowY: 'auto',
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(0, 0, 0, 0.06)',
        padding: '6px',
        zIndex: 99999,
        animation: 'fadeIn 0.15s ease-out',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const DropdownMenuGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>{children}</div>;
};

export const DropdownMenuLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={{
      fontSize: '11px !important',
      fontWeight: 800,
      color: '#64748b',
      padding: '8px 12px 4px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }}>
      {children}
    </div>
  );
};

export const DropdownMenuRadioGroup: React.FC<{ value: string; onValueChange: (val: string) => void; children: React.ReactNode }> = ({ value, onValueChange, children }) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      {children}
    </RadioGroupContext.Provider>
  );
};

export const DropdownMenuRadioItem: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => {
  const radioContext = useContext(RadioGroupContext);
  const dropdownContext = useContext(DropdownContext);
  
  if (!radioContext || !dropdownContext) return null;
  const isSelected = radioContext.value === value;

  return (
    <div
      onClick={() => {
        radioContext.onValueChange(value);
        dropdownContext.setOpen(false);
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '9px 12px',
        borderRadius: '8px',
        fontSize: '12.5px !important',
        fontWeight: isSelected ? 700 : 500,
        color: isSelected ? '#258ec8' : '#0f172a',
        backgroundColor: isSelected ? '#eef5fc' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.12s ease'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          border: isSelected ? '4px solid #258ec8' : '1.5px solid #94a3b8',
          backgroundColor: '#ffffff',
          boxSizing: 'border-box'
        }} />
        <span>{children}</span>
      </div>
      {isSelected && <Check size={16} color="#258ec8" />}
    </div>
  );
};
