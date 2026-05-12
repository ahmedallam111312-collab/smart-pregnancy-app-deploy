import React from 'react';

interface BodyMapProps {
    selectedZone: string | null;
    onZoneSelect: (zone: string) => void;
}

const BodyMap: React.FC<BodyMapProps> = ({ selectedZone, onZoneSelect }) => {
    // Helper to determine colors based on selection state
    const getFill = (zone: string) => selectedZone === zone ? '#EC4899' : '#FFE4E6'; // brand-pink vs pink-100
    const getStroke = (zone: string) => selectedZone === zone ? '#BE185D' : '#EC4899'; // pink-700 vs brand-pink

    return (
        <div className="relative w-64 h-96 mx-auto my-6">
            <svg
                viewBox="0 0 200 400"
                className="w-full h-full drop-shadow-lg"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Head Zone */}
                <path
                    d="M100,10 Q125,10 125,35 Q125,60 100,60 Q75,60 75,35 Q75,10 100,10"
                    fill={getFill('head')}
                    stroke={getStroke('head')}
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-80 transition-all duration-300"
                    onClick={() => onZoneSelect('head')}
                />

                {/* Chest Zone */}
                <path
                    d="M75,60 Q125,60 125,60 L135,110 Q100,120 65,110 L75,60"
                    fill={getFill('chest')}
                    stroke={getStroke('chest')}
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-80 transition-all duration-300"
                    onClick={() => onZoneSelect('chest')}
                />

                {/* Abdomen Zone */}
                <path
                    d="M65,110 Q100,120 135,110 L135,160 Q100,170 65,160 L65,110"
                    fill={getFill('abdomen')}
                    stroke={getStroke('abdomen')}
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-80 transition-all duration-300"
                    onClick={() => onZoneSelect('abdomen')}
                />

                {/* Pelvis Zone */}
                <path
                    d="M65,160 Q100,170 135,160 L125,190 Q100,200 75,190 L65,160"
                    fill={getFill('pelvis')}
                    stroke={getStroke('pelvis')}
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-80 transition-all duration-300"
                    onClick={() => onZoneSelect('pelvis')}
                />

                {/* Extremities (Arms & Legs) */}
                <g
                    fill={getFill('extremities')}
                    stroke={getStroke('extremities')}
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-80 transition-all duration-300"
                    onClick={() => onZoneSelect('extremities')}
                >
                    {/* Left Arm */}
                    <path d="M65,70 L40,150 L55,155 L75,80" />
                    {/* Right Arm */}
                    <path d="M135,70 L160,150 L145,155 L125,80" />
                    {/* Legs */}
                    <path d="M75,190 L60,350 L85,350 L95,200 L105,200 L115,350 L140,350 L125,190" />
                </g>
            </svg>

            <div className="text-center text-sm text-gray-500 mt-2">
                اضغطي على المنطقة لتصفية الأعراض
            </div>
        </div>
    );
};

export default BodyMap;