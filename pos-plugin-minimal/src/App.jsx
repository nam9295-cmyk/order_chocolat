import { useMemo, useState } from 'react';

const ORDER_API_BASE = 'https://order.verygood-chocolate.com/api/orders';
const TARGET_PRODUCT_NAME = '커스텀 쇼콜라';

function getPosSdk() {
  return window?.TossPlacePOSPluginSDK ?? window?.TossPOSPluginSDK ?? null;
}

function normalizeName(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function pickFirstArray(source, paths) {
  for (const path of paths) {
    const value = path.split('.').reduce((acc, key) => acc?.[key], source);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function toOptionGroups(rawItem) {
  const groups = pickFirstArray(rawItem, [
    'optionGroups',
    'optionsGroups',
    'optionGroupList',
    'options',
    'data.optionGroups',
  ]);

  return groups.map((group) => {
    const options = pickFirstArray(group, [
      'options',
      'choices',
      'items',
      'optionList',
      'data.options',
    ]);

    return {
      id: group?.id ?? group?.groupId ?? group?.optionGroupId,
      name: group?.name ?? group?.title ?? group?.optionGroupName,
      options: options.map((option) => ({
        id: option?.id ?? option?.optionId ?? option?.choiceId,
        title: option?.title ?? option?.name ?? option?.optionName,
      })),
    };
  });
}

function normalizeCatalogItems(raw) {
  const items = Array.isArray(raw)
    ? raw
    : pickFirstArray(raw, [
      'items',
      'products',
      'catalog',
      'data.items',
      'data.products',
      'result.items',
      'result.products',
    ]);

  return items.map((item) => ({
    id: item?.id ?? item?.itemId ?? item?.productId,
    name: item?.name ?? item?.itemName ?? item?.productName,
    optionGroups: toOptionGroups(item),
  }));
}

async function fetchCatalogItems(sdk) {
  const calls = [
    () => sdk?.getCatalog?.(),
    () => sdk?.getMenu?.(),
    () => sdk?.catalog?.getCatalog?.(),
    () => sdk?.catalog?.getItems?.(),
    () => sdk?.catalog?.listItems?.(),
    () => sdk?.product?.list?.(),
  ];

  for (const call of calls) {
    try {
      const result = await call();
      const items = normalizeCatalogItems(result);
      if (items.length > 0) return items;
    } catch {
      // try next candidate
    }
  }

  throw new Error('카탈로그 조회 SDK 메서드를 찾지 못했습니다.');
}

function findProductByName(items, targetName) {
  const normalizedTarget = normalizeName(targetName);
  const exact = items.find((item) => normalizeName(item.name) === normalizedTarget);
  if (exact) return exact;

  const partial = items.find((item) => normalizeName(item.name).includes(normalizedTarget));
  if (partial) return partial;

  throw new Error(`상품명을 찾지 못했습니다: ${targetName}`);
}

function findGroupByKeyword(optionGroups, keyword) {
  const normalizedKeyword = normalizeName(keyword);
  return optionGroups.find((group) => normalizeName(group.name).includes(normalizedKeyword));
}

function optionTitles(options) {
  return options.map((option) => String(option.title ?? '')).filter(Boolean);
}

function matchOptionByExactOrIncludes(options, targets) {
  const normalizedTargets = targets.map((target) => normalizeName(target));

  for (const target of normalizedTargets) {
    const exact = options.find((option) => normalizeName(option.title) === target);
    if (exact) return exact;
  }

  for (const target of normalizedTargets) {
    const partial = options.find((option) => normalizeName(option.title).includes(target));
    if (partial) return partial;
  }

  return null;
}

function formatCacao(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return String(value ?? '-');
  if (num < 45) return 'MILK';
  if (num === 70) return '70.5%';
  if (num === 57) return '57.9%';
  if (num >= 85) return '100%';
  return `${num}%`;
}

function formatTime(value) {
  const t = Number(value);
  if (Number.isNaN(t)) return '-';
  return new Date(t).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

function buildPosLineItem(product, selection) {
  const optionIds = selection.filter(Boolean).map((x) => x.optionId);

  return {
    itemId: product.id,
    quantity: 1,
    optionIds,
    selectedOptionIds: optionIds,
    selectedOptions: selection,
  };
}

async function insertOrderToPos(sdk, lineItem, orderId) {
  if (!sdk?.order?.add) {
    throw new Error('posPluginSdk.order.add(orderDto)를 찾지 못했습니다.');
  }

  const orderDto = {
    externalOrderId: orderId,
    items: [lineItem],
  };

  return sdk.order.add(orderDto);
}

function resolveConcentrationAliases(cacaoValue) {
  const cacao = Number(cacaoValue);
  if (Number.isNaN(cacao) || cacao < 45) {
    return ['마일드milkchoc', 'milkchoc', '마일드'];
  }
  if (cacao >= 85 || cacao === 100) {
    return ['안달게cacao100%', 'cacao100', '100%'];
  }
  if (cacao >= 65 || cacao === 70) {
    return ['덜달게caca070.5%', '70.5', 'caca0', 'cacao70', 'cacao70.5'];
  }
  return ['기본cacao57.9%', '57.9'];
}

function debugFailure(groupName, targets, group) {
  const titles = group ? optionTitles(group.options).join(', ') : '(group not found)';
  return `${groupName} 매칭 실패 | 찾으려던 값: ${targets.join(' | ')} | 확인한 title: ${titles}`;
}

async function resolveProductAndOptions(sdk, order) {
  const items = await fetchCatalogItems(sdk);
  const product = findProductByName(items, TARGET_PRODUCT_NAME);

  const concentrationGroup = findGroupByKeyword(product.optionGroups, '농도');
  const temperatureGroup = findGroupByKeyword(product.optionGroups, '온도');
  const shotGroup = findGroupByKeyword(product.optionGroups, '샷');

  if (!concentrationGroup || !temperatureGroup || !shotGroup) {
    throw new Error('옵션 그룹(농도/온도/샷)을 찾지 못했습니다.');
  }

  const concentrationAliases = resolveConcentrationAliases(order?.cacao);
  const concentrationOption = matchOptionByExactOrIncludes(concentrationGroup.options, concentrationAliases);
  if (!concentrationOption) {
    throw new Error(debugFailure('농도', concentrationAliases, concentrationGroup));
  }

  const temperatureAliases = order?.isIced ? ['ICE'] : ['HOT'];
  const temperatureOption = matchOptionByExactOrIncludes(temperatureGroup.options, temperatureAliases);
  if (!temperatureOption) {
    throw new Error(debugFailure('온도', temperatureAliases, temperatureGroup));
  }

  let shotOption = null;
  if (Number(order?.shotCount) === 1) {
    const shotAliases = ['에스프레소 샷추가', '샷추가'];
    shotOption = matchOptionByExactOrIncludes(shotGroup.options, shotAliases);
    if (!shotOption) {
      throw new Error(debugFailure('샷', shotAliases, shotGroup));
    }
  } else {
    const shotDefaultAliases = ['기본', '없음'];
    shotOption = matchOptionByExactOrIncludes(shotGroup.options, shotDefaultAliases);
  }

  return {
    product,
    selection: [
      {
        optionGroupId: concentrationGroup.id,
        optionId: concentrationOption.id,
      },
      {
        optionGroupId: temperatureGroup.id,
        optionId: temperatureOption.id,
      },
      shotOption && {
        optionGroupId: shotGroup.id,
        optionId: shotOption.id,
      },
    ].filter(Boolean),
  };
}

export default function App() {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState('');
  const [order, setOrder] = useState(null);
  const [posMessage, setPosMessage] = useState('');
  const sdkReady = useMemo(() => Boolean(getPosSdk()), []);

  const handleLookup = async () => {
    const id = orderId.trim();
    if (!id) {
      window.alert('orderId를 입력하세요.');
      return;
    }

    setLoading(true);
    setLookupMessage('');
    setOrder(null);
    setPosMessage('');

    try {
      const response = await fetch(`${ORDER_API_BASE}/${encodeURIComponent(id)}`);
      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.status === 410 || data?.status === 'EXPIRED') {
        setLookupMessage('만료된 주문입니다.');
        return;
      }

      if (!response.ok) {
        setLookupMessage(data?.message || `조회 실패 (${response.status})`);
        return;
      }

      setOrder(data);
    } catch {
      setLookupMessage('네트워크 오류가 발생했습니다. 연결 상태를 확인하세요.');
    } finally {
      setLoading(false);
    }
  };

  const handlePushToPos = async () => {
    if (!order) {
      setPosMessage('먼저 주문 조회를 완료하세요.');
      return;
    }

    const sdk = getPosSdk();
    if (!sdk) {
      setPosMessage('POS SDK가 연결되지 않았습니다.');
      return;
    }

    setLoading(true);
    setPosMessage('');

    try {
      const resolved = await resolveProductAndOptions(sdk, order);
      const lineItem = buildPosLineItem(resolved.product, resolved.selection);
      await insertOrderToPos(sdk, lineItem, order.orderId);
      setPosMessage('POS에 커스텀 쇼콜라 1개를 담았습니다.');
    } catch (error) {
      setPosMessage(error instanceof Error ? error.message : 'POS 주문 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app">
      <section className="card">
        <h1>VERYGOOD QR ORDER</h1>
        <label htmlFor="order-id">orderId</label>
        <input
          id="order-id"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="예: VG-6F3K9P2Q"
        />
        <div className="buttons">
          <button type="button" onClick={handleLookup} disabled={loading}>
            {loading ? '조회 중...' : '주문 조회'}
          </button>
          <button type="button" onClick={handlePushToPos} disabled={loading}>
            {loading ? '처리 중...' : 'POS에 주문 넣기'}
          </button>
        </div>
        <p className="hint">SDK 상태: {sdkReady ? '연결됨' : '미연결(런타임 주입 대기)'}</p>
        {lookupMessage && <p className="message">{lookupMessage}</p>}
        {posMessage && <p className="message">{posMessage}</p>}
        {order && (
          <section className="receipt">
            <h2>주문 영수증</h2>
            <dl>
              <div>
                <dt>주문번호</dt>
                <dd>{order.orderId || '-'}</dd>
              </div>
              <div>
                <dt>농도</dt>
                <dd>{formatCacao(order.cacao)}</dd>
              </div>
              <div>
                <dt>온도</dt>
                <dd>{order.isIced ? 'ICED' : 'HOT'}</dd>
              </div>
              <div>
                <dt>샷</dt>
                <dd>{order.shotCount ?? 0}</dd>
              </div>
              <div>
                <dt>금액</dt>
                <dd>{Number(order.price || 0).toLocaleString()}원</dd>
              </div>
              <div>
                <dt>만료</dt>
                <dd>{formatTime(order.expiresAt)}</dd>
              </div>
              <div>
                <dt>상태</dt>
                <dd>{order.status || '-'}</dd>
              </div>
            </dl>
          </section>
        )}
      </section>
    </main>
  );
}
