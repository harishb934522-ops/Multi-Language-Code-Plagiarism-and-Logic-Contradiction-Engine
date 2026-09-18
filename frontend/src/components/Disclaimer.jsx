import { useState } from 'react';
import { Info } from 'lucide-react';

export default function Disclaimer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block ml-3">
      <button 
        type="button"
        className="text-gray-400 hover:text-indigo-500 focus:outline-none transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        aria-label="About this analysis"
      >
        <Info className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-1/2 transform -translate-x-1/2 mt-2 w-80 bg-gray-900 text-white text-sm rounded-lg shadow-xl p-4 transition-opacity duration-200">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -mt-2 border-8 border-transparent border-b-gray-900"></div>
          <p className="font-semibold mb-1">About this analysis</p>
          <p className="text-gray-300 leading-relaxed">
            This tool checks structural code similarity and simple logic contradictions. It does not detect all forms of plagiarism or all logical errors — findings above should inform, not replace, human judgement. The known-algorithm library recognizes about 10 common patterns; contradiction detection currently covers simple comparison-based conditions and is only implemented for Python submissions.
          </p>
        </div>
      )}
    </div>
  );
}
