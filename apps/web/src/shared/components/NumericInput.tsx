import React from 'react';

interface NumericInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void;
}

/**
 * An input component that only allows integer numbers.
 * Filters non-numeric characters on change and paste.
 */
export const NumericInput: React.FC<NumericInputProps> = ({ 
  onChange, 
  onValueChange,
  onKeyDown,
  ...props 
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, and . (optional, but requested only integers)
    if (
      ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (e.ctrlKey === true || e.metaKey === true) ||
      // Allow: digits 0-9
      /^[0-9]$/.test(e.key)
    ) {
      return;
    }
    e.preventDefault();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Strip everything except digits
    const numericValue = value.replace(/\D/g, '');
    
    // Create a synthetic event or call the callback
    if (onValueChange) {
      onValueChange(numericValue);
    }
    
    if (onChange) {
      // Create a modified target with the numeric value
      const newEvent = {
        ...e,
        target: {
          ...e.target,
          name: e.target.name,
          value: numericValue
        }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(newEvent);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteData = e.clipboardData.getData('text');
    if (!/^\d+$/.test(pasteData)) {
      e.preventDefault();
      const strippedData = pasteData.replace(/\D/g, '');
      // If we have some numeric data, we manually update it
      if (strippedData) {
        const input = e.target as HTMLInputElement;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const currentVal = input.value;
        const newVal = currentVal.substring(0, start) + strippedData + currentVal.substring(end);
        
        // This is a bit hacky but ensures paste works correctly with filtering
        const syntheticEvent = {
          target: {
            name: input.name,
            value: newVal
          }
        } as React.ChangeEvent<HTMLInputElement>;
        
        if (onValueChange) onValueChange(newVal);
        if (onChange) onChange(syntheticEvent);
      }
    }
  };

  return (
    <input
      {...props}
      type={props.type || "tel"}
      inputMode="numeric"
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onPaste={handlePaste}
    />
  );
};
