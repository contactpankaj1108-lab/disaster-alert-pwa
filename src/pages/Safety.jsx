import React, { useState } from 'react';
import { BookOpen, ShieldAlert, Waves, Zap, Flame, Wind } from 'lucide-react';

const safetyGuides = [
  {
    id: 'flood',
    title: 'Flood Safety Protocols',
    icon: Waves,
    color: '#38bdf8',
    tips: [
      'Move immediately to higher ground. Avoid low-lying basements and underpasses.',
      'Do not walk, swim, or drive through moving floodwaters. Turn Around, Don’t Drown!',
      '6 inches of fast-moving water can knock you over; 12 inches can carry away a small vehicle.',
      'Disconnect electrical appliances and turn off the main breaker if water begins entering.',
      'Drink bottled or boiled water only; municipal water lines may become contaminated.'
    ]
  },
  {
    id: 'earthquake',
    title: 'Earthquake Safety (Drop, Cover, Hold On)',
    icon: Zap,
    color: '#f59e0b',
    tips: [
      'DROP to your hands and knees to prevent being knocked down.',
      'COVER your head and neck under a sturdy table or desk.',
      'HOLD ON to your shelter until violent shaking stops completely.',
      'If indoors, stay inside! Do not run outside or use elevators during tremors.',
      'If outdoors, move away from buildings, streetlights, overhead utility wires, and brick facades.'
    ]
  },
  {
    id: 'fire',
    title: 'Fire & Wildfire Evacuation',
    icon: Flame,
    color: '#ef4444',
    tips: [
      'Crawl low under smoke toward the nearest exit — cleaner air is closest to the floor.',
      'Feel closed doors with the back of your hand before opening; if warm, find an alternate route.',
      'Never go back inside a burning structure for personal belongings.',
      'Keep your emergency go-bag and vehicle keys within immediate reach.',
      'Call local emergency services immediately once you have reached safety.'
    ]
  },
  {
    id: 'severe-weather',
    title: 'Severe Storm & Cyclonic Winds',
    icon: Wind,
    color: '#a855f7',
    tips: [
      'Shelter in an interior, windowless room on the lowest floor of a reinforced building.',
      'Stay away from glass windows, exterior doors, and skylights.',
      'Keep phones charged and tune into battery-powered NOAA or local weather radio broadcasts.',
      'Secure or bring indoors outdoor furniture, loose debris, and lightweight objects.',
      'Unplug sensitive electronics to protect against voltage spikes from lightning strikes.'
    ]
  }
];

export default function Safety() {
  const [selectedGuide, setSelectedGuide] = useState('flood');
  const active = safetyGuides.find((g) => g.id === selectedGuide) || safetyGuides[0];
  const IconComponent = active.icon;

  return (
    <div className="safety-page">
      <div className="card">
        <div className="card-title">
          <BookOpen size={20} color="#475569" />
          Offline Emergency Preparedness & Safety Guidelines
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Standardized life-safety protocols. Stored 100% locally in your browser cache so they remain fully accessible during telecommunications blackouts.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {safetyGuides.map((guide) => {
            const GuideIcon = guide.icon;
            return (
              <button
                key={guide.id}
                className={`tab-btn ${selectedGuide === guide.id ? 'active' : ''}`}
                onClick={() => setSelectedGuide(guide.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <GuideIcon size={16} color={guide.color} />
                {guide.title.split(' ')[0]}
              </button>
            );
          })}
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <IconComponent size={24} color={active.color} />
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>{active.title}</h3>
          </div>

          <ul style={{ listStyleType: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {active.tips.map((tip, idx) => (
              <li 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '0.6rem', 
                  color: 'var(--text-primary)',
                  fontSize: '0.92rem',
                  lineHeight: '1.5'
                }}
              >
                <span style={{ color: active.color, fontWeight: '700' }}>✔</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
