import { useState, useEffect, useMemo, useRef } from 'react';

interface TandurSplashScreenProps {
  /** Durasi total splash screen dalam milidetik (default: 3000ms) */
  duration?: number;
  /** Callback saat loading selesai (100%) */
  onComplete?: () => void;
  /** Path gambar background dari folder public/ */
  backgroundImageUrl?: string;
}

interface FallingLeaf {
  id: number;
  left: string;
  size: number;
  duration: number;
  delay: number;
  swayDuration: number;
  initialRotation: number;
  flip: boolean;
  opacity: number;
  blur: number;
  palette: {
    tipLight: string;
    midMain: string;
    deepBase: string;
    vein: string;
  };
}

export default function TandurSplashScreen({
  duration = 3000,
  onComplete,
  backgroundImageUrl = '/tandur-bg.jpg',
}: TandurSplashScreenProps) {
  const [progress, setProgress] = useState<number>(0);

  // Simpan referensi onComplete agar timer tidak ter-reset saat parent re-render
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Palet warna daun diambil langsung dari ilustrasi sawah & pepohonan background
  const leaves = useMemo<FallingLeaf[]>(() => {
    const palettes = [
      // Hijau zaitun / dedaunan pohon kanan yang terkena sinar matahari pagi
      {
        tipLight: '#D8DF85',
        midMain: '#A6BE54',
        deepBase: '#7D993C',
        vein: '#67822E',
      },
      // Hijau limau muda dari hamparan padi di latar tengah
      {
        tipLight: '#C5DC77',
        midMain: '#8FB843',
        deepBase: '#69932C',
        vein: '#557B20',
      },
      // Hijau segar pepohonan kiri yang teduh
      {
        tipLight: '#A8CA68',
        midMain: '#76A33E',
        deepBase: '#517A29',
        vein: '#3F631D',
      },
    ];

    return Array.from({ length: 13 }, (_, i) => {
      const depthTier = i % 3;
      const leftPercent = (i * 7.6 + (i % 3) * 2.4) % 95;

      const palette =
        leftPercent > 55
          ? palettes[0]
          : leftPercent < 38
          ? palettes[2]
          : palettes[1];

      const size =
        depthTier === 0
          ? 34 + (i % 3) * 6 // 34px - 46px (jauh)
          : depthTier === 1
          ? 46 + (i % 3) * 7 // 46px - 60px (tengah)
          : 58 + (i % 3) * 8; // 58px - 74px (dekat, bokeh)

      const blur = depthTier === 0 ? 4.2 : depthTier === 1 ? 2.4 : 3.2;

      return {
        id: i,
        left: `${leftPercent}%`,
        size,
        duration: 5.5 + (i % 5) * 0.9,
        delay: -(i * 0.75),
        swayDuration: 2.6 + (i % 3) * 0.6,
        initialRotation: -20 + (i % 5) * 18,
        flip: i % 2 === 1,
        opacity: depthTier === 0 ? 0.65 : 0.85,
        blur,
        palette,
      };
    });
  }, []);

  useEffect(() => {
    const intervalMs = 30;
    const step = 100 / (duration / intervalMs);
    let isCompleted = false;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          if (!isCompleted) {
            isCompleted = true;
            // Langsung panggil onComplete tanpa jeda opacity-0 agar tidak muncul layar putih
            onCompleteRef.current?.();
          }
          return 100;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [duration]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden select-none flex flex-col justify-between items-center bg-[#E7ECD8]">
      {/* Keyframes CSS untuk Animasi Daun Melayang & Bergoyang */}
      <style>{`
        @keyframes leafFall {
          0% {
            transform: translateY(-14vh);
          }
          100% {
            transform: translateY(114vh);
          }
        }

        @keyframes leafSway {
          0%, 100% {
            transform: translateX(-24px) rotate(-18deg);
          }
          50% {
            transform: translateX(24px) rotate(24deg);
          }
        }

        .falling-leaf-wrapper {
          position: absolute;
          top: 0;
          pointer-events: none;
          animation: leafFall linear infinite;
          will-change: transform;
        }

        .falling-leaf-svg {
          animation: leafSway ease-in-out infinite;
          will-change: transform;
        }
      `}</style>

      {/* Background Image Polos (/tandur-bg.jpg) */}
      <img
        src={backgroundImageUrl}
        alt="Latar Sawah Tandur"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
      />

      {/* Masking Vignette Halus di Tengah agar daun tidak menutupi logo/teks & menyatu dengan kabut cahaya */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none z-[5]"
        style={{
          WebkitMaskImage:
            'radial-gradient(ellipse 46% 38% at 50% 47%, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.85) 65%, rgba(0,0,0,1) 100%)',
          maskImage:
            'radial-gradient(ellipse 46% 38% at 50% 47%, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.85) 65%, rgba(0,0,0,1) 100%)',
        }}
        aria-hidden="true"
      >
        {leaves.map((leaf) => (
          <div
            key={leaf.id}
            className="falling-leaf-wrapper"
            style={{
              left: leaf.left,
              animationDuration: `${leaf.duration}s`,
              animationDelay: `${leaf.delay}s`,
              opacity: leaf.opacity,
              filter: `blur(${leaf.blur}px)`,
            }}
          >
            <div
              style={{
                transform: `rotate(${leaf.initialRotation}deg) scaleX(${leaf.flip ? -1 : 1})`,
              }}
            >
              <svg
                viewBox="0 0 100 100"
                width={leaf.size}
                height={leaf.size}
                className="falling-leaf-svg overflow-visible"
                style={{
                  animationDuration: `${leaf.swayDuration}s`,
                  animationDelay: `${leaf.delay}s`,
                }}
              >
                <defs>
                  <linearGradient
                    id={`paddyLeafGrad-${leaf.id}`}
                    x1="10%"
                    y1="10%"
                    x2="92%"
                    y2="88%"
                  >
                    <stop offset="0%" stopColor={leaf.palette.tipLight} stopOpacity="0.45" />
                    <stop offset="28%" stopColor={leaf.palette.tipLight} stopOpacity="0.95" />
                    <stop offset="65%" stopColor={leaf.palette.midMain} stopOpacity="0.95" />
                    <stop offset="100%" stopColor={leaf.palette.deepBase} stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {/* Siluet helai daun ramping melengkung */}
                <path
                  d="M 10 8 C 20 34, 42 48, 66 64 C 78 72, 88 80, 94 86 C 82 86, 66 84, 48 76 C 24 64, 14 40, 10 8 Z"
                  fill={`url(#paddyLeafGrad-${leaf.id})`}
                />

                {/* Garis tulang daun tengah yang lembut */}
                <path
                  d="M 14 14 C 26 42, 48 60, 88 83"
                  stroke={leaf.palette.vein}
                  strokeWidth="1.6"
                  strokeOpacity="0.42"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Spacer Atas agar logo & subjudul seimbang di tengah */}
      <div className="h-14 sm:h-20" />

      {/* Konten Utama Tengah: Logo TANDUR + Subjudul + Tagline */}
      <main className="relative z-10 flex flex-col items-center text-center px-4 w-full max-w-xl mx-auto">
        {/* Wordmark Logo TANDUR Custom Vector */}
        <div className="w-[190px] sm:w-[250px] md:w-[290px] -mb-0.5 sm:-mb-1">
          <svg
            viewBox="0 0 510 145"
            className="w-full h-auto overflow-visible"
            role="img"
            aria-label="Logo TANDUR"
          >
            <defs>
              <linearGradient id="leafLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#639638" />
                <stop offset="100%" stopColor="#3B6E24" />
              </linearGradient>
              <linearGradient id="leafRightGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#356821" />
                <stop offset="100%" stopColor="#6BA03E" />
              </linearGradient>
            </defs>

            {/* Tunas 2 Helai Daun di atas batang kiri huruf U */}
            <g transform="translate(302, 4)">
              <path
                d="M27 39 C13 38, 3 27, 4 12 C18 12, 29 22, 27 39 Z"
                fill="url(#leafLeftGrad)"
              />
              <path
                d="M25 36 Q16 25 8 16"
                stroke="#85B854"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M29 39 C27 19, 41 4, 60 4 C60 22, 46 39, 29 39 Z"
                fill="url(#leafRightGrad)"
              />
              <path
                d="M31 36 Q42 22 54 10"
                stroke="#8EC05D"
                strokeWidth="1.7"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* Kelompok Huruf TANDUR */}
            <g fill="#1B4D20" style={{ filter: 'drop-shadow(1px 1.5px 0px rgba(0,0,0,0.18))' }}>
              <path d="M12 63 C12 48, 24 41, 38 44 C52 47, 62 52, 74 49 C80 47, 84 44, 86 41 C88 53, 81 64, 67 66 C55 68, 44 63, 33 61 C24 60, 19 64, 21 71 C15 70, 12 67, 12 63 Z" />
              <path d="M35 66 C42 68, 49 71, 53 74 L53 121 C53 126, 49 129, 44 129 C39 129, 35 126, 35 121 Z" />
              <path
                fillRule="evenodd"
                d="M111 47 C113 43, 117 41, 121 41 C125 41, 129 43, 131 47 L161 119 C163 124, 159 129, 153 129 L144 129 C140 129, 137 127, 135 123 L131 113 L111 113 L107 123 C105 127, 102 129, 98 129 L89 129 C83 129, 79 124, 81 119 Z M121 72 L115 96 L127 96 Z"
              />
              <path d="M174 50 C174 45, 178 41, 183 41 C187 41, 190 43, 192 46 L223 95 L223 50 C223 45, 227 41, 232 41 C237 41, 241 45, 241 50 L241 120 C241 125, 237 129, 232 129 C228 129, 225 127, 223 124 L192 75 L192 120 C192 125, 188 129, 183 129 C178 129, 174 125, 174 120 Z" />
              <path
                fillRule="evenodd"
                d="M259 49 C259 44, 263 41, 268 41 L287 41 C312 41, 329 58, 329 85 C329 112, 312 129, 287 129 L268 129 C263 129, 259 126, 259 121 Z M277 58 L277 112 L286 112 C302 112, 311 101, 311 85 C311 69, 302 58, 286 58 Z"
              />
              <path d="M344 49 C344 44, 348 41, 353 41 C358 41, 362 44, 362 49 L362 94 C362 106, 369 113, 379 113 C389 113, 396 106, 396 94 L396 49 C396 44, 400 41, 405 41 C410 41, 414 44, 414 49 L414 95 C414 116, 400 130, 379 130 C358 130, 344 116, 344 95 Z" />
              <path
                fillRule="evenodd"
                d="M432 49 C432 44, 436 41, 441 41 L465 41 C483 41, 495 52, 495 69 C495 81, 488 91, 477 95 L494 119 C497 124, 494 129, 488 129 L479 129 C475 129, 472 127, 470 124 L457 98 L450 98 L450 121 C450 126, 446 129, 441 129 C436 129, 432 126, 432 121 Z M450 58 L450 82 L464 82 C472 82, 477 77, 477 70 C477 63, 472 58, 464 58 Z"
              />
            </g>
          </svg>
        </div>

        {/* Subjudul Utama */}
        <div className="mt-3 flex items-center justify-center gap-2.5 sm:gap-3">
          <span className="h-[1.5px] w-5 sm:w-8 rounded-full bg-[#24592B]/45" />
          <h1
            className="text-sm sm:text-base md:text-[18px] font-semibold tracking-[0.12em] text-[#1E4724] leading-none"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Nunito', sans-serif" }}
          >
            Platform Rantai Pasok
          </h1>
          <span className="h-[1.5px] w-5 sm:w-8 rounded-full bg-[#24592B]/45" />
        </div>

        {/* Tagline */}
        <p className="mt-1.5 text-xs sm:text-sm md:text-[15.5px] font-normal italic text-[#344A36] tracking-wide leading-snug">
          menanam kebaikan, menuai masa depan
        </p>
      </main>

      {/* Kelompok Bawah: Progress Bar Loading didekatkan ke Copyright */}
      <div className="relative z-10 w-full max-w-[260px] sm:max-w-[320px] px-4 pb-5 sm:pb-6 flex flex-col items-center text-center">
        <div className="w-full flex flex-col items-center mb-3.5 sm:mb-4">
          <div className="w-full h-2 sm:h-2.5 rounded-full bg-[#C4C9BC]/85 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-[#155D27] transition-all duration-100 ease-out"
              style={{ width: `${Math.min(100, Math.max(8, progress))}%` }}
            />
          </div>

          <span className="mt-2 text-[11px] sm:text-xs font-medium text-[#263127] tracking-wide">
            Memuat halaman...
          </span>
        </div>

      
        
      </div>
    </div>
  );
}