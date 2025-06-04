
import React from 'react';

const FuelIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.393-.03.79-.03 1.184 0 1.13.094 1.976 1.057 1.976 2.192V7.5M8.25 7.5h7.5M8.25 7.5V15c0 .621.504 1.125 1.125 1.125h.075c.72.069 1.363.434 1.824.994l.461.572c.259.322.713.322.972 0l.461-.572c.461-.56.904-.925 1.824-.994h.075c.621 0 1.125-.504 1.125-1.125V7.5m-7.5 4.5h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V3.375c0-.621-.504-1.125-1.125-1.125H13.5m-3 0V3.75m3 0V3.75m0 0h-3m-5.625 0H9.75" />
  </svg>
);
export default FuelIcon;
