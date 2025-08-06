import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, FileText, Clock, ChevronRight, BrainCircuit, ClipboardCheck,
  BarChart3, Plus, Upload, Bell, User, Settings, Activity, TrendingUp, Shield,
  Pill, FileImage, MessageSquare, CheckCircle, AlertCircle, Loader2, Sparkles
} from 'lucide-react';

// Import custom hooks
import { usePrescriptionManagement } from '../api/prescriptionManagement';
import { useRecordManagement } from '../api/recordManagement';
import { useUserData } from '../api/userDataManagement';
import { useConversationHandler } from '../api/conversationHandler';
import { useGemma } from '../api/gemma';

const Home = () => {
  const navigate = useNavigate();
  const [activeQuickAction, setActiveQuickAction] = useState(null);
  const { generateStructuredResponse, isModelReady } = useGemma();

  const [healthScoreData, setHealthScoreData] = useState({
    status: 'idle', // idle, loading, success, error
    score: null,
    opinion: "Click 'Calculate' to generate your health score.",
    lastCalculated: null,
  });

  useEffect(() => {
    try {
      const savedScore = localStorage.getItem('healthScoreData');
      if (savedScore) {
        const parsedScore = JSON.parse(savedScore);
        setHealthScoreData({
          status: 'success',
          ...parsedScore,
        });
      }
    } catch (error) {
      console.error("Could not load saved health score:", error);
      localStorage.removeItem('healthScoreData');
    }
  }, []);

  const [userData, setUserData] = useUserData('userData', {
    name: "Guest User",
    age: "",
    sex: ""
  });

  const mockGenerateResponse = async () => ({});
  const mockIsLoading = false;

  const {
    prescriptions,
    loading: prescriptionsLoading,
    getPrescriptionsByTimeSlot,
    calculateAdherence
  } = usePrescriptionManagement(mockGenerateResponse, mockIsLoading);

  const {
    medicalRecords,
    loading: recordsLoading,
  } = useRecordManagement(mockGenerateResponse, mockIsLoading);

  const {
    conversations,
  } = useConversationHandler ? useConversationHandler() : { conversations: [], loading: false };

 // Located inside home.jsx

  const handleCalculateScore = useCallback(async () => {
    if (!isModelReady || prescriptionsLoading || recordsLoading) {
      alert("The system is not ready. Please wait a moment and try again.");
      return;
    }

    setHealthScoreData(prev => ({ ...prev, status: 'loading', opinion: 'Analyzing your recent health data...' }));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRecords = medicalRecords.filter(record =>
      new Date(record.fileDate || record.createdDate) > thirtyDaysAgo
    );
    const recentPrescriptions = prescriptions;

    if (recentRecords.length === 0 && recentPrescriptions.length === 0) {
      const noDataState = { /* ... */ };
      setHealthScoreData(noDataState);
      localStorage.setItem('healthScoreData', JSON.stringify(noDataState));
      return;
    }

    const healthDataPrompt = `
      Analyze the following user health data from the last 30 days and provide a health score.
      User Data:
      - Prescriptions: ${JSON.stringify(recentPrescriptions.map(p => ({ name: p.name, dosage: p.dosage })))}
      - Medical Records: ${JSON.stringify(recentRecords.map(r => ({ title: r.title, category: r.category })))}
      Instructions:
      1. Act as a health data analyst.
      2. Calculate a health score from 0 to 100 based on the volume and nature of the data.
      3. Provide a brief, one-sentence opinion explaining the score.
      4. Return ONLY a JSON object with this structure: { "score": <number>, "opinion": "<string>" }
    `;

    try {
      // **FIX: The 'response' variable will now be a correctly parsed object.**
      const response = await generateStructuredResponse({ text: healthDataPrompt });

      // **The .match() logic is removed.** We can now directly check the object.
      if (response && typeof response.score === 'number' && typeof response.opinion === 'string') {
        const newState = {
          status: 'success',
          score: response.score,
          opinion: response.opinion,
          lastCalculated: new Date().toISOString()
        };
        setHealthScoreData(newState);
        localStorage.setItem('healthScoreData', JSON.stringify(newState));
      } else {
        // This will now correctly catch if the validated object is not the health score format.
        throw new Error("Invalid response format from AI.");
      }
    } catch (error) {
      console.error("Failed to get health score from AI:", error);
      const errorState = {
        status: 'error',
        score: 'Error',
        opinion: "Could not process the health score due to an error.",
        lastCalculated: new Date().toISOString()
      };
      setHealthScoreData(errorState);
    }
  }, [isModelReady, medicalRecords, prescriptions, prescriptionsLoading, recordsLoading, generateStructuredResponse]);
  const stats = {
    prescriptionCount: prescriptions?.length || 0,
    recordCount: medicalRecords?.length || 0,
    conversationCount: conversations?.length || 0,
    adherenceRate: prescriptions?.length ?
      prescriptions.reduce((sum, p) => sum + (calculateAdherence(p.id)?.rate || 0), 0) / prescriptions.length :
      0,
  };

  const currentTimeSlot = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const upcomingMedications = getPrescriptionsByTimeSlot(currentTimeSlot());

  const quickActions = [
    {
      id: 1,
      title: "Take Medications",
      subtitle: `${upcomingMedications?.length || 0} due ${currentTimeSlot()}`,
      icon: Pill,
      color: "bg-gradient-to-br from-blue-500 to-blue-600",
      action: () => navigate('/prescriptions')
    },
    {
      id: 2,
      title: "Scan Document",
      subtitle: "Upload medical records",
      icon: FileImage,
      color: "bg-gradient-to-br from-emerald-500 to-emerald-600",
      action: () => navigate('/records/new')
    },
    {
      id: 3,
      title: "AI Consultation",
      subtitle: "Discuss health concerns",
      icon: MessageSquare,
      color: "bg-gradient-to-br from-purple-500 to-purple-600",
      action: () => navigate('/consultation')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-5">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userData.name}</h1>
                <p className="text-sm text-gray-500 mt-1">Here's your health overview for today</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-gradient-to-r from-teal-500 via-blue-500 to-indigo-600 rounded-2xl p-8 mb-10 text-white relative overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your Health Score</h2>
              <Shield className="w-16 h-16 text-white/20 hidden md:block" />
            </div>

            {healthScoreData.status === 'loading' && (
              <div className="mt-4 flex flex-col items-center justify-center h-24">
                <Loader2 className="w-12 h-12 animate-spin" />
                <p className="text-blue-100 mt-3">{healthScoreData.opinion}</p>
              </div>
            )}

            {(healthScoreData.status === 'idle' || healthScoreData.status === 'error') && (
              <div className="mt-4">
                <p className="text-blue-100 mb-5">{healthScoreData.opinion}</p>
                <button
                  onClick={handleCalculateScore}
                  disabled={!isModelReady}
                  className="bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-6 rounded-lg flex items-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  {healthScoreData.status === 'idle' ? 'Calculate My Score' : 'Try Again'}
                </button>
              </div>
            )}

            {healthScoreData.status === 'success' && (
              <div className="mt-4">
                <p className="text-blue-100 mb-5">{healthScoreData.opinion}</p>
                <div className="flex flex-col md:flex-row md:items-end justify-between">
                  <div className="flex items-center space-x-5">
                    <div className="text-5xl font-bold">
                      {healthScoreData.score}
                      {typeof healthScoreData.score === 'number' && '%'}
                    </div>
                    {typeof healthScoreData.score === 'number' && (
                      <div className="flex items-center text-green-200">
                        <TrendingUp className="w-5 h-5 mr-1" />
                        <span className="text-sm">+3% from last month</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleCalculateScore}
                    disabled={!isModelReady}
                    className="mt-4 md:mt-0 bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded-lg flex items-center text-sm transition-all disabled:opacity-50"
                  >
                    Recalculate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Pill className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{stats.prescriptionCount}</p>
                <p className="text-sm text-gray-500 mt-1">Medications</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Prescription Tracking</h3>
                <p className="text-sm text-gray-500">
                  {stats.adherenceRate.toFixed(0)}% adherence rate
                </p>
              </div>
              <button
                onClick={() => navigate('/prescriptions/new')}
                className="opacity-0 group-hover:opacity-100 bg-teal-600 hover:bg-teal-700 text-white p-2 rounded-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{stats.recordCount}</p>
                <p className="text-sm text-gray-500 mt-1">Records</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Medical Records</h3>
                <p className="text-sm text-gray-500">AI-analyzed documents</p>
              </div>
              <button
                onClick={() => navigate('/records/new')}
                className="opacity-0 group-hover:opacity-100 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-all duration-200"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{stats.conversationCount}</p>
                <p className="text-sm text-gray-500 mt-1">Consultations</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">AI Consultations</h3>
                <p className="text-sm text-gray-500">Health discussions</p>
              </div>
              <button
                onClick={() => navigate('/consultation/new')}
                className="opacity-0 group-hover:opacity-100 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-all duration-200"
              >
                <BrainCircuit className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Medications Due</h3>
                </div>
                <button
                  onClick={() => navigate('/prescriptions')}
                  className="text-teal-600 hover:text-teal-800 text-sm flex items-center font-medium"
                >
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>

              <div className="space-y-4">
                {upcomingMedications && upcomingMedications.length > 0 ? (
                  upcomingMedications.map(med => (
                    <div key={med.id} className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-4 border border-teal-100">
                      <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div className="mb-4 md:mb-0">
                          <h4 className="text-xl font-semibold text-gray-900 mb-2">{med.name}</h4>
                          <p className="text-gray-600 mb-2">{med.dosage}</p>
                          <p className="text-sm text-gray-500">{med.instructions}</p>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <div className="bg-white px-3 py-2 rounded-lg border border-gray-200 text-center">
                            <div className="text-sm font-medium text-gray-900">Due {currentTimeSlot()}</div>
                            <div className="text-lg font-bold text-teal-600">{med.recommendedFrequency}</div>
                          </div>
                          <button
                            onClick={() => navigate(`/prescriptions/${med.id}`)}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Mark as Taken
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-50 rounded-xl p-6 text-center">
                    <p className="text-gray-500">No medications due at this time.</p>
                    <button
                      onClick={() => navigate('/prescriptions/new')}
                      className="mt-3 inline-flex items-center text-teal-600 font-medium hover:text-teal-800"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Medication
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <ClipboardCheck className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Recent Medical Records</h3>
                </div>
                <button
                  onClick={() => navigate('/records')}
                  className="text-teal-600 hover:text-teal-800 text-sm flex items-center font-medium"
                >
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>

              <div className="space-y-4">
                {medicalRecords && medicalRecords.length > 0 ? (
                  medicalRecords.slice(0, 2).map(record => (
                    <div key={record.id} className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:bg-white transition-colors shadow-sm hover:shadow-md">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{record.title}</h4>
                            <p className="text-sm text-gray-500">{record.category}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {record.fileDate || record.createdDate}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 line-clamp-1">{record.notes}</span>
                        <button
                          onClick={() => navigate(`/records/${record.id}`)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-50 rounded-xl p-6 text-center">
                    <p className="text-gray-500">No medical records found.</p>
                    <button
                      onClick={() => navigate('/records/new')}
                      className="mt-3 inline-flex items-center text-blue-600 font-medium hover:text-blue-800"
                    >
                      <Upload className="w-4 h-4 mr-1" /> Upload Records
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/50">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Quick Actions</h3>
              <div className="space-y-4">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={action.action}
                    onMouseEnter={() => setActiveQuickAction(action.id)}
                    onMouseLeave={() => setActiveQuickAction(null)}
                    className={`w-full p-4 rounded-xl text-left transition-all duration-300 transform hover:scale-105 ${action.color} text-white relative overflow-hidden group shadow-md hover:shadow-lg`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <action.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{action.title}</h4>
                        <p className="text-sm text-white/80 mt-1">{action.subtitle}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/50">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Medication Adherence</h3>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-medium">Overall</span>
                  <span className="text-blue-700 font-semibold">{stats.adherenceRate.toFixed(0)}%</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${stats.adherenceRate}%` }}
                  ></div>
                </div>

                <div className="mt-4 space-y-3">
                  {prescriptions && prescriptions.slice(0, 3).map(prescription => {
                    const adherence = calculateAdherence(prescription.id);
                    return (
                      <div key={prescription.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          {adherence.rate >= 80 ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500 mr-2" />
                          )}
                          <span className="text-gray-700">{prescription.name}</span>
                        </div>
                        <span className="font-medium">{adherence.rate.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => navigate('/prescriptions')}
                  className="w-full mt-4 text-sm text-center text-blue-600 hover:text-blue-800 font-medium"
                >
                  View Detailed Report
                </button>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/50">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Today's Health Tip</h3>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 shadow-sm">
                <p className="text-sm text-gray-700 mb-3">
                  Regular medication adherence is crucial for managing chronic conditions effectively. Set reminders to take your medications at the same time each day.
                </p>
                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Learn more →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;