import { useState, useEffect } from 'react';

/**
 * Hook to manage user data with local storage persistence
 * @param {string} storageKey - The key to use for localStorage
 * @param {Object} defaultValue - Default value if no data exists in storage
 * @returns {Array} [userData, setUserData, resetUserData, isLoading]
 */
export const useUserData = (storageKey = 'userData', defaultValue = {}) => {
  const [userData, setUserData] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data from localStorage on mount
  useEffect(() => {
    const loadUserData = () => {
      try {
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
          setUserData(JSON.parse(storedData));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [storageKey]);

  // Update localStorage whenever userData changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(storageKey, JSON.stringify(userData));
    }
  }, [userData, storageKey, isLoading]);

  // Function to reset user data to default
  const resetUserData = () => {
    setUserData(defaultValue);
    localStorage.removeItem(storageKey);
  };

  return [userData, setUserData, resetUserData, isLoading];
};

/**
 * Save user data to localStorage
 * @param {string} key - Storage key
 * @param {Object} data - Data to save
 */
export const saveUserData = (key = 'userData', data = {}) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving user data:', error);
    return false;
  }
};

/**
 * Load user data from localStorage
 * @param {string} key - Storage key
 * @returns {Object|null} User data or null if not found
 */
export const loadUserData = (key = 'userData') => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading user data:', error);
    return null;
  }
};

/**
 * Update specific fields in user data
 * @param {string} key - Storage key
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated user data or null if operation failed
 */
export const updateUserData = (key = 'userData', updates = {}) => {
  try {
    const currentData = loadUserData(key) || {};
    const updatedData = { ...currentData, ...updates };
    saveUserData(key, updatedData);
    return updatedData;
  } catch (error) {
    console.error('Error updating user data:', error);
    return null;
  }
};

/**
 * Remove user data from localStorage
 * @param {string} key - Storage key
 */
export const removeUserData = (key = 'userData') => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing user data:', error);
    return false;
  }
};

/**
 * Check if user has completed onboarding
 * @returns {boolean} True if user has completed onboarding
 */
export const hasCompletedOnboarding = () => {
  const userData = loadUserData();
  return !!(userData && userData.name && userData.age && userData.sex);
};

export default {
  useUserData,
  saveUserData,
  loadUserData,
  updateUserData,
  removeUserData,
  hasCompletedOnboarding
};
