import React, { useEffect, useState } from 'react';

interface TransparentLogoProps {
  src: string;
  className?: string;
  alt?: string;
}

export const TransparentLogo: React.FC<TransparentLogoProps> = ({ src, className, alt }) => {
  const [processedSrc, setProcessedSrc] = useState(src);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      
      // Threshold to detect black/near-black background pixels and make them transparent
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // If the pixel is dark (black background threshold)
        if (r < 55 && g < 55 && b < 55) {
          data[i + 3] = 0; // Alpha = 0 (fully transparent)
        }
      }
      
      ctx.putImageData(imgData, 0, 0);
      setProcessedSrc(canvas.toDataURL());
    };
  }, [src]);

  return <img src={processedSrc} className={className} alt={alt} />;
};
