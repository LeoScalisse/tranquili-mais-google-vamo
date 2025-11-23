import React, { useState, useEffect } from 'react';
import { EventManager, Event } from '../components/ui/event-manager';
import { playSound } from '../services/soundService';
import { SparklesIcon } from '../components/ui/Icons';

const STORAGE_KEY = 'gratitude_events';

const GratitudeSummary: React.FC<{ events: Event[] }> = ({ events }) => {
  const [stats, setStats] = useState({ count: 0, topTags: [] as string[] });

  useEffect(() => {
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    const lastWeekEvents = events.filter(e => {
      const eventDate = new Date(e.startTime);
      return eventDate >= oneWeekAgo && eventDate <= now;
    });

    const tagsDist: Record<string, number> = {};
    lastWeekEvents.forEach(e => e.tags?.forEach(t => tagsDist[t] = (tagsDist[t] || 0) + 1));
    const topTags = Object.entries(tagsDist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(e => e[0]);

    setStats({ count: lastWeekEvents.length, topTags });
  }, [events]);

  if (stats.count === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center gap-4">
        <div className="p-3 bg-gray-100 rounded-full text-gray-400">
          <SparklesIcon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-700">Sua semana começa agora</h3>
          <p className="text-sm text-gray-500">Registre um pequeno momento de alegria para iluminar seus dias.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-2xl shadow-sm border border-yellow-100 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-yellow-800 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5" />
            Resumo da Semana
          </h3>
          <p className="text-yellow-700 mt-2 leading-relaxed">
            Nos últimos 7 dias, você encontrou <span className="font-bold text-2xl mx-1">{stats.count}</span> 
            {stats.count === 1 ? 'motivo' : 'motivos'} para agradecer.
          </p>
        </div>
      </div>

      {stats.topTags.length > 0 && (
        <div className="mt-5 pt-4 border-t border-yellow-200/60">
          <p className="text-xs font-bold text-yellow-600 uppercase tracking-wide mb-3">O que mais te fez feliz</p>
          <div className="flex flex-wrap gap-2">
            {stats.topTags.map(tag => (
              <span key={tag} className="bg-white/80 backdrop-blur-sm text-yellow-800 px-3 py-1.5 rounded-full text-sm font-medium border border-yellow-200 shadow-sm">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const GratitudeScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        // Parse dates back to objects
        const parsed = JSON.parse(stored).map((e: any) => ({
          ...e,
          startTime: new Date(e.startTime),
          endTime: new Date(e.endTime)
        }));
        setEvents(parsed);
      } catch (e) {
        console.error("Failed to parse gratitude events", e);
      }
    }
  }, []);

  const saveEvents = (newEvents: Event[]) => {
    setEvents(newEvents);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEvents));
  };

  const handleCreate = (eventData: Omit<Event, "id">) => {
    playSound('confirm');
    const newEvent: Event = {
      ...eventData,
      id: crypto.randomUUID(),
    };
    saveEvents([...events, newEvent]);
  };

  const handleUpdate = (id: string, updates: Partial<Event>) => {
    playSound('select');
    const updatedEvents = events.map(e => e.id === id ? { ...e, ...updates } : e);
    saveEvents(updatedEvents);
  };

  const handleDelete = (id: string) => {
    playSound('toggle');
    const updatedEvents = events.filter(e => e.id !== id);
    saveEvents(updatedEvents);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-28 h-full overflow-y-auto">
      <header className="mb-6">
         <h1 className="text-3xl font-bold text-gray-800">Diário da Gratidão</h1>
         <p className="text-gray-500">Registre seus momentos de alegria e conquistas.</p>
      </header>

      <div className="animate-fade-in">
          <GratitudeSummary events={events} />
          
          <EventManager 
            events={events}
            onEventCreate={handleCreate}
            onEventUpdate={handleUpdate}
            onEventDelete={handleDelete}
          />
      </div>
    </div>
  );
};

export default GratitudeScreen;