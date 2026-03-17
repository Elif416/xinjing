"use client";

import { cn } from "@/lib/utils";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const MouseEnterContext = createContext(false);

export const CardContainer = ({
  children,
  className,
  containerClassName,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const rotationRef = useRef({ x: 0, y: 0 });
  const [isMouseEntered, setIsMouseEntered] = useState(false);
  const [allowTilt, setAllowTilt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionQuery = window.matchMedia(
      "(prefers-reduced-motion: no-preference)"
    );

    const updatePreference = () => {
      setAllowTilt(hoverQuery.matches && motionQuery.matches);
    };

    updatePreference();
    hoverQuery.addEventListener("change", updatePreference);
    motionQuery.addEventListener("change", updatePreference);

    return () => {
      hoverQuery.removeEventListener("change", updatePreference);
      motionQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const resetTransform = () => {
    rotationRef.current = { x: 0, y: 0 };

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (!containerRef.current) {
      return;
    }

    containerRef.current.style.willChange = "auto";
    containerRef.current.style.transform = "rotateY(0deg) rotateX(0deg)";
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!allowTilt || !containerRef.current) {
      return;
    }

    const { left, top, width, height } =
      containerRef.current.getBoundingClientRect();
    const nextX = Math.max(
      -5,
      Math.min(5, (event.clientX - left - width / 2) / 30)
    );
    const nextY = Math.max(
      -5,
      Math.min(5, (event.clientY - top - height / 2) / 30)
    );

    rotationRef.current = { x: nextX, y: -nextY };

    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;

      if (!containerRef.current) {
        return;
      }

      containerRef.current.style.transform = `rotateY(${rotationRef.current.x}deg) rotateX(${rotationRef.current.y}deg)`;
    });
  };

  const handleMouseEnter = () => {
    if (!allowTilt) {
      return;
    }

    setIsMouseEntered(true);

    if (containerRef.current) {
      containerRef.current.style.willChange = "transform";
    }
  };

  const handleMouseLeave = () => {
    setIsMouseEntered(false);
    resetTransform();
  };

  return (
    <MouseEnterContext.Provider value={allowTilt && isMouseEntered}>
      <div
        className={cn("flex items-center justify-center py-20", containerClassName)}
        style={{
          perspective: "1000px",
        }}
      >
        <div
          ref={containerRef}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "relative flex items-center justify-center transition-transform duration-200 ease-out",
            className
          )}
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  );
};

export const CardBody = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "h-96 w-96 [transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]",
        className
      )}
    >
      {children}
    </div>
  );
};

type CardItemProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  translateX?: number | string;
  translateY?: number | string;
  translateZ?: number | string;
  rotateX?: number | string;
  rotateY?: number | string;
  rotateZ?: number | string;
};

export const CardItem = ({
  as: Tag = "div",
  children,
  className,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  ...rest
}: CardItemProps) => {
  const ref = useRef<HTMLElement>(null);
  const isMouseEntered = useMouseEnter();

  useEffect(() => {
    if (!ref.current) return;

    if (isMouseEntered) {
      ref.current.style.transform = `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
    } else {
      ref.current.style.transform =
        "translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
    }
  }, [
    isMouseEntered,
    rotateX,
    rotateY,
    rotateZ,
    translateX,
    translateY,
    translateZ,
  ]);

  return (
    <Tag
      ref={ref}
      className={cn("w-fit transition duration-200 ease-linear", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export const useMouseEnter = () => {
  return useContext(MouseEnterContext);
};
