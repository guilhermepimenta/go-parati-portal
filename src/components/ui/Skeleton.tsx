import React from 'react';

const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
    );
};

export const BusinessCardSkeleton: React.FC = () => {
    return (
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
            <div className="h-56 w-full">
                <Skeleton className="w-full h-full" />
            </div>
            <div className="p-5 space-y-3">
                <div className="flex justify-between">
                    <Skeleton className="h-6 w-2/3 rounded-md" />
                    <Skeleton className="h-4 w-10 rounded-md" />
                </div>
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-5/6 rounded-md" />
                <div className="pt-4 flex justify-between items-center">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-6 w-16 rounded-md" />
                </div>
            </div>
        </div>
    );
};

export default Skeleton;
