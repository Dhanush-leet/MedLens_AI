import React from 'react';
import { motion } from 'motion/react';

export const HeroParticlePortrait: React.FC = () => {
  return (
    <motion.img
      src="/woman_branches.png"
      alt="MedLens AI Hero Portrait"
      className="h-full w-auto object-contain object-bottom"
      style={{ maxHeight: '110%', minHeight: '480px' }}
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 0.92, scale: 1 }}
      transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
    />
  );
};


