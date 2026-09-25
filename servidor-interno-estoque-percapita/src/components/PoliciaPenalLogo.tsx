import React from 'react';
import { POLICIA_PENAL_BADGE_B64 } from './policiaPenalData';

interface PoliciaPenalLogoProps {
  className?: string;
  alt?: string;
}

/**
 * Brasão Oficial da Polícia Penal do Estado de São Paulo (PP-SP).
 * Escudo tipo suíço preto com moldura dourada, faixas douradas 'POLÍCIA' (superior) e 'PENAL' (inferior), 
 * estrela prateada e brasão do Estado de São Paulo (espada vertical com asas abertas e louros).
 */
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
