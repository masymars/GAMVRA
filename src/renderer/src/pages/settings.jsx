import React, { useState, useEffect } from 'react';
import { loadUserData, useUserData } from '../api/userDataManagement';
import { User, Save, Settings, Trash2, AlertTriangle } from 'lucide-react';

const SettingsPage = ({ userData: propUserData }) => {
  // Use the custom hook to manage user data
  const [userData, setUserData] = useUserData('userData', null);
     
  // Local state for the form
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    sex: '',
    medicalHistory: ''
  });
     
  // Success message state
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
     
  // Initialize form with current user data
  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        age: userData.age || '',
        sex: userData.sex || '',
        medicalHistory: userData.medicalHistory || ''
      });
    }
  }, [userData]);
     
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
     
  const handleSubmit = (e) => {
    e.preventDefault();
         
    // Update user data
    setUserData(formData);
         
    // Show success message
    setShowSuccess(true);
         
    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };
  
  const handleDeleteUserData = () => {
    // Close the confirmation dialog
    setShowDeleteConfirm(false);
    
    // Clear userData from localStorage
    localStorage.removeItem('userData');
    
    // Reset the form
    setFormData({
      name: '',
      age: '',
      sex: '',
      medicalHistory: ''
    });
    
    // Reset user data in the hook
    setUserData(null);
    
    // Show reset success message
    setShowResetSuccess(true);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowResetSuccess(false);
    }, 3000);
  };
     
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 rounded-md bg-teal-100 flex items-center justify-center text-teal-800">
              <Settings className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <div className="text-lg font-medium text-gray-900">User Profile</div>
              <div className="text-sm text-gray-500">Manage your personal information</div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="mb-6">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="block w-full p-3 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter your name"
                required
              />
            </div>
                     
            <div className="mb-6">
              <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                Age
              </label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="block w-full p-3 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter your age"
                min="1"
                max="120"
                required
              />
            </div>
                     
            <div className="mb-6">
              <label htmlFor="sex" className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                id="sex"
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                className="block w-full p-3 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-teal-500 focus:border-teal-500"
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-4 mt-8">Medical Information</h3>
            <div className="mb-6">
              <label htmlFor="medicalHistory" className="block text-sm font-medium text-gray-700 mb-2">
                Medical History <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <textarea
                id="medicalHistory"
                name="medicalHistory"
                value={formData.medicalHistory}
                onChange={handleChange}
                className="block w-full p-3 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter any relevant medical conditions, allergies, or medications..."
                rows="4"
              />
              <p className="mt-1 text-xs text-gray-500">
                This information will be used to provide better health insights and can be included in your AI interactions.
              </p>
            </div>
                     
            <button
              type="submit"
              className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
            >
              <Save className="w-5 h-5 mr-2" />
              <span>Save Changes</span>
            </button>
          </form>
          
          <div className="mt-10 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Data Management</h3>
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition w-fit"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                <span>Delete My Data</span>
              </button>
              <p className="mt-2 text-xs text-gray-500">
                This will permanently delete all your personal information including medical history from this application.
              </p>
            </div>
          </div>
                 
          {showSuccess && (
            <div className="mt-6 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">Profile updated successfully!</p>
                  {formData.medicalHistory && (
                    <p className="text-xs text-green-600">Your medical history has been saved and can be used in AI interactions.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {showResetSuccess && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">Your data has been successfully deleted!</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mr-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Delete Personal Data</h3>
            </div>
            
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete all your personal data? This action cannot be undone and will remove:
            </p>
            
            <ul className="list-disc list-inside mb-6 text-gray-600 text-sm">
              <li>Your profile information (name, age, gender)</li>
              <li>Your medical history</li>
              <li>Your user preferences</li>
            </ul>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUserData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete My Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
