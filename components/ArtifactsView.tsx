import React from 'react';
import { INITIAL_ARTIFACT } from '../constants';

const ArtifactsView: React.FC = () => {
  return (
    <div className="h-full w-full p-8 bg-[#080808] overflow-auto">
            <div className="max-w-3xl mx-auto border border-[#333] p-8 bg-[#0a0a0a] shadow-lg shadow-black">
                <h1 className="text-2xl font-bold text-[#FF3B00] mb-4 border-b border-[#333] pb-2">PLAN_EXECUTION_LOG.MD</h1>
                <div className="prose prose-invert prose-orange font-mono text-sm">
                    <p><strong>MISSION:</strong> INITIALIZE MERCURY INTERFACE</p>
                    <p><strong>STATUS:</strong> COMPLETED</p>
                    <br/>
                    <h3 className="text-white uppercase">1. Core Systems</h3>
                    <ul className="list-disc list-inside text-gray-400">
                        <li>[x] React 18 Engine Mount</li>
                        <li>[x] Tailwind Style Injection</li>
                        <li>[x] Gemini 3.0 Pro Uplink</li>
                    </ul>
                    <br/>
                    <h3 className="text-white uppercase">2. Architecture</h3>
                    <p className="text-gray-400">
                        The system utilizes a split-pane layout to maximize data density. 
                        Communication logs are strictly formatted for rapid parsing. 
                        The workspace allows multitasking via context switching.
                    </p>
                    <br/>
                    <h3 className="text-white uppercase">3. Next Steps</h3>
                    <p className="text-gray-400">
                        Awaiting user input to begin generative coding tasks. 
                        Search grounding is active for real-time data acquisition.
                    </p>
                </div>
            </div>
        </div>
  );
};

export default ArtifactsView;