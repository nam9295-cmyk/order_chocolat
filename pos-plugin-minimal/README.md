# VERYGOOD QR ORDER - TossPlace POS Plugin Minimal

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Build + ZIP
```bash
npm run zip
```

ZIP output path:
- `release/verygood-qr-order-plugin.zip`

## Notes
- Runtime SDK global is read as:
  - `window.TossPlacePOSPluginSDK`
  - `window.TossPOSPluginSDK`
- If SDK is not injected, buttons show fallback alerts.
- `주문 조회` 버튼은 외부 API를 호출합니다:
  - `https://order.verygood-chocolate.com/api/orders/:orderId`

## ACL
- 외부 호출 허용(ACL) 도메인에 아래를 등록하세요:
  - `https://order.verygood-chocolate.com`
