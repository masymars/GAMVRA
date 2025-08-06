import React from 'react';
import { Power, PowerOff, Loader, CheckCircle } from 'lucide-react';

const Gemma = ({ modelStatus, initMessage, isModelReady, isLoading, onInitialize }) => {
  const getStatusInfo = () => {
    if (isLoading) {
      return {
        icon: <Loader className="w-5 h-5 animate-spin" />,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        text: 'Loading...',
      };
    }
    if (isModelReady) {
      return {
        icon: <CheckCircle className="w-5 h-5" />,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        text: 'AI Core Ready',
      };
    }
    return {
      icon: <PowerOff className="w-5 h-5" />,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      text: 'AI Core Offline',
    };
  };

  const { icon, color, bgColor, text } = getStatusInfo();

  return (
    <div className={`p-4 rounded-lg border ${bgColor.replace('bg-', 'border-')} ${color}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${bgColor}`}>{icon}</div>
          <div>
            <h3 className="font-semibold">{text}</h3>
            <p className="text-sm opacity-80">{initMessage}</p>
          </div>
        </div>
        {!isModelReady && (
          <button
            onClick={onInitialize}
            disabled={isLoading || modelStatus?.exists === false}
            className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Power className="w-4 h-4" />
            <span>Initialize Core</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Gemma;