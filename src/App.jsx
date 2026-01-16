import React, { useState } from 'react';

// Pricing Constants
const BASE_PRICES = {
  high: 8000, // 85-100
  mid: 7000,  // 65-84
  low: 6500,  // 45-64
  milk: 6000, // 33-44
};

const SIZE_ADDONS = {
  S: 0,
  M: 500,
  L: 1000,
  XL: 1500,
};

const ICE_ADDON = 1000;
const TOPPING_ADDON = 500;

// Image Path Mapping (String Only - No Imports)
const IMAGE_PATHS = {
  cup: {
    hot: "/images/hotcup.png",
    ice: "/images/icecup.png",
  },
  liquid: {
    hot: {
      100: "/images/hot100.png",
      70: "/images/hot70_5.png",
      57: "/images/hot57_9.png",
      milk: "/images/hotmilk.png",
    },
    ice: {
      100: "/images/ice100.png",
      70: "/images/ice70_5.png",
      57: "/images/ice57_9.png",
      milk: "/images/icemilk.png",
    },
  },
  topping: "/images/choco_t.png",
};

function App() {
  const [isIced, setIsIced] = useState(false);
  const [cacao, setCacao] = useState(70);
  const [size, setSize] = useState('L');
  const [hasTopping, setHasTopping] = useState(false);

  // Helper: Get Price Base
  const getCacaoPrice = (val) => {
    if (val >= 85) return BASE_PRICES.high;
    if (val >= 65) return BASE_PRICES.mid;
    if (val >= 45) return BASE_PRICES.low;
    return BASE_PRICES.milk;
  };

  // Helper: Total Price Calc
  const totalPrice =
    getCacaoPrice(cacao) +
    SIZE_ADDONS[size] +
    (isIced ? ICE_ADDON : 0) +
    (hasTopping ? TOPPING_ADDON : 0);

  // Helper: Get Liquid Image Path (String)
  const getLiquidPath = (val, iced) => {
    const mode = iced ? 'ice' : 'hot';
    if (val >= 85) return IMAGE_PATHS.liquid[mode][100];
    if (val >= 65) return IMAGE_PATHS.liquid[mode][70];
    if (val >= 45) return IMAGE_PATHS.liquid[mode][57];
    return IMAGE_PATHS.liquid[mode].milk;
  };

  // Helper: Get Cup Image Path (String)
  const getCupPath = (iced) => {
    return iced ? IMAGE_PATHS.cup.ice : IMAGE_PATHS.cup.hot;
  };

  // Helper: Scale Calc
  const getScale = (sz) => {
    switch (sz) {
      case 'S': return 0.8;
      case 'M': return 0.9;
      case 'L': return 1.0;
      case 'XL': return 1.1;
      default: return 1.0;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#4E342E] to-[#3E2723] flex items-center justify-center p-4">
      {/* Kiosk Card Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* ① Image Area */}
        <div className="bg-gradient-to-b from-[#EFEBE9] to-[#D7CCC8] p-4 flex items-center justify-center h-64 relative">
          <div
            className="relative w-48 h-56 transition-transform duration-300"
            style={{ transform: `scale(${getScale(size)})` }}
          >
            <img src={getCupPath(isIced)} alt="Cup" className={`absolute inset-0 w-full h-full object-contain ${isIced ? 'z-10' : 'z-0'}`} />
            <img src={getLiquidPath(cacao, isIced)} alt="Liquid" className={`absolute inset-0 w-full h-full object-contain ${isIced ? 'z-0' : 'z-10'}`} />
            {hasTopping && <img src="/images/choco_t.png" alt="Topping" className="absolute inset-0 w-full h-full object-contain z-20" />}
          </div>
          <div className="absolute top-2 right-2 bg-white/80 px-2 py-1 rounded text-xs font-bold text-[#4E342E]">
            {isIced ? 'ICED' : 'HOT'} · {cacao < 45 ? 'MILK' : `${cacao}%`} · {size}
          </div>
        </div>

        {/* Controls Area */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">

          {/* ② Temperature Toggle */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">온도 선택</p>
            <div className="grid grid-cols-2 gap-0">
              <button
                onClick={() => setIsIced(false)}
                className={`py-3 text-sm font-bold rounded-l-lg border transition-all ${!isIced
                  ? 'bg-[#D84315] text-white border-[#D84315]'
                  : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                  }`}
              >
                🔥 HOT
              </button>
              <button
                onClick={() => setIsIced(true)}
                className={`py-3 text-sm font-bold rounded-r-lg border-t border-b border-r transition-all ${isIced
                  ? 'bg-[#1565C0] text-white border-[#1565C0]'
                  : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                  }`}
              >
                ❄️ ICED +1,000
              </button>
            </div>
          </div>

          {/* ③ Cacao Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-bold text-gray-500">카카오 농도</p>
              <span className="text-sm font-extrabold text-[#4E342E]">{cacao < 45 ? 'MILK' : `${cacao}%`}</span>
            </div>
            <input
              type="range"
              min="33"
              max="100"
              step="1"
              value={cacao}
              onChange={(e) => setCacao(Number(e.target.value))}
              className="w-full h-2 bg-gradient-to-r from-[#4E342E] to-[#FFCC80] rounded-full appearance-none cursor-pointer"
              dir="rtl"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>진함 100%</span>
              <span>부드러움 33%</span>
            </div>
          </div>

          {/* ④ Size Selector */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">사이즈</p>
            <div className="grid grid-cols-4 gap-0">
              {['S', 'M', 'L', 'XL'].map((s, idx) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`py-3 text-center border transition-all ${idx === 0 ? 'rounded-l-lg' : ''
                    } ${idx === 3 ? 'rounded-r-lg border-r' : 'border-r-0'
                    } ${size === s
                      ? 'bg-[#4E342E] text-white border-[#4E342E] z-10'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <div className="text-sm font-bold">{s}</div>
                  <div className="text-[10px] opacity-70">+{SIZE_ADDONS[s].toLocaleString()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ⑤ Topping Button */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">토핑 추가</p>
            <button
              onClick={() => setHasTopping(!hasTopping)}
              className={`w-full py-3 rounded-lg border-2 transition-all flex items-center justify-between px-4 ${hasTopping
                ? 'bg-[#4E342E] text-white border-[#4E342E]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-[#4E342E]'
                }`}
            >
              <span className="font-bold text-sm">🍫 초콜릿 토핑</span>
              <span className={`text-sm font-bold ${hasTopping ? 'text-[#FFCC80]' : 'text-[#D2691E]'}`}>+500원</span>
            </button>
          </div>

        </div>

        {/* ⑥ Bottom Fixed: Price + Add Button */}
        <div className="p-4 bg-gray-50 border-t space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">총 금액</span>
            <span className="text-2xl font-extrabold text-[#4E342E]">{totalPrice.toLocaleString()}원</span>
          </div>
          <button className="w-full py-4 bg-[#D84315] hover:bg-[#BF360C] text-white font-bold text-lg rounded-xl transition-colors shadow-lg">
            담기
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;
