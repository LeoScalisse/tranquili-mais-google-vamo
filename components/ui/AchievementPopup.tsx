import React, { useEffect } from 'react';
import { TrophyIcon, X } from './Icons';
import { playSound } from '../../services/soundService';

// Minimal cn utility
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

interface AchievementPopupProps {
    title: string;
    description: string;
    onClose: () => void;
}

export const AchievementPopup: React.FC<AchievementPopupProps> = ({ title, description, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000); // Auto dismiss
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-4 right-4 z-[100] animate-slide-in-from-right w-full max-w-sm px-4 sm:px-0">
            <div className="w-full mx-auto">
                <div className="relative bg-zinc-50 border border-zinc-200 shadow-[0_1px_6px_0_rgba(0,0,0,0.02)] rounded-xl p-4">
                    <div className="flex items-center gap-4">
                        <div className="relative h-10 w-10 flex-shrink-0 flex items-center justify-center bg-yellow-100 rounded-full border border-yellow-200">
                            <TrophyIcon className="w-5 h-5 text-yellow-600" />
                            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-medium text-zinc-700">
                                        Conquista Desbloqueada!
                                    </p>
                                    <p className="text-[13px] text-zinc-500 mt-0.5">
                                        Você alcançou <span className="font-medium text-zinc-700">{title}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg flex items-center justify-center h-8 w-8 p-0 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-2 ml-14">
                        <p className="text-[12px] text-zinc-400">
                            {description}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};