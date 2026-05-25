import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Home } from 'lucide-react';
import { Button } from '../shared/ui/button/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center select-none animate-fade-in flex-1">
      
      <div className="mx-auto h-16 w-16 rounded-xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-6 shadow-lg shadow-rose-500/5">
        <HelpCircle className="w-8 h-8" />
      </div>

      <h1 className="text-4xl font-extrabold text-gray-100 tracking-tight font-mono">
        404
      </h1>
      
      <h2 className="text-xl font-bold text-gray-300 mt-2 tracking-wide">
        Page Not Found
      </h2>
      
      <p className="text-sm text-gray-500 mt-2 max-w-sm leading-relaxed">
        The route you are requesting does not exist in our route catalog. Please check the URL syntax or return to the main workspace.
      </p>

      <div className="mt-8 flex gap-3">
        <Link to="/problems">
          <Button variant="primary">
            <Home className="w-4 h-4 mr-2" />
            Back to Problems
          </Button>
        </Link>
      </div>

    </div>
  );
};
