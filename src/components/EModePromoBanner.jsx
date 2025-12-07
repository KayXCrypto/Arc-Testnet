import React from 'react';

const EModePromoBanner = () => {
  return (
    <div className="bg-gradient-to-r from-blue-900 to-blue-800 border border-blue-700 rounded-xl p-6 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="text-4xl">📦</div>
        <div>
          <h3 className="text-lg font-semibold mb-1">The Economic OS for the internet</h3>
          <p className="text-blue-300 text-sm">
            Arc is an open L1 blockchain purpose-built to unite programmable money and onchain innovation with real-world economic activity.{' '}
            <a
              href="https://www.arc.network/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline cursor-pointer"
            >
              Learn more
            </a>
          </p>
        </div>
      </div>
      <button
        className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
        onClick={() => window.open("https://www.arc.network/ecosystem", "_blank")}
      >
        Explore
      </button>

    </div>
  );
};

export default EModePromoBanner;