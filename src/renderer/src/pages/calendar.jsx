import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, MessageSquare, Save, X, Activity, FileText } from 'lucide-react';
import { useConversationHandler } from '../api/conversationHandler';
import { useRecordManagement } from '../api/recordManagement';

const Calendar = () => {
  // Initialize with current date
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  
  // Fetch records from the application data
  const [userRecords, setUserRecords] = useState([]);
  
  // Import conversation and record management hooks
  const { 
    conversations, 
    getCurrentConversation, 
    createNewConversation, 
    saveConversation 
  } = useConversationHandler();
  const recordManager = useRecordManagement();
  
  // Helper function to update conversation messages
  const setConversationMessages = (conversationId, messages) => {
    saveConversation(conversationId, messages);
  };
  
  // Fetch records on component mount
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        // Get real medical records from record manager (exclude conversations)
        const medicalRecordItems = recordManager.medicalRecords.map((record) => {
          // Fix date issue by adjusting for timezone
          const originalDate = new Date(record.fileDate || record.createdDate);
          const utcDate = new Date(originalDate.getTime() - (originalDate.getTimezoneOffset() * 60000));
          const correctedDate = utcDate.toISOString().split('T')[0];
          
          return {
            id: `med-${record.id}`,
            recordType: record.category || "Medical Record",
            date: correctedDate,
            time: new Date(record.fileDate || record.createdDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            description: record.title || 'Medical Record',
            notes: record.notes ? (typeof record.notes === 'string' ? [record.notes] : record.notes) : []
          };
        });
        
        // Set only medical records (no conversations)
        setUserRecords(medicalRecordItems);
      } catch (error) {
        console.error('Error fetching records:', error);
        // Fallback to empty records array
        setUserRecords([]);
      }
    };
    
    fetchRecords();
  }, [recordManager.medicalRecords]);
  
  // New record form data
  const [newRecord, setNewRecord] = useState({
    recordType: 'Medical Record',
    date: '',
    time: '',
    description: '',
    notes: []
  });
  
  // Days of week
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Calendar navigation
  const goToPreviousMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };
  
  const goToNextMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };
  
  // Format current month and year
  const formatMonth = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  // Calculate days for the current month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };
  
  // Calculate the first day of the month (0-6, where 0 is Sunday)
  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };
  
  // Generate calendar day cells
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const calendarDays = [];
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="h-12 p-1"></div>);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      // Fix timezone issue to match the corrected dates from records
      const utcDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
      const dateString = utcDate.toISOString().split('T')[0];
      
      const hasRecord = userRecords.some(record => 
        record.date === dateString
      );
      
      const isSelected = selectedDate && 
        selectedDate.getDate() === day && 
        selectedDate.getMonth() === currentDate.getMonth() && 
        selectedDate.getFullYear() === currentDate.getFullYear();
      
      const isToday = new Date().getDate() === day && 
        new Date().getMonth() === currentDate.getMonth() && 
        new Date().getFullYear() === currentDate.getFullYear();
      
      calendarDays.push(
        <div 
          key={day} 
          onClick={() => handleDateClick(date)}
          className={`h-12 p-1 relative rounded transition cursor-pointer
            ${hasRecord ? 'font-medium' : ''}
            ${isSelected ? 'bg-teal-100 border border-teal-300' : ''}
            ${isToday ? 'bg-teal-50 border border-teal-200' : ''}
            hover:bg-gray-50`}
        >
          <span className="block text-center text-gray-800">{day}</span>
          {hasRecord && (
            <div className="absolute bottom-1 inset-x-0 flex justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-teal-500"></div>
            </div>
          )}
        </div>
      );
    }
    
    return calendarDays;
  };
  
  // Event handlers
  const handleDateClick = (date) => {
    setSelectedDate(date);
    
    // Set the date in the new record form in case user wants to add a record
    // Fix timezone issue for consistent date representation
    const utcDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    const formattedDate = utcDate.toISOString().split('T')[0];
    setNewRecord(prev => ({ ...prev, date: formattedDate }));
  };
  
  const handleRecordClick = (record) => {
    setSelectedRecord(record);
  };
  
  const handleAddNote = () => {
    if (!selectedRecord) return;
    setShowNoteModal(true);
  };
  
  const saveNote = async () => {
    if (!newNote.trim() || !selectedRecord) return;
    
    try {
      // Add note to medical record
      const recordId = selectedRecord.id.replace('med-', '');
      const record = recordManager.medicalRecords.find(r => r.id === recordId);
      
      if (record) {
        // Create updated record with new note
        const updatedRecord = {
          ...record,
          notes: record.notes 
            ? (typeof record.notes === 'string' 
                ? [record.notes, newNote] 
                : [...record.notes, newNote])
            : [newNote]
        };
        
        // Update the record using record manager
        recordManager.updateRecord(updatedRecord);
      }
      
      // Update local state
      const updatedRecords = userRecords.map(record => {
        if (record.id === selectedRecord.id) {
          return {
            ...record,
            notes: [...record.notes, newNote]
          };
        }
        return record;
      });
      
      setUserRecords(updatedRecords);
      setSelectedRecord({
        ...selectedRecord,
        notes: [...selectedRecord.notes, newNote]
      });
      
      setNewNote('');
      setShowNoteModal(false);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save the note. Please try again.');
    }
  };
  
  const addNewRecord = async () => {
    // Validate form
    if (!newRecord.description || !newRecord.date || !newRecord.time) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      // Create a timestamp from date and time
      const recordDate = new Date(`${newRecord.date}T${newRecord.time}`);
      
      // Create a new medical record using record manager
      const newMedicalRecord = {
        id: Date.now().toString(),
        title: newRecord.description,
        category: newRecord.recordType,
        fileDate: recordDate.toISOString(),
        createdDate: new Date().toISOString(),
        notes: [],
        files: []
      };
      
      // Save using record manager
      recordManager.saveRecord(newMedicalRecord);
      
      // Add to local state
      const recordToAdd = {
        id: `med-${newMedicalRecord.id}`,
        recordType: newRecord.recordType,
        date: newRecord.date,
        time: newRecord.time,
        description: newRecord.description,
        notes: []
      };
      
      setUserRecords([recordToAdd, ...userRecords]);
      
      // Reset form
      setNewRecord({
        recordType: 'Medical Record',
        date: '',
        time: '',
        description: '',
        notes: []
      });
      
      setShowRecordModal(false);
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Failed to save the record. Please try again.');
    }
  };
  
  // Filter records for selected date
  const getRecordsForSelectedDate = () => {
    if (!selectedDate) return [];
    
    // Fix timezone issue for consistent date comparison
    const utcDate = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000));
    const dateString = utcDate.toISOString().split('T')[0];
    
    return userRecords.filter(record => record.date === dateString);
  };
  
  // Get recent records
  const getRecentRecords = () => {
    const today = new Date();
    return userRecords
      .filter(record => new Date(record.date) <= today)
      .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by most recent first
      .slice(0, 3);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Medical Records Calendar</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Calendar section */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-teal-700 text-white flex items-center justify-between">
            <button 
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-teal-600 rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center">
              <CalendarIcon className="w-5 h-5 mr-2" />
              <h3 className="font-medium text-lg">{formatMonth(currentDate)}</h3>
            </div>
            <button 
              onClick={goToNextMonth}
              className="p-2 hover:bg-teal-600 rounded-full"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4">
            {/* Days of week */}
            <div className="grid grid-cols-7 mb-2">
              {days.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays()}
            </div>
          </div>
        </div>
        
        {/* Records section */}
        <div>
          {/* Selected date records */}
          {selectedDate ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-medium text-gray-800">
                  {selectedDate.toLocaleDateString('en-US', { 
                    month: 'long', day: 'numeric', year: 'numeric' 
                  })}
                </h3>
                <button 
                  onClick={() => setShowRecordModal(true)}
                  className="p-1.5 bg-teal-50 text-teal-600 rounded-md hover:bg-teal-100 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-2 divide-y divide-gray-100">
                {getRecordsForSelectedDate().length > 0 ? (
                  getRecordsForSelectedDate().map(record => (
                    <div 
                      key={record.id} 
                      className={`p-3 hover:bg-gray-50 cursor-pointer rounded-md transition ${
                        selectedRecord?.id === record.id ? 'bg-teal-50 border border-teal-200' : ''
                      }`}
                      onClick={() => handleRecordClick(record)}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-800">{record.description}</h4>
                        <span className="text-sm text-gray-500">{record.time}</span>
                      </div>
                      <div className="flex items-center mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">
                          {record.recordType}
                        </span>
                      </div>
                      
                      {/* Notes count badge */}
                      {record.notes.length > 0 && (
                        <div className="mt-2 flex items-center">
                          <FileText className="w-3.5 h-3.5 text-teal-600 mr-1.5" />
                          <span className="text-xs text-gray-500">
                            {record.notes.length} {record.notes.length === 1 ? 'note' : 'notes'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 p-3">No records for this date</p>
                )}
              </div>
              
              {/* Notes section */}
              {selectedRecord && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-800">Record Notes</h4>
                    <button
                      onClick={handleAddNote}
                      className="text-xs bg-teal-50 text-teal-600 px-2 py-1 rounded hover:bg-teal-100 transition"
                    >
                      Add Note
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedRecord.notes.length > 0 ? (
                      selectedRecord.notes.map((note, idx) => (
                        <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                          {note}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No notes for this record</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
              <p className="text-gray-500">Select a date to view or add records</p>
            </div>
          )}
          
          {/* Recent activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-800 flex items-center">
                <Activity className="w-5 h-5 text-teal-600 mr-2" />
                Recent Medical Records
              </h3>
            </div>
            
            <div className="p-2 divide-y divide-gray-100">
              {getRecentRecords().length > 0 ? (
                getRecentRecords().map(record => (
                  <div 
                    key={record.id} 
                    className="p-3 hover:bg-gray-50 cursor-pointer rounded-md transition"
                    onClick={() => {
                      setSelectedDate(new Date(record.date));
                      handleRecordClick(record);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-800">{record.description}</h4>
                      <span className="text-sm text-gray-500">{record.time}</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">
                        {record.recordType}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center">
                      <CalendarIcon className="w-3.5 h-3.5 text-teal-600 mr-1.5" />
                      <span className="text-xs text-gray-500">
                        {new Date(record.date).toLocaleDateString(undefined, { 
                          month: 'long', day: 'numeric', year: 'numeric' 
                        })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 p-3">No recent activity</p>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200">
              <button 
                onClick={() => setShowRecordModal(true)}
                className="w-full py-2 bg-teal-50 text-teal-600 rounded-md text-sm font-medium hover:bg-teal-100 transition"
              >
                Add New Record
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add Record Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Add New Record</h3>
              <button 
                onClick={() => setShowRecordModal(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Record Type
                </label>
                <select
                  value={newRecord.recordType}
                  onChange={e => setNewRecord({...newRecord, recordType: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Medical Record">Medical Record</option>
                  <option value="Lab Results">Lab Results</option>
                  <option value="Medical Image">Medical Image</option>
                  <option value="Vital Signs">Vital Signs</option>
                  <option value="Medication">Medication</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newRecord.description}
                  onChange={e => setNewRecord({...newRecord, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter a brief description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newRecord.date}
                  onChange={e => setNewRecord({...newRecord, date: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={newRecord.time}
                  onChange={e => setNewRecord({...newRecord, time: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              
              <div className="pt-2">
                <button
                  onClick={addNewRecord}
                  className="w-full bg-teal-600 text-white rounded-md py-2 hover:bg-teal-700 transition"
                >
                  Add Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Add Note</h3>
              <button 
                onClick={() => setShowNoteModal(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note for {selectedRecord?.recordType}: {selectedRecord?.description}
                </label>
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[120px]"
                  placeholder="Enter note content..."
                ></textarea>
              </div>
              
              <div className="pt-2">
                <button
                  onClick={saveNote}
                  className="w-full bg-teal-600 text-white rounded-md py-2 hover:bg-teal-700 transition flex items-center justify-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
