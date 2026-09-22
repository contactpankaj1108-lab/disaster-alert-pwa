import React, { useState, useEffect } from 'react';
import { Search, Filter, Hospital, Shield, Flame, Home } from 'lucide-react';

export default function ResourceFilter({
  searchQuery,
  onSearchChange,
  selectedTypes,
  onToggleType,
  counts = {}
}) {
  const [inputValue, setInputValue] = useState(searchQuery);

  // Debounce search input to conserve CPU and prevent DOM layout thrashing
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue !== searchQuery) {
        onSearchChange(inputValue);
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [inputValue, onSearchChange, searchQuery]);

  const categories = [
    { id: 'hospital', label: 'Hospitals', icon: Hospital, color: '#ef4444' },
    { id: 'police', label: 'Police', icon: Shield, color: '#3b82f6' },
    { id: 'fire', label: 'Fire Stations', icon: Flame, color: '#f97316' },
    { id: 'shelter', label: 'Shelters', icon: Home, color: '#10b981' }
  ];

  return (
    <div className="resource-filter-bar" style={{ background: 'var(--bg-surface)', padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
      
      {/* Search Input Bar with 250ms Debouncing */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem 0.75rem' }}>
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Search by facility name, sector, or street..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            width: '100%'
          }}
        />
        {inputValue && (
          <button
            onClick={() => {
              setInputValue('');
              onSearchChange('');
            }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Category Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginRight: '0.25rem' }}>
          <Filter size={14} /> Filter:
        </span>

        {categories.map((cat) => {
          const isSelected = selectedTypes.includes(cat.id);
          const IconComp = cat.icon;
          const count = counts[cat.id] ?? 0;

          return (
            <button
              key={cat.id}
              onClick={() => onToggleType(cat.id)}
              className="tab-btn"
              style={{
                fontSize: '0.8rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                background: isSelected ? 'var(--bg-subtle)' : '#ffffff',
                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: isSelected ? `2px solid ${cat.color}` : '1px solid var(--border-color)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <IconComp size={14} color={cat.color} />
              <span style={{ fontWeight: isSelected ? '600' : '400' }}>{cat.label}</span>
              <span style={{ fontSize: '0.72rem', background: '#e2e8f0', color: '#0f172a', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: '600' }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
