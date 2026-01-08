
"use client"

import React, { useState, useCallback, useMemo } from "react"
import { Button, Card, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Badge, DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./Shadcn"
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Grid3x3, List, Search, Filter, X } from "./Icons"

// Helper for classnames
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

export interface Event {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  color: string
  category?: string
  attendees?: string[]
  tags?: string[]
}

export interface EventManagerProps {
  events?: Event[]
  onEventCreate?: (event: Omit<Event, "id">) => void
  onEventUpdate?: (id: string, event: Partial<Event>) => void
  onEventDelete?: (id: string) => void
  categories?: string[]
  colors?: { name: string; value: string; bg: string; text: string }[]
  defaultView?: "month" | "week" | "day" | "list"
  className?: string
  availableTags?: string[]
}

const defaultColors = [
  { name: "Azul", value: "blue", bg: "bg-blue-500", text: "text-blue-700" },
  { name: "Verde", value: "green", bg: "bg-green-500", text: "text-green-700" },
  { name: "Roxo", value: "purple", bg: "bg-purple-500", text: "text-purple-700" },
  { name: "Laranja", value: "orange", bg: "bg-orange-500", text: "text-orange-700" },
  { name: "Rosa", value: "pink", bg: "bg-pink-500", text: "text-pink-700" },
  { name: "Vermelho", value: "red", bg: "bg-red-500", text: "text-red-700" },
]

const categoryColorMap: Record<string, string> = {
  "Gratidão": "orange",
  "Conquista": "green",
  "Momento": "blue",
  "Reflexão": "purple"
};

// Safe date formatter for datetime-local input
const formatDateForInput = (date: Date | undefined | null) => {
  if (!date || isNaN(date.getTime())) return "";
  try {
    // We use a simple slice because PWA users expect a consistent ISO-like format
    // If we wanted local time perfectly we'd adjust for offset, but toISOString is the base
    return date.toISOString().slice(0, 16);
  } catch (e) {
    return "";
  }
};

interface EventCardProps {
  event: Event
  onEventClick: (event: Event) => void
  onDragStart: (event: Event) => void
  onDragEnd: () => void
  getColorClasses: (color: string) => { bg: string; text: string }
  variant?: "default" | "compact" | "detailed"
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  onEventClick,
  onDragStart,
  onDragEnd,
  getColorClasses,
  variant = "default",
}) => {
  const colorClasses = getColorClasses(event.color)

  return (
    <div
      draggable
      onDragStart={() => onDragStart(event)}
      onDragEnd={onDragEnd}
      onClick={() => onEventClick(event)}
      className={cn(
        "relative cursor-pointer rounded px-2 py-1 text-xs font-bold transition-all duration-200",
        colorClasses.bg,
        "text-white hover:opacity-90 hover:shadow-md",
        variant === "compact" ? "truncate" : ""
      )}
    >
       <div className="truncate">{event.title}</div>
    </div>
  )
}

const MonthView: React.FC<any> = ({ currentDate, events, onEventClick, onDragStart, onDragEnd, onDrop, getColorClasses }) => {
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const startDate = new Date(firstDayOfMonth)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const days = []
  const currentDay = new Date(startDate)

  for (let i = 0; i < 42; i++) {
    days.push(new Date(currentDay))
    currentDay.setDate(currentDay.getDate() + 1)
  }

  const getEventsForDay = (date: Date) => {
    return events.filter((event: Event) => {
      const eventDate = new Date(event.startTime)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  return (
    <Card className="overflow-hidden bg-white border border-gray-200 shadow-sm text-gray-900">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div key={day} className="border-r border-gray-200 p-2 text-center text-xs font-bold last:border-r-0 sm:text-sm text-gray-900">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day)
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isToday = day.toDateString() === new Date().toDateString()

          return (
            <div
              key={index}
              className={cn(
                "min-h-20 border-b border-r border-gray-100 p-1 transition-colors last:border-r-0 sm:min-h-24 sm:p-2",
                !isCurrentMonth && "bg-gray-50/50 text-gray-400",
                "hover:bg-blue-50/30",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(day)}
            >
              <div
                className={cn(
                  "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold sm:text-sm",
                  isToday ? "bg-[#38b6ff] text-white" : "text-gray-900"
                )}
              >
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event: Event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEventClick={onEventClick}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    getColorClasses={getColorClasses}
                    variant="compact"
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-gray-500 font-bold sm:text-xs">
                    +{dayEvents.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

const WeekView: React.FC<any> = ({ currentDate, events, onEventClick, onDragStart, onDragEnd, onDrop, getColorClasses }) => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
             {weekDays.map((day, i) => (
                 <Card key={i} className="p-4 min-h-[200px] bg-white border-gray-200">
                     <h3 className="font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">{day.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })}</h3>
                     <div className="space-y-2">
                        {events.filter((e: Event) => new Date(e.startTime).toDateString() === day.toDateString()).map((event: Event) => (
                            <EventCard
                                key={event.id}
                                event={event}
                                onEventClick={onEventClick}
                                onDragStart={onDragStart}
                                onDragEnd={onDragEnd}
                                getColorClasses={getColorClasses}
                            />
                        ))}
                     </div>
                 </Card>
             ))}
        </div>
    )
}

const DayView: React.FC<any> = ({ currentDate, events, onEventClick, onDragStart, onDragEnd, onDrop, getColorClasses }) => {
    const dayEvents = events.filter((e: Event) => new Date(e.startTime).toDateString() === currentDate.toDateString());
    
    return (
        <Card className="p-6 min-h-[400px] bg-white border-gray-200 shadow-sm">
            <h3 className="text-xl font-bold text-[#38b6ff] mb-6">{currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            {dayEvents.length === 0 ? (
                <p className="text-gray-500 italic font-medium">Nenhum registro para este dia.</p>
            ) : (
                <div className="space-y-3">
                    {dayEvents.map((event: Event) => (
                         <EventCard
                            key={event.id}
                            event={event}
                            onEventClick={onEventClick}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            getColorClasses={getColorClasses}
                            variant="detailed"
                        />
                    ))}
                </div>
            )}
        </Card>
    )
}

const ListView: React.FC<any> = ({ events, onEventClick, getColorClasses }) => {
    const sortedEvents = [...events].sort((a: Event, b: Event) => a.startTime.getTime() - b.startTime.getTime());
    
    return (
        <div className="space-y-4">
            {sortedEvents.length === 0 && <p className="text-center text-gray-700 font-bold mt-10">Nenhum registro encontrado.</p>}
            {sortedEvents.map((event: Event) => (
                <div 
                    key={event.id} 
                    onClick={() => onEventClick(event)}
                    className="bg-white p-4 rounded-xl shadow-md border border-gray-100 flex items-start gap-4 hover:shadow-lg transition-all cursor-pointer"
                >
                    <div className={cn("w-2 h-12 rounded-full", getColorClasses(event.color).bg)}></div>
                    <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-lg">{event.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 font-bold">
                            <Clock className="w-3 h-3" />
                            {event.startTime.toLocaleDateString('pt-BR')}
                            {event.category && (
                                <Badge variant="secondary" className="ml-2 bg-blue-50 text-[#38b6ff] border-blue-100 uppercase tracking-tighter">{event.category}</Badge>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// Global functions needed for the components above
const handleDragStart = (event: Event) => {};
const handleDragEnd = () => {};

export function EventManager({
  events: initialEvents = [],
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  categories = ["Gratidão", "Conquista", "Momento", "Reflexão"],
  colors = defaultColors,
  defaultView = "month",
  className,
  availableTags = ["Família", "Trabalho", "Natureza", "Saúde", "Amigos", "Eu Mesmo"],
}: EventManagerProps) {
  const events = initialEvents;
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week" | "day" | "list">(defaultView)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null)
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    title: "",
    description: "",
    color: colors[0].value,
    category: categories[0],
    tags: [],
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.category?.toLowerCase().includes(query) ||
          event.tags?.some((tag) => tag.toLowerCase().includes(query))

        if (!matchesSearch) return false
      }
      if (selectedColors.length > 0 && !selectedColors.includes(event.color)) return false
      if (selectedTags.length > 0) {
        const hasMatchingTag = event.tags?.some((tag) => selectedTags.includes(tag))
        if (!hasMatchingTag) return false
      }
      if (selectedCategories.length > 0 && event.category && !selectedCategories.includes(event.category)) return false
      return true
    })
  }, [events, searchQuery, selectedColors, selectedTags, selectedCategories])

  const handleCreateEvent = useCallback(() => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) return
    
    // Atribuição automática de cor baseada na categoria
    const categoryColor = newEvent.category ? categoryColorMap[newEvent.category] : colors[0].value;
    
    const event: Omit<Event, "id"> = {
      title: newEvent.title,
      description: newEvent.description,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      color: categoryColor || newEvent.color || colors[0].value,
      category: newEvent.category,
      tags: newEvent.tags || [],
    }
    onEventCreate?.(event)
    setIsDialogOpen(false)
    setIsCreating(false)
    setNewEvent({ title: "", description: "", color: colors[0].value, category: categories[0], tags: [] })
  }, [newEvent, colors, categories, onEventCreate])

  const handleUpdateEvent = useCallback(() => {
    if (!selectedEvent) return
    // Atualiza a cor se a categoria mudar
    if (selectedEvent.category) {
        selectedEvent.color = categoryColorMap[selectedEvent.category] || selectedEvent.color;
    }
    onEventUpdate?.(selectedEvent.id, selectedEvent)
    setIsDialogOpen(false)
    setSelectedEvent(null)
  }, [selectedEvent, onEventUpdate])

  const handleDeleteEvent = useCallback((id: string) => {
      onEventDelete?.(id)
      setIsDialogOpen(false)
      setSelectedEvent(null)
    },
    [onEventDelete],
  )

  const navigateDate = useCallback((direction: "prev" | "next") => {
      setCurrentDate((prev) => {
        const newDate = new Date(prev)
        if (view === "month") newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1))
        else if (view === "week") newDate.setDate(prev.getDate() + (direction === "next" ? 7 : -7))
        else if (view === "day") newDate.setDate(prev.getDate() + (direction === "next" ? 1 : -1))
        return newDate
      })
    },
    [view],
  )

  const getColorClasses = useCallback((colorValue: string) => {
      const color = colors.find((c) => c.value === colorValue)
      return color || colors[0]
    },
    [colors],
  )

  const handleDragStartInternal = useCallback((event: Event) => {
    setDraggedEvent(event)
  }, [])

  const handleDragEndInternal = useCallback(() => {
    setDraggedEvent(null)
  }, [])

  const handleDropInternal = useCallback((date: Date) => {
    if (!draggedEvent) return
    const duration = draggedEvent.endTime.getTime() - draggedEvent.startTime.getTime()
    const newStartTime = new Date(date)
    newStartTime.setHours(draggedEvent.startTime.getHours(), draggedEvent.startTime.getMinutes())
    const newEndTime = new Date(newStartTime.getTime() + duration)
    onEventUpdate?.(draggedEvent.id, { startTime: newStartTime, endTime: newEndTime })
    setDraggedEvent(null)
  }, [draggedEvent, onEventUpdate])

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h2 className="text-xl font-bold sm:text-2xl text-gray-900">
            {view === "month" && currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            {view === "week" && `Semana de ${currentDate.toLocaleDateString("pt-BR", { month: "short", day: "numeric" })}`}
            {view === "day" && currentDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric" })}
            {view === "list" && "Registros"}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate("prev")} className="h-8 w-8 rounded-full border-gray-200">
              <ChevronLeft className="h-4 w-4 text-gray-900" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="rounded-full border-gray-200 text-gray-900 font-bold">
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateDate("next")} className="h-8 w-8 rounded-full border-gray-200">
              <ChevronRight className="h-4 w-4 text-gray-900" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="sm:hidden">
            <Select value={view} onValueChange={(value: any) => setView(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mês</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="day">Dia</SelectItem>
                <SelectItem value="list">Lista</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-gray-100 bg-gray-50 p-1">
            <Button variant={view === "month" ? "secondary" : "ghost"} size="sm" onClick={() => setView("month")} className="h-8 font-bold">Mês</Button>
            <Button variant={view === "week" ? "secondary" : "ghost"} size="sm" onClick={() => setView("week")} className="h-8 font-bold">Semana</Button>
            <Button variant={view === "day" ? "secondary" : "ghost"} size="sm" onClick={() => setView("day")} className="h-8 font-bold">Dia</Button>
            <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setView("list")} className="h-8 font-bold">Lista</Button>
          </div>

          <Button onClick={() => { setIsCreating(true); setIsDialogOpen(true); const start = new Date(currentDate); start.setHours(9, 0, 0, 0); const end = new Date(start); end.setHours(10, 0, 0, 0); setNewEvent(prev => ({ ...prev, startTime: start, endTime: end })) }} className="w-full sm:w-auto shadow-md font-bold">
            <Plus className="mr-2 h-4 w-4" /> Novo Registro
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-900" />
          <Input
            placeholder="Buscar registros..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50 border-gray-100 text-gray-900 focus:bg-white font-medium"
          />
        </div>
      </div>

      {view === "month" && (
        <MonthView
          currentDate={currentDate}
          events={filteredEvents}
          onEventClick={(event: Event) => { setSelectedEvent(event); setIsDialogOpen(true); }}
          onDragStart={handleDragStartInternal}
          onDragEnd={handleDragEndInternal}
          onDrop={handleDropInternal}
          getColorClasses={getColorClasses}
        />
      )}

      {view === "week" && (
        <WeekView
          currentDate={currentDate}
          events={filteredEvents}
          onEventClick={(event: Event) => { setSelectedEvent(event); setIsDialogOpen(true); }}
          onDragStart={handleDragStartInternal}
          onDragEnd={handleDragEndInternal}
          onDrop={handleDropInternal}
          getColorClasses={getColorClasses}
        />
      )}

      {view === "day" && (
        <DayView
          currentDate={currentDate}
          events={filteredEvents}
          onEventClick={(event: Event) => { setSelectedEvent(event); setIsDialogOpen(true); }}
          onDragStart={handleDragStartInternal}
          onDragEnd={handleDragEndInternal}
          onDrop={handleDropInternal}
          getColorClasses={getColorClasses}
        />
      )}

      {view === "list" && (
        <ListView
          events={filteredEvents}
          onEventClick={(event: Event) => { setSelectedEvent(event); setIsDialogOpen(true); }}
          getColorClasses={getColorClasses}
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreating ? "Novo Registro Diário" : "Ver Detalhes do Registro"}</DialogTitle>
            <DialogDescription>
              {isCreating ? "Guarde este momento especial para refletir depois." : "Reviva suas memórias e conquistas."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título do Momento</Label>
              <Input
                value={isCreating ? newEvent.title : selectedEvent?.title}
                onChange={(e) => isCreating ? setNewEvent((prev) => ({ ...prev, title: e.target.value })) : setSelectedEvent((prev) => (prev ? { ...prev, title: e.target.value } : null))}
                className="font-bold text-gray-900"
                placeholder="Ex: Passeio no parque"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição / Reflexão</Label>
              <Textarea
                value={isCreating ? newEvent.description : selectedEvent?.description}
                onChange={(e) => isCreating ? setNewEvent((prev) => ({ ...prev, description: e.target.value })) : setSelectedEvent((prev) => (prev ? { ...prev, description: e.target.value } : null))}
                placeholder="Como foi este momento? O que você sentiu?"
                className="text-gray-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data e Hora</Label>
                <Input
                  type="datetime-local"
                  className="text-gray-900"
                  value={isCreating ? formatDateForInput(newEvent.startTime) : formatDateForInput(selectedEvent?.startTime)}
                  onChange={(e) => { 
                    const dateStr = e.target.value;
                    if (!dateStr) return;
                    const date = new Date(dateStr); 
                    if (isNaN(date.getTime())) return;
                    
                    if (isCreating) {
                      setNewEvent(prev => ({ ...prev, startTime: date, endTime: new Date(date.getTime() + 3600000) }))
                    } else {
                      setSelectedEvent(prev => prev ? { ...prev, startTime: date, endTime: new Date(date.getTime() + 3600000) } : null)
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={isCreating ? newEvent.category || "" : selectedEvent?.category || ""}
                  onValueChange={(val) => isCreating ? setNewEvent(prev => ({ ...prev, category: val })) : setSelectedEvent(prev => prev ? { ...prev, category: val } : null)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            {!isCreating && (
              <Button variant="destructive" onClick={() => selectedEvent && handleDeleteEvent(selectedEvent.id)} className="font-bold">Excluir</Button>
            )}
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)} className="font-bold">Fechar</Button>
            <Button onClick={isCreating ? handleCreateEvent : handleUpdateEvent} className="font-bold">{isCreating ? "Criar Registro" : "Atualizar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
