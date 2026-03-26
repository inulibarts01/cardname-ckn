"use client";

import { Star } from "lucide-react";
import Image from "next/image";

interface FruitCardProps {
  id: number;
  image: string;
  isFlipped: boolean;
  isMatched: boolean;
  onClick: () => void;
  disabled: boolean;
}

export default function FruitCard({
  image,
  isFlipped,
  isMatched,
  onClick,
  disabled,
}: FruitCardProps) {
  const isEmoji = !image.endsWith(".png");

  return (
    <div
      className="card-container w-full aspect-square cursor-pointer"
      onClick={!disabled && !isFlipped && !isMatched ? onClick : undefined}
    >
      <div className={`card-inner h-full ${isFlipped || isMatched ? "flipped" : ""}`}>
        {/* Side shown first (Star) */}
        <div className="card-face card-front-face shadow-lg">
          <Star size={32} fill="white" />
        </div>
        
        {/* Secret Side (Fruit) */}
        <div className={`card-face card-back-face shadow-sm ${isMatched ? "matched" : ""}`}>
          {isEmoji ? (
            <span className="text-5xl">{image}</span>
          ) : (
            <div className="relative w-full h-full p-2">
              <Image
                src={image}
                alt="Fruit"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 25vw"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
