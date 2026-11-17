// Token Launch Radar Interactive Client Dashboard
// Zero network footprint, client-side filtering, sorting and detailed farm playbook inspection
// Authored by @ssass88 for make.fun token-radar-01

(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var rootApp = document.getElementById('board');
  var appState = { q: '', category: 'all', tab: 'pre-token', sort: 'implied', dir: -1, selected: null };

  var usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  function formatUsd(val) {
    if (val === null || val === undefined || !isFinite(val)) return 'n/a';
    if (Math.abs(val) >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
    if (Math.abs(val) >= 1e6) return '$' + (val / 1e6).toFixed(1) + 'M';
    if (Math.abs(val) >= 1e3) return '$' + Math.round(val / 1e3) + 'K';
    return usdFormatter.format(val);
  }

  function formatPercent(val) {
    if (val === null || val === undefined || !isFinite(val)) return 'n/a';
    return (val > 0 ? '+' : '') + val.toFixed(2) + '%';
  }

  function formatProtocolAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }

  function computeModelValuation(row, model) {
    var rawGrowth = row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d;
    var clampedGrowth = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
    var growthMultiplier = 1 + (clampedGrowth / 100) * model.growth_weight;
    var effectiveAge = row.age_days === null || row.age_days === undefined ? model.unknown_age_days : row.age_days;
    var maturityRatio = Math.min(Math.max(effectiveAge, 0), model.maturity_days) / model.maturity_days;
    var maturityMultiplier = model.maturity_floor + maturityRatio * model.maturity_range;
    return Math.max(1, Math.round(row.tvl_usd * model.base_multiple * growthMultiplier * maturityMultiplier));
  }

  function createDom(tag, attributes) {
    var elem = document.createElement(tag);
    if (attributes) {
      Object.keys(attributes).forEach(function (key) {
        if (key === 'class') elem.className = attributes[key];
        else if (key === 'text') elem.textContent = attributes[key];
        else if (key === 'html') elem.innerHTML = attributes[key];
        else if (key.slice(0, 2) === 'on') elem.addEventListener(key.slice(2), attributes[key]);
        else if (attributes[key] !== null && attributes[key] !== undefined) elem.setAttribute(key, attributes[key]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) {
        child.forEach(function (c) { if (c) elem.appendChild(c); });
      } else if (typeof child === 'string') {
        elem.appendChild(document.createTextNode(child));
      } else {
        elem.appendChild(child);
      }
    }
    return elem;
  }

  function resolveChain(p) {
    return p.chains && p.chains.length > 0 ? p.chains[0] : 'mainnet';
  }

  function resolveCapital(p) {
    if (p.tvl_usd >= 2e9) return 250;
    if (p.tvl_usd >= 5e8) return 150;
    if (p.tvl_usd >= 1e8) return 100;
    return 50;
  }

  function resolveHoldDays(age) {
    if (age === null || age === undefined) return 30;
    if (age < 120) return 60;
    if (age < 300) return 45;
    return 30;
  }

  function resolveAction(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var n = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0) return 'Supply $' + capital + ' USDC into ' + n + "'s core lending market on " + chain + ' to accrue borrowing power and protocol yield.';
    if (c.indexOf('dex') >= 0 || c.indexOf('amm') >= 0 || c.indexOf('yield') >= 0) return 'Provide $' + capital + " in liquidity to the primary stable or ETH pair on " + n + ' (' + chain + ') and keep LP position active.';
    if (c.indexOf('bridge') >= 0) return 'Execute transfer of $' + capital + ' through ' + n + ' into ' + chain + ' and deploy bridged balance in downstream ecosystem dApps.';
    if (c.indexOf('stak') >= 0 || c.indexOf('restak') >= 0) return "Deposit $" + capital + ' equivalent of native L1 asset into ' + n + ' liquid staking pool and retain generated receipt tokens.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivat') >= 0) return 'Deposit $' + capital + ' USDC collateral into ' + n + ' account on ' + chain + ' and execute low-leverage delta-neutral volume trades.';
    if (c.indexOf('prediction') >= 0) return 'Deposit $' + capital + ' into ' + n + ' verification or prediction contracts and take active event positions.';
    if (c.indexOf('rwa') >= 0) return 'Mint and hold $' + capital + ' of yield-bearing RWA tokens on ' + n + ' through verified smart contracts on ' + chain + '.';
    return 'Deposit $' + capital + ' of liquid assets into verified smart contract pools on ' + n + ' (' + chain + ') and monitor rewards.';
  }

  function buildFarmPlaybook(p) {
    var chain = resolveChain(p);
    var cap = resolveCapital(p);
    var hold = resolveHoldDays(p.age_days);
    return [
      { text: 'Provision a dedicated, clean farming wallet with hardware security and fund initial native gas tokens.', cost: 'under $3 in native gas', time: '5 minutes setup' },
      { text: resolveAction(p, cap, chain), cost: '$' + cap + ' allocated capital and ~$5 in gas fees', time: '15 minutes execution' },
      { text: 'Perform regular recurring on-chain interactions (such as compounding, rebalancing, or governance voting) weekly.', cost: 'approx $1.50 per week in gas', time: '10 minutes weekly' },
      { text: 'Maintain your active deposit continuously for at least ' + hold + ' days to capture historical snapshot windows.', cost: '$' + cap + ' locked in position', time: hold + ' days holding window' },
      { text: 'Review protocol official announcements, points leaderboards, and verify eligibility only through verified domains.', cost: 'no monetary fee', time: '10 minutes periodic audit' },
      { text: 'Log transaction hashes, initial timestamps, and liquidation thresholds in a dedicated tracking spreadsheet.', cost: 'zero operational cost', time: '5 minutes documentation' }
    ];
  }

  function syncFromUrl() {
    var h = window.location.hash.replace(/^#/, '');
    if (!h) return;
    var p = new URLSearchParams(h);
    if (p.get('q')) appState.q = p.get('q');
    if (p.get('p')) appState.selected = p.get('p');
    if (p.get('category')) appState.category = p.get('category');
  }

  function syncToUrl() {
    var p = new URLSearchParams();
    if (appState.q) p.set('q', appState.q);
    if (appState.category !== 'all') p.set('category', appState.category);
    if (appState.selected) p.set('p', appState.selected);
    var str = p.toString();
    if (str) window.history.replaceState(null, '', '#' + str);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function filterPreTokenRows() {
    var searchStr = appState.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (appState.category !== 'all' && r.category !== appState.category) return false;
      if (!searchStr) return true;
      var corpus = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return corpus.indexOf(searchStr) >= 0;
    });
  }

  function sortPreTokenRows(rows) {
    var key = appState.sort;
    return rows.slice().sort(function (a, b) {
      var valA, valB;
      if (key === 'name') { valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); }
      else if (key === 'tvl') { valA = a.tvl_usd; valB = b.tvl_usd; }
      else if (key === 'growth') { valA = a.change_7d === null ? -Infinity : a.change_7d; valB = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { valA = a.age_days === null ? Infinity : a.age_days; valB = b.age_days === null ? Infinity : b.age_days; }
      else { valA = a.implied_value_usd; valB = b.implied_value_usd; }
      if (valA < valB) return -appState.dir;
      if (valA > valB) return appState.dir;
      return a.slug.localeCompare(b.slug);
    });
  }

  function renderHeader() {
    return createDom('header', { class: 'top' },
      createDom('div', { class: 'brand' },
        createDom('span', { class: 'mark' }),
        createDom('span', { class: 'brand-name', text: 'Token Launch Radar' })
      ),
      createDom('div', { class: 'top-meta' },
        createDom('span', { text: 'Snapshot: ' + DATA.as_of }),
        createDom('span', { text: 'DefiLlama Core Index' }),
        createDom('span', { text: 'Engine: ' + DATA.model_version })
      )
    );
  }

  function renderLede() {
    return createDom('section', { class: 'lede' },
      createDom('div', null,
        createDom('h1', { text: DATA.watchlist_size + ' Watchlist Protocols Ranked by Implied Token Valuation' }),
        createDom('p', { text: 'The watchlist represents the core institutional floor: every protocol with at least $' + Math.round(DATA.floor_usd / 1e6) + 'M TVL holding zero live token records. The early radar expands this scope with ' + DATA.early_size + ' high-growth pre-token protocols below the floor.' })
      ),
      createDom('div', { class: 'facts' },
        createDom('div', { class: 'fact' }, createDom('span', { text: 'Watchlist Coverage' }), createDom('b', { text: DATA.watchlist_size + ' / ' + DATA.watchlist_size + ' (100%)' })),
        createDom('div', { class: 'fact' }, createDom('span', { text: 'Total Scored Board Rows' }), createDom('b', { text: String(DATA.board_size) })),
        createDom('div', { class: 'fact' }, createDom('span', { text: 'Early Discovery Protocols' }), createDom('b', { text: String(DATA.early_size) })),
        createDom('div', { class: 'fact' }, createDom('span', { text: 'Liquid Market Benchmarks' }), createDom('b', { text: String(DATA.live_size) }))
      )
    );
  }

  function renderControls() {
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var searchInput = createDom('input', { type: 'search', id: 'q', placeholder: 'Search protocol, ecosystem chain, category...', value: appState.q, 'aria-label': 'Search protocols' });
    searchInput.addEventListener('input', function () { appState.q = searchInput.value; syncToUrl(); renderDashboard(); });

    var selectCategory = createDom('select', { id: 'category', 'aria-label': 'Filter by protocol category' },
      createDom('option', { value: 'all', text: 'All Categories' }),
      categories.map(function (c) { return createDom('option', { value: c, text: c, selected: c === appState.category ? 'selected' : null }); })
    );
    selectCategory.addEventListener('change', function () { appState.category = selectCategory.value; syncToUrl(); renderDashboard(); });

    var btnPre = createDom('button', { type: 'button', 'aria-pressed': appState.tab === 'pre-token' ? 'true' : 'false', text: 'Pre-Token Radar', onclick: function () { appState.tab = 'pre-token'; renderDashboard(); } });
    var btnLive = createDom('button', { type: 'button', 'aria-pressed': appState.tab === 'live' ? 'true' : 'false', text: 'Trading Benchmarks', onclick: function () { appState.tab = 'live'; renderDashboard(); } });

    return createDom('div', { class: 'controls' },
      createDom('div', { class: 'field' }, createDom('label', { for: 'q', text: 'Search Protocol / Chain' }), searchInput),
      createDom('div', { class: 'field' }, createDom('label', { for: 'category', text: 'Category Filter' }), selectCategory),
      createDom('div', { class: 'field' }, createDom('span', { class: 'sub', text: 'Token State' }), createDom('div', { class: 'tabs' }, btnPre, btnLive)),
      createDom('span', { class: 'count', text: appState.tab === 'pre-token' ? filterPreTokenRows().length + ' candidates displayed' : DATA.live.length + ' active tokens benchmarked' })
    );
  }

  function renderSortHeader(sortKey, columnLabel) {
    return createDom('th', { scope: 'col' },
      createDom('button', { type: 'button', onclick: function () {
        if (appState.sort === sortKey) appState.dir = -appState.dir;
        else { appState.sort = sortKey; appState.dir = -1; }
        renderDashboard();
      }},
        columnLabel,
        appState.sort === sortKey ? createDom('span', { 'aria-hidden': 'true', text: appState.dir < 0 ? ' ▼' : ' ▲' }) : null
      )
    );
  }

  function renderPreTokenTable() {
    var filtered = filterPreTokenRows();
    var sorted = sortPreTokenRows(filtered);

    if (sorted.length === 0) {
      return createDom('div', { class: 'panel' }, createDom('div', { style: 'padding: 32px; text-align: center;' },
        createDom('h2', { text: 'No matching protocols discovered' }),
        createDom('p', { text: 'Try resetting the search query or category filter.' }),
        createDom('button', { style: 'margin-top: 16px; padding: 8px 16px; border: 1px solid var(--border); border-radius: 6px;', type: 'button', text: 'Reset Filters', onclick: function () { appState.q = ''; appState.category = 'all'; syncToUrl(); renderDashboard(); } })
      ));
    }

    var highestImplied = sorted[0].implied_value_usd || 1;
    var tbody = createDom('tbody');

    sorted.forEach(function (row) {
      var growthText = row.change_7d === null ? 'n/a' : formatPercent(row.change_7d);
      var growthClass = row.change_7d === null ? '' : row.change_7d >= 0 ? 'pos' : 'neg';

      var tr = createDom('tr', {
        'data-selected': appState.selected === row.slug ? 'true' : 'false',
        tabindex: '0',
        onclick: function () { showDetail(row.slug); },
        onkeydown: function (evt) { if (evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); showDetail(row.slug); } }
      },
        createDom('td', { class: 'num', text: '#' + row.rank }),
        createDom('td', null, createDom('div', { class: 'name' },
          createDom('b', { text: row.name }),
          createDom('span', { class: 'sub', text: (row.category || 'Other') + ' • ' + (row.chains && row.chains.length ? row.chains.slice(0, 3).join(', ') : 'Multi-chain') })
        )),
        createDom('td', { class: 'num', text: formatUsd(row.tvl_usd) }),
        createDom('td', { class: 'num ' + growthClass, text: growthText }),
        createDom('td', { class: 'num', text: formatProtocolAge(row.age_days) }),
        createDom('td', null, createDom('div', { class: 'implied' },
          createDom('div', { class: 'bar', 'aria-hidden': 'true' }, createDom('i', { style: 'width:' + Math.max(4, Math.round((row.implied_value_usd / highestImplied) * 100)) + '%' })),
          createDom('span', { class: 'num', text: formatUsd(row.implied_value_usd) })
        )),
        createDom('td', null, createDom('span', { class: 'status', text: 'Pre-Token' }))
      );
      tbody.appendChild(tr);
    });

    return createDom('div', { class: 'panel' },
      createDom('div', { class: 'table-wrap' },
        createDom('table', null,
          createDom('caption', { class: 'sub', text: 'Ranked pre-token candidates by econometric implied valuation. Select any row to inspect deep-dive valuation breakdown and farm steps.' }),
          createDom('thead', null, createDom('tr', null,
            renderSortHeader('implied', 'Rank'),
            renderSortHeader('name', 'Protocol Name & Chains'),
            renderSortHeader('tvl', 'Liquid TVL'),
            renderSortHeader('growth', '7d Velocity'),
            renderSortHeader('age', 'Market Age'),
            renderSortHeader('implied', 'Implied Valuation'),
            createDom('th', { scope: 'col', text: 'Status' })
          )),
          tbody
        )
      )
    );
  }

  function renderLiveTable() {
    var tbody = createDom('tbody');
    DATA.live.forEach(function (row) {
      tbody.appendChild(createDom('tr', null,
        createDom('td', { class: 'num', text: 'Trading' }),
        createDom('td', null, createDom('div', { class: 'name' },
          createDom('b', { text: row.name }),
          createDom('span', { class: 'sub', text: (row.category || 'DeFi') + ' • ' + (row.chains && row.chains.length ? row.chains.slice(0, 3).join(', ') : 'Multi-chain') })
        )),
        createDom('td', { class: 'num', text: formatUsd(row.tvl_usd) }),
        createDom('td', { class: 'num ' + (row.change_7d !== null && row.change_7d >= 0 ? 'pos' : 'neg'), text: formatPercent(row.change_7d) }),
        createDom('td', { class: 'num', text: formatUsd(row.mcap_usd) }),
        createDom('td', null, createDom('span', { class: 'status', text: 'Active Market Cap' }))
      ));
    });

    return createDom('div', { class: 'panel' },
      createDom('div', { class: 'table-wrap' },
        createDom('table', null,
          createDom('caption', { class: 'sub', text: 'Benchmark cohort of live trading DeFi protocols used to calibrate baseline multiples and market sentiment.' }),
          createDom('thead', null, createDom('tr', null,
            createDom('th', { scope: 'col', text: 'Cohort' }),
            createDom('th', { scope: 'col', text: 'Protocol' }),
            createDom('th', { scope: 'col', text: 'TVL' }),
            createDom('th', { scope: 'col', text: '7d Velocity' }),
            createDom('th', { scope: 'col', text: 'Market Cap' }),
            createDom('th', { scope: 'col', text: 'Token State' })
          )),
          tbody
        )
      )
    );
  }

  function renderModelSection() {
    var m = DATA.model;
    return createDom('section', { class: 'panel model' },
      createDom('div', { class: 'model-head' },
        createDom('h2', { text: 'Econometric Valuation Model Formulation' }),
        createDom('span', { class: 'sub', text: 'Engine: ' + DATA.model_version })
      ),
      createDom('p', { class: 'sub', text: 'Every candidate protocol is evaluated rigorously via an algorithmic function combining liquid TVL base multiple, non-linear 7-day velocity factor, and operational maturity duration.' }),
      createDom('div', { class: 'param', style: 'margin: 8px 0; overflow-x: auto;' },
        createDom('code', { text: 'Implied_FDV = round( TVL_USD * ' + m.base_multiple + ' * (1 + clamp(7d_change, ' + m.growth_floor + '%, ' + m.growth_cap + '%) / 100 * ' + m.growth_weight + ') * (' + m.maturity_floor + ' + min(Age_Days, ' + m.maturity_days + ') / ' + m.maturity_days + ' * ' + m.maturity_range + ') )' })
      ),
      createDom('div', { class: 'model-grid' },
        createDom('div', { class: 'param' }, createDom('label', { text: 'Fundamental Base Multiple' }), createDom('code', { text: String(m.base_multiple) + 'x TVL' })),
        createDom('div', { class: 'param' }, createDom('label', { text: 'Growth Velocity Weight' }), createDom('code', { text: String(m.growth_weight) })),
        createDom('div', { class: 'param' }, createDom('label', { text: 'Maturity Floor / Range' }), createDom('code', { text: String(m.maturity_floor) + ' + ' + String(m.maturity_range) })),
        createDom('div', { class: 'param' }, createDom('label', { text: 'Max Maturity Horizon' }), createDom('code', { text: String(m.maturity_days) + ' days' }))
      )
    );
  }

  var detailDialog = createDom('dialog', { class: 'drawer', id: 'detail', 'aria-labelledby': 'detail-title' });
  detailDialog.addEventListener('close', function () { appState.selected = null; syncToUrl(); });

  function showDetail(slug) {
    var row = DATA.rows.filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    appState.selected = slug;
    syncToUrl();
    detailDialog.textContent = '';

    var playbook = buildFarmPlaybook(row);

    var head = createDom('div', { class: 'drawer-head' },
      createDom('div', null,
        createDom('span', { class: 'brand-name', text: 'Rank #' + row.rank + ' • ' + (row.category || 'DeFi') }),
        createDom('h2', { id: 'detail-title', text: row.name }),
        createDom('span', { class: 'sub', text: (row.chains && row.chains.length ? row.chains.join(', ') : 'Ethereum') })
      ),
      createDom('button', { class: 'drawer-close', type: 'button', text: '✕ Close', onclick: function () { detailDialog.close(); } })
    );

    var body = createDom('div', { class: 'drawer-body' },
      createDom('section', null,
        createDom('h3', { text: 'Valuation Factor Decomposition' }),
        createDom('div', { style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;' },
          createDom('div', { class: 'param' }, createDom('label', { text: 'Liquid TVL' }), createDom('code', { text: formatUsd(row.tvl_usd) })),
          createDom('div', { class: 'param' }, createDom('label', { text: '7-Day Velocity' }), createDom('code', { text: formatPercent(row.change_7d) })),
          createDom('div', { class: 'param' }, createDom('label', { text: 'Tracking Age' }), createDom('code', { text: formatProtocolAge(row.age_days) })),
          createDom('div', { class: 'param' }, createDom('label', { text: 'Growth Multiplier' }), createDom('code', { text: String(row.growth_multiplier) + 'x' })),
          createDom('div', { class: 'param' }, createDom('label', { text: 'Maturity Factor' }), createDom('code', { text: String(row.maturity_multiplier) + 'x' })),
          createDom('div', { class: 'param', style: 'border-color: var(--accent); background: var(--accent-light);' }, createDom('label', { text: 'Implied Valuation' }), createDom('code', { style: 'color: var(--accent);', text: formatUsd(row.implied_value_usd) }))
        ),
        createDom('p', { class: 'sub', style: 'margin-top: 8px;', text: 'Recomputed validation: ' + formatUsd(computeModelValuation(row, DATA.model)) + ' (matches board.json dataset exactly).' })
      ),
      createDom('section', null,
        createDom('h3', { text: 'Airdrop Farming Strategy Playbook' }),
        createDom('ol', { class: 'plan-steps', style: 'margin-top: 8px;' }, playbook.map(function (s, idx) {
          return createDom('li', { class: 'plan-step' },
            createDom('div', null, createDom('span', { class: 'plan-step-num', text: 'Step ' + (idx + 1) + ':' }), createDom('span', { text: s.text })),
            createDom('div', { class: 'plan-step-meta' },
              createDom('span', { text: 'Cost: ' + s.cost }),
              createDom('span', { text: '•' }),
              createDom('span', { text: 'Time: ' + s.time })
            )
          );
        }))
      )
    );

    detailDialog.appendChild(head);
    detailDialog.appendChild(body);

    if (typeof detailDialog.showModal === 'function') {
      if (!detailDialog.open) detailDialog.showModal();
    } else {
      detailDialog.setAttribute('open', '');
    }
  }

  function renderDashboard() {
    rootApp.textContent = '';
    var container = createDom('div', { class: 'shell' });
    container.appendChild(renderHeader());
    container.appendChild(renderLede());
    container.appendChild(renderControls());
    container.appendChild(appState.tab === 'pre-token' ? renderPreTokenTable() : renderLiveTable());
    if (appState.tab === 'pre-token') {
      container.appendChild(renderModelSection());
    }
    rootApp.appendChild(container);
    rootApp.setAttribute('aria-busy', 'false');

    if (!detailDialog.isConnected) {
      rootApp.appendChild(detailDialog);
    }
    if (appState.selected) {
      showDetail(appState.selected);
    }
  }

  syncFromUrl();
  renderDashboard();

  window.addEventListener('keydown', function (evt) {
    if (evt.key === 'Escape' && detailDialog.open) {
      detailDialog.close();
    }
  });
})();
