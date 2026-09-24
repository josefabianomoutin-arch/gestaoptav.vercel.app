import React from 'react';
import { POLICIA_PENAL_BADGE_B64 } from './policiaPenalData';

interface PoliciaPenalLogoProps {
  className?: string;
  alt?: string;
}

export const PoliciaPenalLogo: React.FC<PoliciaPenalLogoProps> = ({ 
  className = 'h-16 w-auto object-contain',
  alt = 'Brasão Oficial da Polícia Penal SP' 
}) => {
  return (
    <img 
      src={POLICIA_PENAL_BADGE_B64} 
      alt={alt}
      className={className}
      loading="eager"
      decoding="sync"
    />
  );
};

export default PoliciaPenalLogo;
