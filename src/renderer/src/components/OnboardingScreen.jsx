import React, { useState, useEffect } from 'react';
import { HeartPulse, ChevronRight, CheckCircle } from 'lucide-react';
import { saveUserData, loadUserData } from '../api/userDataManagement';

const OnboardingScreen = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    sex: ''
  });
  const [errors, setErrors] = useState({});
  
  // Load any existing data when component mounts
  useEffect(() => {
    const existingData = loadUserData();
    if (existingData) {
      setFormData(prev => ({
        ...prev,
        ...existingData
      }));
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value
    };
    
    setFormData(newFormData);
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
    
    // Save the form data as it changes
    saveUserData('userData', newFormData);
  };

  const validateStep = () => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          newErrors.name = 'Please enter your name';
        }
        break;
      case 2:
        if (!formData.age) {
          newErrors.age = 'Please enter your age';
        } else if (isNaN(formData.age) || parseInt(formData.age) < 1 || parseInt(formData.age) > 120) {
          newErrors.age = 'Please enter a valid age (1-120)';
        }
        break;
      case 3:
        if (!formData.sex) {
          newErrors.sex = 'Please select an option';
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep()) {
      // Save current data after each step validation
      saveUserData('userData', formData);
      
      if (step < 3) {
        setStep(step + 1);
      } else {
        // Save final data and complete onboarding
        saveUserData('userData', formData);
        onComplete(formData);
      }
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Welcome to GAMVA</h2>
            <p className="text-gray-600">Let's start with your name</p>
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                className={`w-full px-4 py-3 rounded-lg border ${errors.name ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800`}
                style={{ borderColor: errors.name ? 'var(--color-accent-600)' : '', outlineColor: 'var(--color-primary-500)' }}
                autoFocus
              />
              {errors.name && <p className="text-sm" style={{ color: 'var(--color-accent-600)' }}>{errors.name}</p>}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Hi, {formData.name}</h2>
            <p className="text-gray-600">What's your age?</p>
            <div className="space-y-2">
              <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                Your Age
              </label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                placeholder="Enter your age"
                min="1"
                max="120"
                className={`w-full px-4 py-3 rounded-lg border ${errors.age ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800`}
                style={{ borderColor: errors.age ? 'var(--color-accent-600)' : '', outlineColor: 'var(--color-primary-500)' }}
                autoFocus
              />
              {errors.age && <p className="text-sm" style={{ color: 'var(--color-accent-600)' }}>{errors.age}</p>}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">One Last Question</h2>
            <p className="text-gray-600">Please select your sex (for medical purposes)</p>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Sex</label>
              <div className="space-y-2">
                {['Male', 'Female'].map((option) => (
                  <div
                    key={option}
                    onClick={() => handleInputChange({ target: { name: 'sex', value: option } })}
                    className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
                      formData.sex === option ? 'border-2' : 'border'
                    }`}
                    style={{ 
                      borderColor: formData.sex === option ? 'var(--color-primary-600)' : 'var(--color-background-300)',
                      backgroundColor: formData.sex === option ? 'var(--color-primary-50, #f0fdfa)' : ''
                    }}
                  >
                    <div 
                      className="w-5 h-5 rounded-full border mr-3 flex items-center justify-center"
                      style={{ 
                        borderColor: formData.sex === option ? 'var(--color-primary-600)' : 'var(--color-background-500)'
                      }}
                    >
                      {formData.sex === option && (
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-primary-600)' }}></div>
                      )}
                    </div>
                    <span className="text-gray-800">{option}</span>
                  </div>
                ))}
              </div>
              {errors.sex && <p className="text-sm" style={{ color: 'var(--color-accent-600)' }}>{errors.sex}</p>}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      {/* Header with progress */}
      <header className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <HeartPulse className="w-8 h-8 mr-3" style={{ color: 'var(--color-primary-600)' }} />
          <h1 className="text-xl font-bold">GAMVA Setup</h1>
        </div>
        <div className="flex items-center mt-4 w-full max-w-md mx-auto">
          {[1, 2, 3].map((stepNumber) => (
            <React.Fragment key={stepNumber}>
              <div 
                className={`rounded-full flex items-center justify-center w-10 h-10 text-sm font-semibold transition-all ${
                  step >= stepNumber ? 'text-white' : 'text-gray-600 bg-gray-100 border border-gray-300'
                }`}
                style={{ 
                  backgroundColor: step >= stepNumber ? 'var(--color-primary-600)' : '', 
                }}
              >
                {step > stepNumber ? <CheckCircle className="w-5 h-5" /> : stepNumber}
              </div>
              {stepNumber < 3 && (
                <div 
                  className={`h-1 flex-1 mx-2 transition-all ${step > stepNumber ? '' : 'bg-gray-200'}`}
                  style={{ backgroundColor: step > stepNumber ? 'var(--color-primary-600)' : '' }}
                ></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {renderStep()}

          <div className="mt-10">
            <button
              onClick={handleNextStep}
              className="w-full flex items-center justify-center px-6 py-3 rounded-lg text-white text-lg font-medium transition-all"
              style={{ 
                backgroundColor: 'var(--color-primary-600)',
                color: '#ffffff', /* Ensuring text is white */
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                ':hover': {
                  backgroundColor: 'var(--color-primary-700)'
                }
              }}
            >
              {step === 3 ? (
                'Complete Setup'
              ) : (
                <>
                  Continue <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;
