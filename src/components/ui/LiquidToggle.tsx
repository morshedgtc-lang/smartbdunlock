"use client";

import { useState, useRef, useCallback } from "react";

interface LiquidToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  label?: string;
}

export function LiquidToggle({
  checked = false,
  onChange,
  size = "md",
  disabled = false,
  label,
}: LiquidToggleProps) {
  const [isOn, setIsOn] = useState(checked);
  const [isAnimating, setIsAnimating] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const animationRef = useRef<number | null>(null);

  const sizes = {
    sm: { width: 40, height: 24, thumbR: 8, trackRx: 12 },
    md: { width: 51, height: 31, thumbR: 11, trackRx: 16 },
    lg: { width: 62, height: 38, thumbR: 14, trackRx: 19 },
  };

  const { width, height, thumbR, trackRx } = sizes[size];
  const thumbCx = isOn ? width - thumbR - 3 : thumbR + 3;

  const animateTurbulence = useCallback(() => {
    if (!turbulenceRef.current) return;

    setIsAnimating(true);
    let frame = 0;
    const totalFrames = 24;

    const animate = () => {
      if (frame >= totalFrames) {
        setIsAnimating(false);
        if (turbulenceRef.current) {
          turbulenceRef.current.setAttribute("baseFrequency", "0.01");
        }
        return;
      }

      const progress = frame / totalFrames;
      const sine = Math.sin(progress * Math.PI);
      const frequency = 0.01 + sine * 0.04;

      if (turbulenceRef.current) {
        turbulenceRef.current.setAttribute("baseFrequency", frequency.toString());
      }

      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const toggle = () => {
    if (disabled) return;
    setIsOn(!isOn);
    animateTurbulence();
    onChange?.(!isOn);
  };

  return (
    <div className="flex items-center gap-3">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={`liquid-toggle ${isOn ? "on" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onClick={toggle}
        role="switch"
        aria-checked={isOn}
        aria-label={label}
      >
        <defs>
          <filter id={`toggle-distort-${size}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              ref={turbulenceRef}
              type="fractalNoise"
              baseFrequency="0.01"
              numOctaves="2"
              seed="3"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={isAnimating ? "4" : "0"}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>

        {/* Track */}
        <rect
          className="liquid-toggle-track"
          x="0"
          y="0"
          width={width}
          height={height}
          rx={trackRx}
          fill={isOn ? "var(--accent)" : "rgba(118, 118, 128, 0.24)"}
          filter={`url(#toggle-distort-${size})`}
        />

        {/* Thumb highlight */}
        <ellipse
          cx={thumbCx}
          cy={height / 2 - 2}
          rx={thumbR - 2}
          ry={thumbR - 4}
          fill="rgba(255, 255, 255, 0.2)"
          style={{
            transition: "cx 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />

        {/* Thumb */}
        <circle
          className="liquid-toggle-thumb"
          cx={thumbCx}
          cy={height / 2}
          r={thumbR}
          fill="white"
          style={{
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
            transition: "cx 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
      </svg>

      {label && (
        <span className="text-sm font-medium text-foreground">{label}</span>
      )}
    </div>
  );
}
