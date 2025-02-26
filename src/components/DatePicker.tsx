import { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface DatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onClose: () => void;
}

export default function DatePicker({ selectedDate, onDateChange, onClose }: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const [tempSelectedDate, setTempSelectedDate] = useState(new Date(selectedDate));
  
  // Convert 24-hour to 12-hour format
  const [hours, setHours] = useState(selectedDate.getHours() % 12 || 12);
  const [minutes, setMinutes] = useState(selectedDate.getMinutes());
  const [ampm, setAmPm] = useState(selectedDate.getHours() >= 12 ? 'PM' : 'AM');

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const handleDayClick = (day: Date) => {
    const newDate = new Date(day);
    // Convert hours back to 24-hour format when setting the date
    const hours24 = ampm === 'PM' ? (hours === 12 ? 12 : hours + 12) : (hours === 12 ? 0 : hours);
    newDate.setHours(hours24);
    newDate.setMinutes(minutes);
    setTempSelectedDate(newDate);
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHours = parseInt(e.target.value);
    setHours(newHours);
    
    const newDate = new Date(tempSelectedDate);
    // Convert to 24-hour format when setting the date
    const hours24 = ampm === 'PM' ? (newHours === 12 ? 12 : newHours + 12) : (newHours === 12 ? 0 : newHours);
    newDate.setHours(hours24);
    setTempSelectedDate(newDate);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinutes = parseInt(e.target.value);
    setMinutes(newMinutes);
    
    const newDate = new Date(tempSelectedDate);
    newDate.setMinutes(newMinutes);
    setTempSelectedDate(newDate);
  };

  const handleAmPmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAmPm = e.target.value;
    setAmPm(newAmPm);
    
    const newDate = new Date(tempSelectedDate);
    // Convert hours to 24-hour format
    const hours24 = newAmPm === 'PM' ? (hours === 12 ? 12 : hours + 12) : (hours === 12 ? 0 : hours);
    newDate.setHours(hours24);
    setTempSelectedDate(newDate);
  };

  const handleSave = () => {
    onDateChange(tempSelectedDate);
    onClose();
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-900 dark:text-gray-100" />
          </button>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{format(currentMonth, 'MMMM yyyy')}</h2>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-900 dark:text-gray-100" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-center font-medium text-xs py-1 text-gray-800 dark:text-gray-200">
              {day}
            </div>
          ))}
          
          {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, index) => (
            <div key={`empty-${index}`} className="py-1" />
          ))}
          
          {days.map(day => {
            const isSelected = isSameDay(day, tempSelectedDate);
            const isDayToday = isToday(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            
            return (
              <button
                key={day.toString()}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`
                  py-1 rounded-full text-sm
                  ${isSelected ? 'bg-[#dbf111] text-gray-900 dark:text-gray-900' : ''}
                  ${isDayToday && !isSelected ? 'border border-[#dbf111]' : ''}
                  ${!isCurrentMonth ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}
                  ${!isSelected && isCurrentMonth ? 'hover:bg-[#dbf11140]' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="mb-6 flex items-center justify-center space-x-4">
        <div>
          <label htmlFor="hours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Hour
          </label>
          <select
            id="hours"
            value={hours}
            onChange={handleHoursChange}
            className="block w-16 py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-[#dbf111] focus:border-[#dbf111] text-gray-900 dark:text-gray-100"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="minutes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Minute
          </label>
          <select
            id="minutes"
            value={minutes}
            onChange={handleMinutesChange}
            className="block w-16 py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-[#dbf111] focus:border-[#dbf111] text-gray-900 dark:text-gray-100"
          >
            {Array.from({ length: 60 }, (_, i) => (
              <option key={i} value={i}>
                {i.toString().padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="ampm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            AM/PM
          </label>
          <select
            id="ampm"
            value={ampm}
            onChange={handleAmPmChange}
            className="block w-18 py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-[#dbf111] focus:border-[#dbf111] text-gray-900 dark:text-gray-100"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 mt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 bg-[#dbf111] border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 hover:bg-[#c7db0f]"
        >
          Save
        </button>
      </div>
    </div>
  );
}
