import React, { useEffect, useRef } from 'react';

export default function DotWaveBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;

    const SPACING = 24; 
    const MAX_DIST = 120; // Activation radius

    let mx = -1000;
    let my = -1000;

    const dots = [];
    
    function init() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      const cols = Math.ceil(width / SPACING) + 1;
      const rows = Math.ceil(height / SPACING) + 1;

      dots.length = 0; 
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          dots.push({
            x: x * SPACING,
            y: y * SPACING,
            baseY: y * SPACING,
            vy: 0, // Velocity in Y direction for our spring
            colorOffset: 0, // Color transition state
          });
        }
      }
    }

    init();

    // Mouse tracking to calculate speed & direction
    let pmx = mx;
    let pmy = my;
    const handleMove = (e) => {
      pmx = mx;
      pmy = my;
      mx = e.clientX;
      my = e.clientY;
    };
    
    const handleLeave = () => {
      mx = -1000;
      my = -1000;
    };

    window.addEventListener('resize', init);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseleave', handleLeave);

    let animationId;
    function render() {
      ctx.clearRect(0, 0, width, height);

      // Background fill color
      ctx.fillStyle = '#f8fafc'; // slate-50
      ctx.fillRect(0, 0, width, height);

      // Calculate the physical cursor speed vector
      const dxCursor = mx - pmx;
      const dyCursor = my - pmy;
      const speed = Math.sqrt(dxCursor * dxCursor + dyCursor * dyCursor);

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        
        const dx = dot.x - mx;
        const dy = dot.baseY - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 1. Interaction Phase: Cursor pushes dots in an organic wake
        if (dist < MAX_DIST && speed > 0.5) {
          const intensity = 1 - (dist / MAX_DIST); 
          // Push the dots down proportionally to the cursor's speed.
          // The multiplier creates the initial "dip" of the wave.
          dot.vy += intensity * (speed * 0.05); 
        }

        // 2. Physics Phase: Damped Oscillator (Spring Physics)
        // This makes the dots organically bounce back up and slightly over the line, 
        // organically forming a rippling wake trail!
        const springForce = (dot.baseY - dot.y) * 0.08; // Stiffness
        dot.vy += springForce;
        dot.vy *= 0.88; // Friction/damping
        dot.y += dot.vy;

        // 3. Stylistic Phase: Color shifting based on physics displacement
        const displacement = Math.abs(dot.y - dot.baseY);
        // Lerp color smoothly so it glows as it moves up and down
        dot.colorOffset += ((displacement / 10) - dot.colorOffset) * 0.15; 
        if (dot.colorOffset > 1) dot.colorOffset = 1;
        if (dot.colorOffset < 0) dot.colorOffset = 0;

        // Base color `#cbd5e1` (slate-300), active color `#6d28d9` (Kenhsiki brand purple/dark)
        // Slate-300: 203, 213, 225
        // Violets: 109, 40, 217
        const r = 203 - (203 - 109) * dot.colorOffset;
        const g = 213 - (213 - 40) * dot.colorOffset;
        const b = 225 - (225 - 217) * dot.colorOffset;

        ctx.beginPath();
        // Dot gets slightly bigger when physically disturbed
        const size = 1.5 + (0.75 * dot.colorOffset);
        ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fill();
      }

      // Automatically bleed down speed measurements so we don't infinitely apply force
      pmx += (mx - pmx) * 0.2;
      pmy += (my - pmy) * 0.2;

      animationId = requestAnimationFrame(render);
    }
    
    render();

    return () => {
      window.removeEventListener('resize', init);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseleave', handleLeave);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.8,
      }}
    />
  );
}
