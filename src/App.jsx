import React, { useState } from 'react';
import OrderQr from './components/OrderQr.jsx';
import { createOrder } from './api/orders.js';

// Pricing Constants
const BASE_PRICES = {
  100: 8300,  // 85+ treated as 100
  70: 7300,   // 70 treated as 70.5
  57: 6800,   // 57 treated as 57.9
  milk: 6800, // <45 treated as MILK
};

const ICE_ADDON = 700;
const SHOT_ADDON = 500;
const TOPPING_ADDON = 0;

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
  const [shotCount, setShotCount] = useState(0);
  const [hasTopping, setHasTopping] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const getCacaoPrice = (val) => {
    if (val >= 85) return BASE_PRICES[100];
    if (val >= 65) return BASE_PRICES[70];
    if (val >= 45) return BASE_PRICES[57];
    return BASE_PRICES.milk;
  };

  const getCacaoLabel = (val) => {
    if (val >= 85) return '100%';
    if (val >= 65) return val === 70 ? '70.5%' : `${val}%`;
    if (val >= 45) return val === 57 ? '57.9%' : `${val}%`;
    return 'MILK';
  };

  // Helper: Total Price Calc
  const totalPrice =
    getCacaoPrice(cacao) +
    (isIced ? ICE_ADDON : 0) +
    (shotCount * SHOT_ADDON) +
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

  const getScale = () => 1.2;

  // Helper: Get order text for clipboard
  const getOrderText = () => {
    const temp = isIced ? 'ICED' : 'HOT';
    const concentration = cacao < 45 ? 'MILK' : `카카오 ${getCacaoLabel(cacao)}`;
    const shotText = shotCount > 0 ? ` / 샷 ${shotCount}` : '';
    const toppingText = hasTopping ? ' / 토핑추가' : '';
    return `[베리굿 주문] ${temp} / ${concentration}${shotText}${toppingText} - 총 ${totalPrice.toLocaleString()}원`;
  };

  // Handle copy to clipboard
  const handleCopyOrder = async () => {
    try {
      await navigator.clipboard.writeText(getOrderText());
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      alert('복사에 실패했습니다.');
    }
  };

  const handleCreateQr = async () => {
    if (isCreating) return;
    if (orderResult) {
      const confirmed = window.confirm('정말 다시 생성하시겠습니까?');
      if (!confirmed) return;
    }
    setIsCreating(true);
    setCreateError('');
    try {
      const result = await createOrder({ cacao, isIced, shotCount, hasTopping });
      setOrderResult(result);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'QR 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenModal = () => {
    setOrderResult(null);
    setCreateError('');
    setIsCreating(false);
    setShowModal(true);
    handleCreateQr();
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setOrderResult(null);
    setCreateError('');
    setIsCreating(false);
  };

  return (
    <div className="min-h-screen bg-[#edc5c4] flex items-center justify-center p-4">
      {/* Kiosk Card Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col" style={{ maxHeight: '95vh' }}>

        {/* ① Image Area */}
        <div className="bg-gradient-to-b from-[#EFEBE9] to-[#D7CCC8] p-4 flex items-center justify-center h-64 relative">
          <div
            className="relative w-48 h-56 transition-transform duration-300"
            style={{ transform: `scale(${getScale()})` }}
          >
            <img src={getCupPath(isIced)} alt="Cup" className={`absolute inset-0 w-full h-full object-contain ${isIced ? 'z-10' : 'z-0'}`} />
            <img src={getLiquidPath(cacao, isIced)} alt="Liquid" className={`absolute inset-0 w-full h-full object-contain ${isIced ? 'z-0' : 'z-10'}`} />
            {hasTopping && <img src="/images/choco_t.png" alt="Topping" className="absolute inset-0 w-full h-full object-contain z-20" />}
          </div>
          <div className="absolute top-2 right-2 bg-white/80 px-2 py-1 rounded text-xs font-bold text-[#4E342E]">
            {isIced ? 'ICED' : 'HOT'} · {getCacaoLabel(cacao)} · SHOT {shotCount}
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
                ❄️ ICED +700
              </button>
            </div>
          </div>

          {/* ③ Cacao Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-bold text-gray-500">카카오 농도</p>
              <span className="text-sm font-extrabold text-[#4E342E]">{getCacaoLabel(cacao)}</span>
            </div>

            {/* Slider with Tick Marks */}
            <div className="relative pb-6">
              <input
                type="range"
                min="33"
                max="100"
                step="1"
                value={cacao}
                onChange={(e) => {
                  let val = Number(e.target.value);
                  // Magnetic snap: 70 (70.5%) and 57 (57.9%)
                  if (val >= 68 && val <= 72) val = 70;
                  else if (val >= 55 && val <= 59) val = 57;
                  setCacao(val);
                }}
                className="w-full h-2 bg-gradient-to-r from-[#4E342E] to-[#FFCC80] rounded-full appearance-none cursor-pointer relative z-10"
                dir="rtl"
              />

              {/* Tick marks - below slider, pointing down */}
              <div className="absolute top-2 left-0 right-0 pointer-events-none">
                {/* 70% tick → position: (100-70)/(100-33) = 44.78% */}
                <div className="absolute flex flex-col items-center" style={{ left: '44.78%', transform: 'translateX(-50%)' }}>
                  <div className="w-px h-3 bg-black/70"></div>
                  <span className="text-[9px] font-medium text-gray-600 mt-0.5">70.5%</span>
                </div>
                {/* 57% tick → position: (100-57)/(100-33) = 64.18% */}
                <div className="absolute flex flex-col items-center" style={{ left: '64.18%', transform: 'translateX(-50%)' }}>
                  <div className="w-px h-3 bg-black/70"></div>
                  <span className="text-[9px] font-medium text-gray-600 mt-0.5">57.9%</span>
                </div>
              </div>

              {/* Edge labels */}
              <div className="absolute top-5 left-0 right-0 flex justify-between text-[9px] text-gray-400">
                <span>100%</span>
                <span>33%</span>
              </div>
            </div>
          </div>

          {/* ④ Topping Button */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">토핑 추가</p>
            <button
              onClick={() => setHasTopping(!hasTopping)}
              className={`w-full py-3 rounded-lg border-2 transition-all flex items-center justify-between px-4 ${hasTopping
                ? 'bg-[#4E342E] text-white border-[#4E342E]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-[#4E342E]'
                }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">🍫 초콜릿 토핑</span>
                <span className="bg-[#D84315] text-white text-[10px] px-1.5 py-0.5 rounded font-bold">추천</span>
              </div>
              <span className={`text-sm font-bold ${hasTopping ? 'text-[#FFCC80]' : 'text-green-600'}`}>FREE</span>
            </button>
          </div>

          {/* ⑤ Shot Toggle */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">샷 추가</p>
            <button
              onClick={() => setShotCount(shotCount === 0 ? 1 : 0)}
              className={`w-full py-3 rounded-lg border-2 transition-all flex items-center justify-between px-4 ${shotCount === 1
                ? 'bg-[#4E342E] text-white border-[#4E342E]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-[#4E342E]'
                }`}
            >
              <span className="font-bold text-sm">샷 추가 +500</span>
              <span className={`text-sm font-bold ${shotCount === 1 ? 'text-[#FFCC80]' : 'text-gray-500'}`}>
                {shotCount === 1 ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

        </div>

        {/* ⑥ Bottom Fixed: Price + Add Button */}
        <div className="p-4 bg-gray-50 border-t space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">총 금액</span>
            <span className="text-2xl font-extrabold text-[#4E342E]">{totalPrice.toLocaleString()}원</span>
          </div>
          <button
            onClick={handleOpenModal}
            className="w-full py-4 bg-[#D84315] hover:bg-[#BF360C] text-white font-bold text-lg rounded-xl transition-colors shadow-lg"
          >
            담기
          </button>
        </div>

        {/* Order Confirmation Modal - Receipt Style */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-start z-50 p-4 overflow-y-auto">
            {/* Receipt Paper */}
            <div className="relative w-full max-w-xs drop-shadow-2xl my-4">

              {/* Receipt Body with zigzag edges via CSS */}
              <div className="receipt-box px-6 py-6 font-mono text-black max-h-[70vh] overflow-y-auto">

                {/* Logo */}
                <div className="text-center mb-4">
                  <h1 className="text-2xl font-black tracking-tighter leading-none">VERY GOOD</h1>
                  <h2 className="text-lg font-bold tracking-tight">CHOCOLATE</h2>
                </div>

                {/* Dashed Divider */}
                <div className="border-t-2 border-dashed border-black my-3"></div>

                {/* Order Info */}
                <div className="text-xs text-center mb-3">
                  <p>주문 내역 확인</p>
                  <p className="text-[10px] opacity-60">{new Date().toLocaleString('ko-KR')}</p>
                </div>

                {/* Dashed Divider */}
                <div className="border-t-2 border-dashed border-black my-3"></div>

                {/* Items */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>온도</span>
                    <span className="font-bold">{isIced ? 'ICED' : 'HOT'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>카카오</span>
                    <span className="font-bold">{getCacaoLabel(cacao)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>샷</span>
                    <span className="font-bold">{shotCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>토핑</span>
                    <span className="font-bold">{hasTopping ? 'O' : 'X'}</span>
                  </div>
                </div>

                {/* Dashed Divider */}
                <div className="border-t-2 border-dashed border-black my-3"></div>

                {/* Total */}
                <div className="flex justify-between items-center text-lg font-black">
                  <span>TOTAL</span>
                  <span>{totalPrice.toLocaleString()}원</span>
                </div>

                {/* Dashed Divider */}
                <div className="border-t-2 border-dashed border-black my-3"></div>

                {/* Message */}
                <p className="text-center text-[10px] opacity-60 mb-4">
                  직원에게 이 화면을 보여주세요
                </p>

                {createError && (
                  <p className="text-center text-xs text-red-600 mb-2">{createError}</p>
                )}

                {orderResult ? (
                  <OrderQr
                    orderId={orderResult.orderId}
                    price={orderResult.price}
                    expiresAt={orderResult.expiresAt}
                  />
                ) : (
                  <>
                    {/* Fake Barcode */}
                    <div className="flex justify-center items-end gap-[1px] h-8 mb-2">
                      {[2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2, 3, 1, 2, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 2].map((w, i) => (
                        <div
                          key={i}
                          className="bg-black"
                          style={{ width: `${w}px`, height: `${12 + (i % 3) * 4}px` }}
                        />
                      ))}
                    </div>
                    <p className="text-center text-[8px] font-bold tracking-widest">
                      {String(Date.now()).slice(-12)}
                    </p>
                  </>
                )}

              </div>
            </div>

            {/* Buttons Outside Receipt */}
            <div className="flex gap-3 mt-4 w-full max-w-xs">
              <button
                onClick={handleCopyOrder}
                className="flex-1 py-3 bg-white text-black font-mono font-bold text-sm rounded-lg hover:bg-gray-100 transition-colors"
              >
                📋 복사
              </button>
              <button
                onClick={handleCreateQr}
                disabled={isCreating}
                className={`flex-1 py-3 font-mono font-bold text-sm rounded-lg transition-colors ${
                  isCreating
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-[#D84315] text-white hover:bg-[#BF360C]'
                }`}
              >
                {isCreating ? '생성 중…' : 'QR 생성'}
              </button>
              <button
                onClick={handleCloseModal}
                className="flex-1 py-3 bg-black text-white font-mono font-bold text-sm rounded-lg hover:bg-gray-800 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-[#4E342E] text-white px-6 py-3 rounded-full shadow-lg z-50 animate-bounce">
            ✅ 복사되었습니다!
          </div>
        )}
      </div>

    </div>
  );
}

export default App;
