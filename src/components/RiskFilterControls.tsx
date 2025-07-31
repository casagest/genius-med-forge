import React, { useState, useCallback } from 'react';
import { useRiskReportStore } from '@/store/useRiskReportStore';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Filter, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Debounce hook pentru optimizarea performanțelor
const useDebounce = (callback: Function, delay: number) => {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout>();

  const debouncedCallback = useCallback((...args: any[]) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    
    const newTimer = setTimeout(() => {
      callback(...args);
    }, delay);
    
    setDebounceTimer(newTimer);
  }, [callback, delay, debounceTimer]);

  return debouncedCallback;
};

export const RiskFilterControls: React.FC = () => {
  const { filters, setFilters } = useRiskReportStore();
  const [localScoreValue, setLocalScoreValue] = useState([filters.score_lt || 1]);

  // Debounce pentru slider-ul de scor (optimizare performance)
  const debouncedScoreUpdate = useDebounce((value: number[]) => {
    setFilters({ score_lt: value[0] });
  }, 300);

  const handleScoreChange = (value: number[]) => {
    setLocalScoreValue(value);
    debouncedScoreUpdate(value);
  };

  const handleDateSelect = (field: 'from' | 'to') => (date: Date | undefined) => {
    if (date) {
      const isoString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      setFilters({ [field]: isoString });
    } else {
      setFilters({ [field]: null });
    }
  };

  const clearAllFilters = () => {
    setFilters({
      score_lt: null,
      actionRequired: null,
      from: null,
      to: null,
    });
    setLocalScoreValue([1]);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.score_lt && filters.score_lt < 1) count++;
    if (filters.actionRequired !== null) count++;
    if (filters.from) count++;
    if (filters.to) count++;
    return count;
  };

  const formatDateForDisplay = (dateString: string | null) => {
    if (!dateString) return null;
    return format(new Date(dateString), 'dd MMM yyyy', { locale: ro });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-medium">Filtre Rapoarte</h3>
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary" className="h-5">
              {getActiveFilterCount()}
            </Badge>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          disabled={getActiveFilterCount() === 0}
          className="h-8"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Resetează
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Slider pentru scorul de risc */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Scor risc maxim: {(localScoreValue[0] * 100).toFixed(0)}%
          </label>
          <Slider
            value={localScoreValue}
            onValueChange={handleScoreChange}
            max={1}
            min={0}
            step={0.05}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Toggle pentru acțiune necesară */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Acțiune necesară</label>
          <Toggle
            pressed={filters.actionRequired === true}
            onPressedChange={(pressed) => 
              setFilters({ actionRequired: pressed ? true : null })
            }
            className="w-full justify-start"
          >
            {filters.actionRequired ? 'Doar cu acțiuni' : 'Toate rapoartele'}
          </Toggle>
        </div>

        {/* Date picker pentru data de începere */}
        <div className="space-y-2">
          <label className="text-sm font-medium">De la data</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.from ? (
                  formatDateForDisplay(filters.from)
                ) : (
                  <span>Selectează data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.from ? new Date(filters.from) : undefined}
                onSelect={handleDateSelect('from')}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date picker pentru data de sfârșit */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Până la data</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.to ? (
                  formatDateForDisplay(filters.to)
                ) : (
                  <span>Selectează data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.to ? new Date(filters.to) : undefined}
                onSelect={handleDateSelect('to')}
                initialFocus
                className="p-3 pointer-events-auto"
                disabled={(date) => {
                  // Dezactivează datele anterioare datei de început
                  if (filters.from) {
                    return date < new Date(filters.from);
                  }
                  return false;
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};