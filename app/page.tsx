"use client";

import { useState, useEffect, useCallback } from "react";
import FruitCard from "@/components/FruitCard";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Pause, User, Trophy, Settings, HelpCircle, PenTool, LayoutGrid, BarChart2 } from "lucide-react";

type GameState = "START" | "PLAYING" | "PAUSED" | "FINISHED";

interface Card {
  id: number;
  fruit: string;
  image: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const FRUITS_LIST = [
  { name: "Apple", image: "/fruits/apple.png" },
  { name: "Banana", image: "/fruits/banana.png" },
  { name: "Cherry", image: "/fruits/cherry.png" },
  { name: "Grapes", image: "/fruits/grapes.png" },
  { name: "Lemon", image: "/fruits/lemon.png" },
  { name: "Orange", image: "/fruits/orange.png" },
  { name: "Strawberry", image: "/fruits/strawberry.png" },
  { name: "Pineapple", image: "🍍" },
];

export default function Home() {
  const [gameState, setGameState] = useState<GameState>("START");
  const [userName, setUserName] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [time, setTime] = useState(0);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ name: string; finishtime: string }[]>([]);

  // Load best score
  useEffect(() => {
    const saved = localStorage.getItem("fruitMatcherBestScore");
    if (saved) setBestScore(parseInt(saved));
  }, []);

  const saveBestScore = useCallback((score: number) => {
    if (bestScore === null || score < bestScore) {
      setBestScore(score);
      localStorage.setItem("fruitMatcherBestScore", score.toString());
    }
  }, [bestScore]);

  // 구글 시트에 결과를 저장하는 함수
  const saveResultToGoogleSheets = async (name: string, finishtime: string) => {
    // 제공해 주신 최종 통합 웹 앱 URL입니다.
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxdksOjlPhxoNNocZZAsts2640yFW7zvPi0ZxGHrH_dSPfypADZCPugkIblCqfDAhIX/exec"; 

    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name,
          finishtime: finishtime,
          timestamp: new Date().toISOString()
        }),
      });
      console.log("구글 시트에 성공적으로 저장되었습니다.");
      
      // 저장 후 랭킹 업데이트를 위해 1초 대기 후 호출
      setTimeout(fetchLeaderboard, 1000); 
    } catch (error) {
      console.error("구글 시트 저장 중 오류 발생:", error);
    }
  };

  // 구글 시트에서 TOP 3 랭킹을 가져오는 함수
  const fetchLeaderboard = async () => {
    // 제공해 주신 최종 통합 웹 앱 URL입니다.
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxdksOjlPhxoNNocZZAsts2640yFW7zvPi0ZxGHrH_dSPfypADZCPugkIblCqfDAhIX/exec";
    try {
      const response = await fetch(SCRIPT_URL);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      
      // 데이터가 배열인 경우에만 상위 3명 추출 및 시간순 정렬
      if (Array.isArray(data)) {
        const sortedData = [...data].sort((a, b) => {
          return parseTimeToSeconds(a.finishtime) - parseTimeToSeconds(b.finishtime);
        });
        setLeaderboard(sortedData.slice(0, 3));
      } else {
        console.warn("Ranking data is not an array:", data);
        setLeaderboard([]);
      }
    } catch (error) {
      console.error("랭킹 가져오기 오류:", error);
    }
  };

  const initGame = useCallback(() => {
    const cardPairs = [...FRUITS_LIST, ...FRUITS_LIST].map((fruit, index) => ({
      id: index,
      fruit: fruit.name,
      image: fruit.image,
      isFlipped: false,
      isMatched: false,
    }));
    
    const shuffled = cardPairs.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setTime(0);
    setFlippedCards([]);
    setIsProcessing(false);
    setLeaderboard([]); // 랭킹 초기화
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === "PLAYING") {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  const handleStart = () => {
    if (!userName.trim()) return;
    initGame();
    setGameState("PLAYING");
  };

  const handleCardClick = (index: number) => {
    if (isProcessing || gameState !== "PLAYING") return;
    if (flippedCards.length === 2) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setIsProcessing(true);
      const [firstIdx, secondIdx] = newFlipped;
      
      if (cards[firstIdx].fruit === cards[secondIdx].fruit) {
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[firstIdx].isMatched = true;
          matchedCards[secondIdx].isMatched = true;
          setCards(matchedCards);
          setFlippedCards([]);
          setIsProcessing(false);

          if (matchedCards.every((card) => card.isMatched)) {
            setGameState("FINISHED");
            saveBestScore(time);
            saveResultToGoogleSheets(userName, formatTime(time));
            fetchLeaderboard(); // 성공 시 랭킹 즉시 조회 시도 (저장 작업과 병렬)
          }
        }, 500);
      } else {
        setTimeout(() => {
          const resettledCards = [...cards];
          resettledCards[firstIdx].isFlipped = false;
          resettledCards[secondIdx].isFlipped = false;
          setCards(resettledCards);
          setFlippedCards([]);
          setIsProcessing(false);
        }, 1000);
      }
    }
  };

  // 구글 시트에서 넘어오는 다양한 시간 형식(ISO 날짜, M:SS 등)을 처리하는 헬퍼 함수
  const parseTimeToSeconds = (timeValue: number | string | null | undefined): number => {
    if (timeValue === null || timeValue === undefined) return 0;
    if (typeof timeValue === "number") return timeValue;
    
    const timeStr = String(timeValue);
    
    // 1. ISO 날짜 형식인지 확인 (예: "1899-12-30T00:00:42.000Z")
    if (timeStr.includes("-") && timeStr.includes("T")) {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        // 구글 시트의 시간이 브라우저 타임존으로 변환되므로 로컬 시간 기준 함수를 사용해야 합니다.
        // 이전에 getUTCHours를 사용해 한국 시간(+9)의 경우 15시 등으로 잘못 오프셋 되던 문제를 수정합니다.
        return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
      }
    }
    
    // 2. "H:MM:SS", "M:SS" 형식 처리
    const parts = timeStr.split(":");
    if (parts.length === 3) {
      return (parseInt(parts[0]) || 0) * 3600 + (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0);
    } else if (parts.length === 2) {
      return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
    }
    
    return parseInt(timeStr) || 0;
  };

  const formatTime = (timeValue: number | string | null | undefined) => {
    const totalSeconds = parseTimeToSeconds(timeValue);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex-1 flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-primary">프룻 매처</h1>
        <div className="flex gap-4">
          <button className="p-2 text-primary hover:bg-white/50 rounded-lg transition-all">
            <Settings size={22} strokeWidth={3} />
          </button>
          <button className="p-2 text-primary hover:bg-white/50 rounded-lg transition-all">
            <HelpCircle size={22} strokeWidth={3} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 relative">
        <AnimatePresence mode="wait">
          {gameState === "START" && (
            <motion.div
              key="start"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg mb-12"
            >
              <div className="flex flex-col items-center gap-2 mb-12">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <div className="w-10 h-10 bg-primary rounded-full relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-6 bg-primary rounded-full" style={{ transform: 'rotate(20deg)' }}></div>
                  </div>
                </div>
                <h2 className="text-5xl font-black text-primary tracking-tight">프룻 매처</h2>
                <p className="text-primary/70 font-semibold text-center max-w-[250px]">
                  최대한 빨리 모든 과일 짝을 찾아보세요!
                </p>
              </div>

              <div className="glass-card p-8 flex flex-col gap-6 shadow-xl">
                <div>
                  <label className="block text-[10px] font-black tracking-widest text-primary/50 mb-2 uppercase">이름을 입력하세요</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="이름 입력..."
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full bg-[#D6FFFF] px-6 py-4 rounded-2xl border-none text-primary font-bold placeholder:text-primary/30 outline-none"
                    />
                    <PenTool size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-primary/40" />
                  </div>
                </div>
                
                <button
                  onClick={handleStart}
                  disabled={!userName.trim()}
                  className="btn-primary py-5 text-xl flex items-center justify-center gap-2"
                >
                  게임 시작 <Play size={20} fill="white" />
                </button>
                
                <div className="flex items-center justify-center gap-3 mt-2">
                  <div className="flex -space-x-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-zinc-200 overflow-hidden">
                        <img src={`https://i.pravatar.cc/150?u=${i}`} alt="avatar" />
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-primary/60">오늘 2,400명 이상 참여</span>
                </div>
              </div>
            </motion.div>
          )}

          {(gameState === "PLAYING" || gameState === "PAUSED") && (
            <motion.div
              key="game"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-xl flex flex-col items-center gap-8"
            >
              <div className="w-full flex justify-between items-end px-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-primary/50 tracking-widest">경과 시간</span>
                  <span className="text-5xl font-black text-primary font-mono">{formatTime(time)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-primary/50 tracking-widest mb-1 uppercase">최고 기록</span>
                  <div className="bg-accent px-4 py-1.5 rounded-full text-sm font-black text-primary shadow-sm">
                    {bestScore ? formatTime(bestScore) : "--:--"}
                  </div>
                </div>
              </div>

              <div className="bg-[#C1F9F9] p-4 rounded-[2.5rem] w-full grid grid-cols-4 gap-3 shadow-inner">
                {cards.map((card, index) => (
                  <FruitCard
                    key={card.id}
                    {...card}
                    onClick={() => handleCardClick(index)}
                    disabled={gameState === "PAUSED" || isProcessing}
                  />
                ))}
              </div>

              <div className="w-full flex flex-col gap-4">
                {gameState === "PAUSED" && (
                  <button onClick={() => setGameState("PLAYING")} className="btn-primary w-full py-5 text-xl shadow-lg">
                    <Play size={20} fill="white" /> 계속하기
                  </button>
                )}
                
                <div className="flex gap-4 w-full">
                  <button
                    onClick={() => setGameState(gameState === "PLAYING" ? "PAUSED" : "PLAYING")}
                    className="btn-accent flex-1 flex items-center justify-center gap-2 py-4 shadow-sm"
                  >
                    <Pause size={18} fill="currentColor" /> 일시정지
                  </button>
                  <button
                    onClick={initGame}
                    className="btn-light flex-1 flex items-center justify-center gap-2 py-4 shadow-sm"
                  >
                    <RotateCcw size={18} strokeWidth={3} /> 재시작
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {gameState === "FINISHED" && (
            <motion.div
              key="finish"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-10 w-full max-w-md text-center flex flex-col gap-6"
            >
              <div className="text-6xl">🥳</div>
              <div>
                <h2 className="text-3xl font-black text-primary mb-1">참 잘했어요!</h2>
                <p className="font-bold text-primary/60">{userName}님, 성공했습니다!</p>
              </div>
              <div className="bg-[#E0FAFA] p-4 rounded-3xl">
                <p className="text-[10px] font-black text-primary/40 tracking-widest mb-1 uppercase">나의 기록</p>
                <p className="text-4xl font-black text-primary font-mono">{formatTime(time)}</p>
              </div>

              {/* Leaderboard TOP 3 */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-black text-primary/50 tracking-widest uppercase">명예의 전당 (TOP 3)</h3>
                <div className="flex flex-col gap-2">
                  {leaderboard.length > 0 ? (
                    leaderboard.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white/50 px-5 py-3 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className={`${idx === 0 ? "text-accent" : "text-primary/30"} font-black text-xl`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-primary">{item.name}</span>
                        </div>
                        <span className="font-mono font-bold text-primary/70">{formatTime(item.finishtime)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-primary/30 py-4">랭킹을 불러오는 중...</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button onClick={handleStart} className="btn-primary py-4 text-lg">
                  다시 하기
                </button>
                <button onClick={() => setGameState("START")} className="btn-light py-4">
                  홈으로
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white/80 backdrop-blur-md px-12 py-3 mb-4 mx-4 rounded-3xl flex justify-between items-center shadow-lg border border-white">
        <button onClick={() => setGameState("START")} className={`nav-item ${gameState !== "START" ? "" : "active"}`}>
          <div className="nav-icon"><LayoutGrid size={24} /></div>
          <span>게임</span>
        </button>
        <button className="nav-item">
          <div className="nav-icon"><BarChart2 size={24} /></div>
          <span>통계</span>
        </button>
        <button className="nav-item">
          <div className="nav-icon"><Settings size={24} /></div>
          <span>설정</span>
        </button>
      </nav>
    </div>
  );
}
