
import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PlateCapture from './PlateCapture';
import type { ParkingTicket } from '../types';

interface PatyAgentProps {
    onTicketCreated?: (ticket: ParkingTicket) => void;
}

const PatyAgent: React.FC<PatyAgentProps> = ({ onTicketCreated }) => {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);
    const [showBubble, setShowBubble] = useState(false);
    const [showPlateCapture, setShowPlateCapture] = useState(false);

    // Typewriter State
    const [headerText, setHeaderText] = useState("");
    const [bodyText, setBodyText] = useState("");

    // Using keys for translation, but typewriter effect needs string content.
    // We get the string from t() inside the effect or here if it doesn't change frequently.
    const fullHeader = t('agent.header_parked');
    const fullBody = t('agent.body_buy');

    // Scroll Visibility State
    const [showOnScroll, setShowOnScroll] = useState(true);

    useEffect(() => {
        // Initial delay timer
        const timer = setTimeout(() => {
            setIsVisible(true);
            setShowBubble(true);
        }, 2000);

        // Scroll listener to hide/show based on position
        const handleScroll = () => {
            const isAtTop = window.scrollY < 100; // Show only near top
            setShowOnScroll(isAtTop);
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Re-open bubble when returning to top
    useEffect(() => {
        if (showOnScroll) {
            setShowBubble(true);
        }
    }, [showOnScroll]);

    // Typewriter Logic
    useEffect(() => {
        // Only run typewriter if bubble is "logically" meant to be shown (showBubble)
        // AND we are scrolled to the top (showOnScroll)
        if (showBubble && showOnScroll) {
            let hIndex = 0;
            let bIndex = 0;

            // Reset text when bubble opens
            setHeaderText("");
            setBodyText("");



            const typeInterval = setInterval(() => {
                // Phase 1: Header
                if (hIndex < fullHeader.length) {
                    setHeaderText(fullHeader.slice(0, hIndex + 1));
                    hIndex++;
                }
                // Phase 2: Body (start after header is done)
                else if (bIndex < fullBody.length) {
                    setBodyText(fullBody.slice(0, bIndex + 1));
                    bIndex++;
                }
                // Done
                else {
                    clearInterval(typeInterval);
                }
            }, 80); // Speed: 80ms (Slower)

            return () => {
                clearInterval(typeInterval);
            };
        }
    }, [showBubble, showOnScroll, fullHeader, fullBody]);

    if (!isVisible) return null;

    const handleAvatarClick = () => {
        setShowBubble(false);
        setShowPlateCapture(true);
    };

    return (
        <>
        <PlateCapture
            isOpen={showPlateCapture}
            onClose={() => setShowPlateCapture(false)}
            onTicketCreated={(ticket) => {
                setShowPlateCapture(false);
                onTicketCreated?.(ticket);
            }}
        />

        <div className={`fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 z-50 md:hidden flex flex-col items-end gap-1 transition-all duration-500 ease-in-out ${showOnScroll && isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>

            {/* Chat Bubble (Clicking anywhere closes it or opens whatsapp logic if we wanted, but here it just shows info) */}
            {showBubble && (
                <div
                    onClick={() => setShowBubble(false)}
                    className="relative bg-white p-3 rounded-2xl rounded-br-none shadow-xl border border-border max-w-[240px] animate-in fade-in slide-in-from-right-4 duration-500 mb-1 cursor-pointer"
                >
                    {/* Ghost Text (Invisible) for Layout Sizing */}
                    <p className="text-xs font-medium text-transparent leading-relaxed select-none whitespace-pre-line">
                        🚗 <span className="font-bold">{fullHeader}</span> <br />
                        {fullBody}
                    </p>

                    {/* Visible Typing Text (Absolute Overlay) */}
                    <p className="absolute top-3 left-3 right-3 text-xs font-medium text-ink leading-relaxed whitespace-pre-line">
                        <MessageCircle className="w-3 h-3 text-emerald-500 inline mr-1 mb-0.5" />
                        🚗 <span className="font-bold text-coral">{headerText}</span> <br />
                        {bodyText}
                    </p>

                    {/* Tail pointing down */}
                    <div className="absolute -bottom-1.5 right-5 w-4 h-4 bg-white border-r border-b border-border rotate-45"></div>
                </div>
            )}

            {/* Avatar Button */}
            <button
                onClick={handleAvatarClick}
                className="relative group cursor-pointer w-14 h-14"
            >
                {/* Pulse Effect */}
                <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-25 animate-ping"></span>

                {/* Image Container */}
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 p-0.5 shadow-lg shadow-emerald-500/30 overflow-hidden border-2 border-white">
                    {/* Paty Avatar */}
                    <img
                        src="/paty-avatar.png"
                        alt="Agente Paty"
                        className="w-full h-full object-cover bg-white"
                    />
                </div>

                {/* Status Indicator */}
                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 border-2 border-white rounded-full z-10"></span>
            </button>
        </div>
        </>
    );
};

export default PatyAgent;
