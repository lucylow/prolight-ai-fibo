import React from 'react';

interface ColorTemperatureProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const ColorTemperature = ({ value, onChange, disabled }: ColorTemperatureProps) => {
  const getGradient = () => {
    return 'linear-gradient(to right, #FF4500, #FF8C00, #FFD700, #FFFACD, #87CEEB, #4169E1)';
  };

  return (
    <div className="relative">
      <input
        type="range"
        min={2500}
        max={10000}
        step={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-3 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: getGradient(),
        }}
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>2500K</span>
        <span>5600K</span>
        <span>10000K</span>
      </div>
    </div>
  );
};
