import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, Pill, Plus, Edit, Trash2, AlertCircle, CheckCircle, Calendar, Brain,
  Filter, ChevronDown, ChevronUp, Search, X, CheckSquare
} from 'lucide-react';
import { useGemma } from '../api/gemma';
import { usePrescriptionManagement } from '../api/prescriptionManagement';
import PrescriptionModal from '../components/PrescriptionModal';
import AnalysisModal from '../components/AnalysisModal';

const PrescriptionsManagement = ({ userData }) => {
  const { generateStructuredResponse, isLoading: isLoadingGemma, modelStatus } = useGemma();
  
  // Debug: Check if the Gemma API is available
  console.log('Gemma API available:', !!generateStructuredResponse);
  console.log('Gemma model status:', modelStatus);
  console.log('Gemma API function type:', typeof generateStructuredResponse);
  
  // Only pass generateStructuredResponse if the model is ready and it's a function
  const gemmaReady = modelStatus === 'ready' && typeof generateStructuredResponse === 'function';
  const effectiveGenerateStructuredResponse = gemmaReady ? generateStructuredResponse : null;
  
  const {
    prescriptions,
    loading,
    error,
    addPrescription,
    updatePrescription,
    deletePrescription,
    recordMedicationEvent,
    getPrescriptionsByTimeSlot,
    searchPrescriptions,
    scanPrescriptionImage,
    isAnalyzing,
    setIsAnalyzing
  } = usePrescriptionManagement(effectiveGenerateStructuredResponse, isLoadingGemma);
  
  // UI state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPrescriptions, setFilteredPrescriptions] = useState([]);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'time', 'nextDue'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [showFilters, setShowFilters] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'morning', 'afternoon', 'evening', 'night'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'upcoming', 'expired'
  const [collapsedSections, setCollapsedSections] = useState({
    active: false,
    today: false,
    overview: false
  });
  
  // Analysis state
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [rawAnalysisResult, setRawAnalysisResult] = useState(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  
  // New prescription form state
  const [newPrescription, setNewPrescription] = useState({
    id: '',
    name: '',
    dosage: '',
    frequency: 'daily',
    timeSlots: [],
    startDate: '',
    endDate: '',
    notes: '',
    color: '#4fd1c5'
  });
  
  // Time slots for medication (24-hour format)
  const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', 
    '20:00', '21:00', '22:00', '23:00', '00:00'
  ];

  // Group time slots into periods for filtering
  const timeSlotGroups = {
    morning: ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00'],
    afternoon: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
    evening: ['18:00', '19:00', '20:00', '21:00', '22:00'],
    night: ['23:00', '00:00']
  };
  
  // Apply filtering and sorting to prescriptions
  const processedPrescriptions = useMemo(() => {
    let result = [...prescriptions];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      result = searchPrescriptions(searchQuery);
    }
    
    // Apply time of day filter
    if (timeFilter !== 'all') {
      const relevantTimeSlots = timeSlotGroups[timeFilter] || [];
      result = result.filter(p => 
        p.timeSlots.some(ts => relevantTimeSlots.includes(ts))
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      if (statusFilter === 'active') {
        result = result.filter(p => {
          const startDate = p.startDate ? new Date(p.startDate) : null;
          const endDate = p.endDate ? new Date(p.endDate) : null;
          
          return (!startDate || startDate <= today) && 
                 (!endDate || endDate >= today);
        });
      } else if (statusFilter === 'upcoming') {
        result = result.filter(p => {
          const startDate = p.startDate ? new Date(p.startDate) : null;
          return startDate && startDate > today;
        });
      } else if (statusFilter === 'expired') {
        result = result.filter(p => {
          const endDate = p.endDate ? new Date(p.endDate) : null;
          return endDate && endDate < today;
        });
      }
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'time') {
        // Sort by earliest time slot
        const aEarliest = Math.min(...a.timeSlots.map(t => {
          const [hours] = t.split(':').map(Number);
          return hours;
        }));
        
        const bEarliest = Math.min(...b.timeSlots.map(t => {
          const [hours] = t.split(':').map(Number);
          return hours;
        }));
        
        comparison = aEarliest - bEarliest;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [prescriptions, searchQuery, timeFilter, statusFilter, sortBy, sortOrder, searchPrescriptions]);
  
  // Update filtered prescriptions when relevant state changes
  useEffect(() => {
    setFilteredPrescriptions(processedPrescriptions);
  }, [processedPrescriptions]);
  
  // Toggle section collapse
  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Handle adding a new prescription
  const handleAddPrescription = () => {
    if (!newPrescription.name || !newPrescription.dosage || newPrescription.timeSlots.length === 0) {
      alert('Please fill in all required fields and select at least one time slot.');
      return;
    }
    
    if (showEditModal && selectedPrescription) {
      updatePrescription(selectedPrescription.id, newPrescription);
    } else {
      addPrescription(newPrescription);
    }
    
    // Reset form and close modal
    setNewPrescription({
      id: '',
      name: '',
      dosage: '',
      frequency: 'daily',
      timeSlots: [],
      startDate: '',
      endDate: '',
      notes: '',
      color: '#4fd1c5'
    });
    setShowAddModal(false);
    setShowEditModal(false);
  };
  
  // Handle editing a prescription
  const handleEditPrescription = (prescription) => {
    setNewPrescription(prescription);
    setSelectedPrescription(prescription);
    setShowEditModal(true);
  };
  
  // Handle deleting a prescription
  const handleDeletePrescription = (id) => {
    if (window.confirm('Are you sure you want to delete this prescription?')) {
      deletePrescription(id);
    }
  };
  
  // Handle marking a prescription as taken or skipped
  const handleRecordMedicationEvent = (id, eventType) => {
    recordMedicationEvent(id, { type: eventType });
  };
  
  // Get prescriptions for a specific time slot
  const getPrescriptionsForTimeSlot = (time) => {
    return prescriptions.filter(p => p.timeSlots.includes(time));
  };
  
  // Check if a prescription is due today based on frequency and dates
  const isPrescriptionDueToday = (prescription) => {
    const today = new Date();
    const startDate = prescription.startDate ? new Date(prescription.startDate) : null;
    const endDate = prescription.endDate ? new Date(prescription.endDate) : null;
    
    // Check if today is within the date range
    if (startDate && today < startDate) return false;
    if (endDate && today > endDate) return false;
    
    return true;
  };

  // Function to analyze prescriptions with Gemma
  const analyzeWithGemma = async () => {
    if (!gemmaReady) {
      alert('Gemma AI is not ready yet. Please wait.');
      return;
    }

    if (prescriptions.length === 0) {
      alert('No prescriptions to analyze. Please add prescriptions first.');
      return;
    }

    setAnalysisLoading(true);
    setAnalysisResult(null);
    setRawAnalysisResult(null);
    setShowAnalysisModal(true);

    try {
      // Format prescription data for analysis
      const prescriptionData = prescriptions.map(p => ({
        name: p.name,
        dosage: p.dosage,
        frequency: p.frequency,
        timeSlots: p.timeSlots,
        startDate: p.startDate,
        endDate: p.endDate,
        notes: p.notes
      }));

      // Create structured prompt for Gemma
      const analysisPrompt = {
        text: `Analyze the following schedule including prescription drugs, OTC meds, supplements, and herbs.

Return a JSON with:
{
  "title": "Schedule Analysis",
  "category": "Health Intake",
  "issues": [
    {
      "type": "interaction | duplication | timing | other",
      "items": ["Item A", "Item B"],
      "severity": "high | medium | low",
      "description": "Short clinical explanation"
    }
  ],
  "recommendations": [
    {
      "type": "timing | dosage | alternative | monitoring",
      "items": ["Item Name"],
      "recommendation": "Brief recommendation"
    }
  ],
  "overallAssessment": "Summary of safety and effectiveness"
}

Check for:
- Interactions (drug-drug, drug-supplement, drug-herb)
- Timing issues (with/without food, absorption conflicts)
- Duplications (e.g. too much magnesium)
- Red flags (polypharmacy, risk stacking)

Here's the schedule:
${JSON.stringify(prescriptionData, null, 2)}
`,
        files: []
      };

      try {
        // Create FormData for the API request
        const formData = new FormData();
        formData.append('text', analysisPrompt.text);
        
        // Make the API request directly
        const response = await fetch('http://localhost:3010/generate', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        // Process the streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              
              if (parsed.type === 'chunk') {
                fullResponse += parsed.data;
              } else if (parsed.type === 'complete' && parsed.fullResponse) {
                fullResponse = parsed.fullResponse;
              }
            } catch (e) {
              // Not JSON, treat as plain text
              if (!line.includes('{"type":')) {
                fullResponse += line;
              }
            }
          }
        }
        
        console.log('Raw response:', fullResponse);
        
        // Extract JSON from the response
        let cleanedResponse = fullResponse.trim();
        cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        
        try {
          // Parse the JSON response
          const jsonResponse = JSON.parse(cleanedResponse);
          console.log('Parsed JSON response:', jsonResponse);
          
          // Store both the raw and processed response
          setRawAnalysisResult(jsonResponse);
          setAnalysisResult(jsonResponse);
          setShowAnalysisModal(true);
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
          throw new Error('Failed to parse analysis results');
        }
      } catch (apiError) {
        console.error('API request error:', apiError);
        throw apiError;
      }
    } catch (error) {
      console.error('Error analyzing prescriptions:', error);
      alert('Error analyzing prescriptions. Please try again.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Close any modal and reset form
  const handleCloseModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setNewPrescription({
      id: '',
      name: '',
      dosage: '',
      frequency: 'daily',
      timeSlots: [],
      startDate: '',
      endDate: '',
      notes: '',
      color: '#4fd1c5'
    });
  };

  // Close analysis modal
  const handleCloseAnalysisModal = () => {
    setShowAnalysisModal(false);
    setAnalysisResult(null);
    setRawAnalysisResult(null);
  };
  
  // Reset all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSortBy('name');
    setSortOrder('asc');
    setTimeFilter('all');
    setStatusFilter('all');
  };
  
  // Display loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mb-2"></div>
          <p>Loading prescriptions...</p>
        </div>
      </div>
    );
  }
  
  // Display error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-500">
          <AlertCircle className="mx-auto h-12 w-12 mb-2" />
          <p>{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  // Get active time slots (those with at least one prescription)
  const activeTimeSlots = timeSlots.filter(time => {
    const prescriptionsForSlot = getPrescriptionsForTimeSlot(time)
      .filter(isPrescriptionDueToday);
    return prescriptionsForSlot.length > 0;
  });
  
  // Calculate prescription count by time period for dashboard metrics
  const prescriptionsByPeriod = {
    morning: prescriptions.filter(p => p.timeSlots.some(ts => timeSlotGroups.morning.includes(ts))).length,
    afternoon: prescriptions.filter(p => p.timeSlots.some(ts => timeSlotGroups.afternoon.includes(ts))).length,
    evening: prescriptions.filter(p => p.timeSlots.some(ts => timeSlotGroups.evening.includes(ts))).length,
    night: prescriptions.filter(p => p.timeSlots.some(ts => timeSlotGroups.night.includes(ts))).length
  };
  
  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header and Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Prescriptions Management</h1>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={analyzeWithGemma}
            disabled={analysisLoading || !gemmaReady || prescriptions.length === 0}
            className={`px-3 py-1.5 bg-purple-700 text-white font-medium rounded-md hover:bg-purple-800 transition flex items-center ${(analysisLoading || !gemmaReady || prescriptions.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {analysisLoading ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-1.5" />
                Analyze
              </>
            )}
          </button>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-teal-700 text-white font-medium rounded-md hover:bg-teal-800 transition flex items-center"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Prescription
          </button>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 border rounded-md transition flex items-center text-gray-700 font-medium ${showFilters ? 'bg-gray-100 border-gray-400' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filters
            {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </button>
        </div>
      </div>
      
      {/* Dashboard Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="text-xs font-medium text-gray-600">Total Prescriptions</div>
          <div className="text-xl font-bold mt-1 text-gray-800">{prescriptions.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="text-xs font-medium text-gray-600">Today's Doses</div>
          <div className="text-xl font-bold mt-1 text-gray-800">{activeTimeSlots.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="text-xs font-medium text-gray-600">Next Dose</div>
          <div className="text-xl font-bold mt-1 text-gray-800">
            {activeTimeSlots.length > 0 ? activeTimeSlots[0] : 'None today'}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="text-xs font-medium text-gray-600">Status</div>
          <div className="text-xl font-bold mt-1 flex items-center text-gray-800">
            <span className={`w-2 h-2 rounded-full mr-2 ${activeTimeSlots.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            {activeTimeSlots.length > 0 ? 'Active' : 'No doses'}
          </div>
        </div>
      </div>
      
      {/* Search and Filter Bar */}
      <div className={`transition-all duration-300 overflow-hidden ${showFilters ? 'max-h-[500px] mb-4' : 'max-h-0'}`}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            {/* Search */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-800 mb-1">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search prescriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-700"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  <Search className="h-4 w-4" />
                </div>
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Time Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Time of Day</label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-700"
              >
                <option value="all">All Times</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
              </select>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-700"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            
            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Sort By</label>
              <div className="flex items-center">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-700"
                >
                  <option value="name">Name</option>
                  <option value="time">Time</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="border border-gray-300 border-l-0 rounded-r-lg px-2 py-2 hover:bg-gray-50 text-gray-700"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
            
            {/* Clear Filters */}
            <div>
              <button
                onClick={clearFilters}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-700 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
          
          {/* Filter summary */}
          {(searchQuery || timeFilter !== 'all' || statusFilter !== 'all') && (
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="text-gray-500">Filters:</span>
              {searchQuery && (
                <span className="bg-gray-100 px-2 py-0.5 rounded-full flex items-center">
                  Search: "{searchQuery.slice(0, 15)}{searchQuery.length > 15 ? '...' : ''}"
                  <button onClick={() => setSearchQuery('')} className="ml-1 text-gray-500 hover:text-gray-700">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {timeFilter !== 'all' && (
                <span className="bg-gray-100 px-2 py-0.5 rounded-full flex items-center">
                  Time: {timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)}
                  <button onClick={() => setTimeFilter('all')} className="ml-1 text-gray-500 hover:text-gray-700">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="bg-gray-100 px-2 py-0.5 rounded-full flex items-center">
                  Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                  <button onClick={() => setStatusFilter('all')} className="ml-1 text-gray-500 hover:text-gray-700">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Active Prescriptions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-800 flex items-center">
                <Pill className="w-5 h-5 text-teal-600 mr-2" />
                Active Prescriptions
                <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-800 text-xs rounded-full">
                  {filteredPrescriptions.length}
                </span>
              </h2>
              <button
                onClick={() => toggleSection('active')}
                className="p-1.5 hover:bg-gray-100 rounded-md"
              >
                {collapsedSections.active ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </button>
            </div>
            
            {!collapsedSections.active && (
              <>
                {filteredPrescriptions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredPrescriptions.map(prescription => (
                      <div 
                        key={prescription.id} 
                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-800 flex items-center truncate">
                              <span 
                                className="flex-shrink-0 w-3 h-3 rounded-full mr-2" 
                                style={{ backgroundColor: prescription.color }}
                              ></span>
                              <span className="truncate">{prescription.name}</span>
                            </h3>
                            <p className="text-sm text-gray-600 mt-1 truncate">{prescription.dosage}</p>
                            
                            {prescription.startDate && (
                              <div className="flex items-center mt-2 text-xs text-gray-500">
                                <Calendar className="flex-shrink-0 w-3.5 h-3.5 mr-1" />
                                <span className="truncate">
                                  {prescription.startDate} 
                                  {prescription.endDate ? ` to ${prescription.endDate}` : ' onwards'}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-1 mt-2 max-h-[40px] overflow-y-auto scrollbar-thin">
                              {prescription.timeSlots.map(time => (
                                <span 
                                  key={time} 
                                  className="px-2 py-0.5 bg-teal-100 text-teal-800 text-xs rounded-full whitespace-nowrap"
                                >
                                  {time}
                                </span>
                              ))}
                            </div>
                            
                            {prescription.notes && (
                              <div className="mt-2 text-sm text-gray-500 italic line-clamp-2 hover:line-clamp-none transition-all duration-200">
                                {prescription.notes}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex space-x-1 ml-2">
                            <button 
                              onClick={() => handleRecordMedicationEvent(prescription.id, 'taken')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                              aria-label="Mark as taken"
                              title="Mark as taken"
                            >
                              <CheckSquare className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleEditPrescription(prescription)}
                              className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-gray-100 rounded transition"
                              aria-label="Edit"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeletePrescription(prescription.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded transition"
                              aria-label="Delete"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    {searchQuery || timeFilter !== 'all' || statusFilter !== 'all' ? (
                      <>
                        <p className="text-gray-500 mb-2">No prescriptions found with current filters</p>
                        <button 
                          onClick={clearFilters} 
                          className="text-teal-600 hover:underline"
                        >
                          Clear filters
                        </button>
                      </>
                    ) : (
                      <p className="text-gray-500">No prescriptions added yet. Click "Add Prescription" to get started.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Daily Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 lg:mb-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-800 flex items-center">
                <Calendar className="w-5 h-5 text-teal-600 mr-2" />
                Daily Schedule Overview
              </h2>
              <button
                onClick={() => toggleSection('overview')}
                className="p-1.5 hover:bg-gray-100 rounded-md"
              >
                {collapsedSections.overview ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </button>
            </div>
            
            {!collapsedSections.overview && (
              <div>
                <div className="overflow-x-auto pb-2">
                  <div className="grid grid-cols-6 gap-2 min-w-[600px]">
                    {timeSlots.map(time => {
                      const prescriptionsForSlot = getPrescriptionsForTimeSlot(time);
                      const hasActivePrescriptions = prescriptionsForSlot.some(isPrescriptionDueToday);
                      const count = prescriptionsForSlot.filter(isPrescriptionDueToday).length;
                      
                      return (
                        <div 
                          key={time} 
                          className={`p-2 border rounded-lg ${hasActivePrescriptions ? 'border-teal-300 bg-teal-50' : 'border-gray-200'}`}
                        >
                          <div className="text-center mb-1">
                            <span className="font-medium text-sm text-gray-800">{time}</span>
                            {count > 0 && (
                              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-xs bg-teal-500 text-white rounded-full">
                                {count}
                              </span>
                            )}
                          </div>
                          
                          {prescriptionsForSlot.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-1">
                              {prescriptionsForSlot.map(prescription => {
                                const isActive = isPrescriptionDueToday(prescription);
                                return (
                                  <div
                                    key={`${time}-${prescription.id}`}
                                    className={`relative group`}
                                  >
                                    <span 
                                      className={`block w-3 h-3 rounded-full ${!isActive ? 'opacity-40' : ''}`}
                                      style={{ backgroundColor: prescription.color }}
                                    ></span>
                                    
                                    {/* Tooltip */}
                                    <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-48 p-2 bg-gray-800 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition">
                                      <p className="font-medium">{prescription.name}</p>
                                      <p>{prescription.dosage}</p>
                                      {!isActive && <p className="text-yellow-300">Inactive for today</p>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="h-3"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Legend */}
                <div className="mt-4 border-t border-gray-200 pt-3">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Legend</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {prescriptions.slice(0, 12).map(prescription => (
                      <div key={prescription.id} className="flex items-center">
                        <span 
                          className="block w-3 h-3 rounded-full mr-1.5" 
                          style={{ backgroundColor: prescription.color }}
                        ></span>
                        <span className="text-xs text-gray-700 truncate max-w-[100px]">{prescription.name}</span>
                      </div>
                    ))}
                    {prescriptions.length > 12 && (
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500">+{prescriptions.length - 12} more</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Column 2: Today's Schedule */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-800 flex items-center">
                <Clock className="w-5 h-5 text-teal-600 mr-2" />
                Today's Schedule
                <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-800 text-xs rounded-full">
                  {activeTimeSlots.length}
                </span>
              </h2>
              <button
                onClick={() => toggleSection('today')}
                className="p-1.5 hover:bg-gray-100 rounded-md"
              >
                {collapsedSections.today ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </button>
            </div>
            
            {!collapsedSections.today && (
              <>
                {/* Time Distribution */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Morning</span>
                    <span>Afternoon</span>
                    <span>Evening</span>
                    <span>Night</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full flex overflow-hidden">
                    <div className="bg-yellow-400 h-full" style={{ width: `${(prescriptionsByPeriod.morning / (prescriptions.length || 1)) * 100}%` }}></div>
                    <div className="bg-blue-400 h-full" style={{ width: `${(prescriptionsByPeriod.afternoon / (prescriptions.length || 1)) * 100}%` }}></div>
                    <div className="bg-purple-400 h-full" style={{ width: `${(prescriptionsByPeriod.evening / (prescriptions.length || 1)) * 100}%` }}></div>
                    <div className="bg-indigo-400 h-full" style={{ width: `${(prescriptionsByPeriod.night / (prescriptions.length || 1)) * 100}%` }}></div>
                  </div>
                </div>
                
                {activeTimeSlots.length > 0 ? (
                  <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1 scrollbar-thin">
                    {activeTimeSlots.map(time => {
                      const prescriptionsForSlot = getPrescriptionsForTimeSlot(time)
                        .filter(isPrescriptionDueToday);
                      
                      const isCurrentTimeSlot = () => {
                        const now = new Date();
                        const [hours, minutes] = time.split(':').map(Number);
                        const slotTime = new Date();
                        slotTime.setHours(hours, minutes, 0, 0);
                        
                        // Consider the time slot "current" if within 30 minutes before or after
                        const timeDiffMs = Math.abs(now.getTime() - slotTime.getTime());
                        const timeDiffMinutes = timeDiffMs / (1000 * 60);
                        
                        return timeDiffMinutes <= 30;
                      };
                      
                      return (
                        <div 
                          key={time} 
                          className={`p-3 border rounded-lg ${isCurrentTimeSlot() ? 'bg-teal-50 border-teal-300' : 'border-gray-100 bg-gray-50'}`}
                        >
                          <div className="flex items-center mb-2">
                            <Clock className="w-4 h-4 text-teal-600 mr-2" />
                            <span className="font-medium text-gray-800">{time}</span>
                            {isCurrentTimeSlot() && (
                              <span className="ml-2 px-2 py-0.5 bg-teal-700 text-white text-xs font-medium rounded-full animate-pulse">
                                Now
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            {prescriptionsForSlot.map(prescription => (
                              <div 
                                key={`${time}-${prescription.id}`} 
                                className="flex items-center justify-between p-2 bg-white rounded-md border border-gray-200"
                              >
                                <div className="flex items-center flex-1 min-w-0">
                                  <span 
                                    className="flex-shrink-0 w-3 h-3 rounded-full mr-2" 
                                    style={{ backgroundColor: prescription.color }}
                                  ></span>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-gray-700 block truncate">
                                      {prescription.name}
                                    </span>
                                    <span className="text-xs text-gray-500 block truncate">
                                      {prescription.dosage}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex gap-1 ml-2">
                                  <button
                                    onClick={() => handleRecordMedicationEvent(prescription.id, 'taken')}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    title="Mark as taken"
                                  >
                                    <CheckCircle className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleRecordMedicationEvent(prescription.id, 'skipped')}
                                    className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                                    title="Mark as skipped"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500">No medications scheduled for today.</p>
                  </div>
                )}
                
                {/* Time Period Explanations */}
                <div className="mt-4 border-t border-gray-200 pt-3">
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="p-1.5 bg-gray-50 rounded-md">
                      <span className="font-medium">Morning:</span> 6:00 - 11:59
                    </div>
                    <div className="p-1.5 bg-gray-50 rounded-md">
                      <span className="font-medium">Afternoon:</span> 12:00 - 17:59
                    </div>
                    <div className="p-1.5 bg-gray-50 rounded-md">
                      <span className="font-medium">Evening:</span> 18:00 - 22:59
                    </div>
                    <div className="p-1.5 bg-gray-50 rounded-md">
                      <span className="font-medium">Night:</span> 23:00 - 5:59
                    </div>
                  </div>
                  
                  {/* Current time */}
                  <div className="mt-3 text-center text-xs text-gray-500">
                    Current Date & Time: {new Date().toLocaleString()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Add/Edit Prescription Modal */}
      <PrescriptionModal
        isOpen={showAddModal || showEditModal}
        onClose={handleCloseModal}
        prescription={newPrescription}
        setPrescription={setNewPrescription}
        onSave={handleAddPrescription}
        isEdit={showEditModal}
        scanPrescriptionImage={scanPrescriptionImage}
        isAnalyzing={isAnalyzing}
        setIsAnalyzing={setIsAnalyzing}
      />

      {/* Analysis Results Modal */}
      <AnalysisModal
        isOpen={showAnalysisModal}
        onClose={handleCloseAnalysisModal}
        analysisResult={rawAnalysisResult}
        isLoading={analysisLoading}
      />
    </div>
  );
};

export default PrescriptionsManagement;