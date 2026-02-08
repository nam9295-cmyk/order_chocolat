import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

function formatExpiresAt(expiresAt) {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

export default function OrderQr({ orderId, price, expiresAt }) {
  const expiresLabel = formatExpiresAt(expiresAt);

  return (
    <div className="font-mono text-black text-center space-y-2">
      <div className="text-xs tracking-wide">주문번호</div>
      <div className="text-lg font-bold tracking-widest">{orderId}</div>
      <div className="flex justify-center py-2">
        <div className="bg-white p-2 border border-black/20">
          <QRCodeCanvas value={String(orderId)} size={160} includeMargin={false} />
        </div>
      </div>
      <div className="text-xs tracking-wide">금액</div>
      <div className="text-base font-bold">{Number(price).toLocaleString()}원</div>
      <div className="text-[10px] opacity-70">10분 내 사용</div>
      {expiresLabel && (
        <div className="text-[10px] opacity-70">만료: {expiresLabel}</div>
      )}
    </div>
  );
}
