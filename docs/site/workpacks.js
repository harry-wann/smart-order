(() => {
  const data = window.WORKPACKS
  const $ = (selector, root = document) => root.querySelector(selector)
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]
  const state = { selected: { kind: 'overview' }, filter: 'all', query: '' }
  let previewObserver = null
  let thumbnailObserver = null
  const root = $('#detailContent')
  const tree = $('#treePeople')
  const search = $('#treeSearch')
  const packages = data.packages
  const colorFor = (id) => packages.find((p) => p.id === id)?.color || '#596579'
  const safe = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
  const repoLink = (path) => `../../${path}`

  function pageCount(pack) { return pack.features.reduce((count, feature) => count + feature.pages.length, 0) }
  function pagesOf(pack) { return pack.features.flatMap((feature, featureIndex) => feature.pages.map((screen) => ({ ...screen, feature, featureIndex, pack }))) }
  function ownerInitial(owner) { return owner.replace(/[^A-Za-z一-鿿]/g, '').slice(0, 1) || '鍋' }

  function renderFilters() {
    const filters = $('#filters')
    filters.innerHTML = `<button class="filter-chip ${state.filter === 'all' ? 'active' : ''}" data-filter="all" type="button">全部</button>` +
      packages.map((pack) => `<button class="filter-chip ${state.filter === pack.id ? 'active' : ''}" data-filter="${pack.id}" type="button">${pack.id} ${safe(pack.owner.split(' ')[0])}</button>`).join('') +
      `<button class="filter-chip ${state.filter === 'L0' ? 'active' : ''}" data-filter="L0" type="button">L0</button>`
  }

  function renderTree() {
    const foundationSearchText = [
      data.foundation.id,
      data.foundation.owner,
      data.foundation.title,
      data.foundation.summary,
      ...(data.foundation.db || []),
      ...(data.foundation.backend || []),
      ...(data.foundation.front || []),
      ...(data.foundation.tech || []),
      ...(data.foundation.logic || []),
      ...(data.foundation.notes || []),
    ].join(' ')
    const members = [
      { name: 'Vincent Shih', packageIds: ['A'] },
      { name: 'Clara', packageIds: ['B'] },
      { name: 'YiTing', packageIds: ['C'] },
      { name: 'ting chiu', alias: '實作紀錄：Iris', packageIds: ['D'] },
      { name: 'Harry Wang', packageIds: ['E'], foundation: true },
    ]
    tree.innerHTML = members.map((member) => {
      const memberPackages = member.packageIds.map((id) => packages.find((pack) => pack.id === id)).filter(Boolean)
      const visible = state.filter === 'all' || memberPackages.some((pack) => pack.id === state.filter) || (state.filter === 'L0' && member.foundation)
      if (!visible) return ''
      const packNodes = memberPackages.map((pack) => {
        const packageOpen = state.selected.kind === 'package' && state.selected.packageId === pack.id || state.selected.packageId === pack.id && state.selected.kind !== 'overview'
        const features = pack.features.map((feature, featureIndex) => {
          const featureOpen = ['feature', 'screen'].includes(state.selected.kind) && state.selected.packageId === pack.id && state.selected.featureIndex === featureIndex
          const screenItems = feature.pages.map((screen) => {
            const active = state.selected.kind === 'screen' && state.selected.packageId === pack.id && state.selected.featureIndex === featureIndex && state.selected.screenId === screen.id
            const overlay = screen.id.endsWith('b') || screen.id.endsWith('c') || screen.id === 'C-21' || screen.id === 'S-11' || screen.title.includes('倒數') || screen.title.includes('選桌')
            return `<button class="tree-page ${active ? 'active' : ''} ${overlay ? 'tree-page-overlay' : ''}" type="button" data-kind="screen" data-package-id="${pack.id}" data-feature-index="${featureIndex}" data-screen-id="${safe(screen.id)}"><span class="tree-page-id">${safe(screen.id)}</span><span>${safe(screen.title)}</span></button>`
          }).join('')
          return `<details class="tree-feature ${featureOpen ? 'selected-feature' : ''}" ${featureOpen ? 'open' : ''} data-feature-node data-package-id="${pack.id}" data-feature-index="${featureIndex}">
            <summary data-kind="feature" data-package-id="${pack.id}" data-feature-index="${featureIndex}"><span class="feature-code">${safe(feature.module.split(' ')[0])}</span><span>${safe(feature.title)}</span></summary>
            <div class="tree-pages">${screenItems}</div>
          </details>`
        }).join('')
        return `<details class="tree-package ${packageOpen ? 'selected-package' : ''}" ${packageOpen ? 'open' : ''} data-package-node data-package-id="${pack.id}">
          <summary data-kind="package" data-package-id="${pack.id}"><span class="package-code" style="background:${pack.color}">${pack.id}</span><span class="tree-package-title">${safe(pack.title)}</span><span class="tree-package-owner">${safe(pack.owner.split(' ')[0])}</span></summary>
          <div class="tree-feature-list">${features}</div>
        </details>`
      }).join('')
      const foundationSelected = state.selected.kind === 'foundation'
      const foundation = member.foundation ? `<details class="tree-package foundation-tree ${foundationSelected ? 'selected-package' : ''}" ${foundationSelected ? 'open' : ''} data-search="${safe(foundationSearchText)}">
          <summary data-kind="foundation"><span class="package-code" style="background:#596579">L0</span><span class="tree-package-title">共用技術地基</span><span class="tree-package-owner">Harry</span></summary>
          <div class="tree-pages foundation-items">
            <button class="tree-page ${foundationSelected ? 'active' : ''}" type="button" data-kind="foundation"><span class="tree-page-id">L0</span><span>安全、資料、即時、部署</span></button>
          </div>
        </details>` : ''
      return `<section class="person-branch" data-person="${safe(member.name)}" data-alias="${safe(member.alias || '')}">
        <div class="person-label"><span class="person-avatar">${safe(ownerInitial(member.name))}</span><span>${safe(member.name)}</span>${member.alias ? `<span class="person-sub">${safe(member.alias)}</span>` : ''}</div>
        ${packNodes}${foundation}
      </section>`
    }).join('')
    applySearch()
    markSelection()
  }

  function applySearch() {
    const q = state.query.trim().toLocaleLowerCase()
    const matchesFilter = (packageNode) => {
      if (state.filter === 'all') return true
      if (state.filter === 'L0') return packageNode.classList.contains('foundation-tree')
      return packageNode.dataset.packageId === state.filter
    }

    $$('.person-branch', tree).forEach((person) => {
      let personHasMatch = false
      $$('.tree-package', person).forEach((packageNode) => {
        const packId = packageNode.dataset.packageId
        const pack = packages.find((item) => item.id === packId)
        const filterMatch = matchesFilter(packageNode)
        if (!pack) {
          const text = `${packageNode.dataset.search || packageNode.textContent}`.toLocaleLowerCase()
          const show = filterMatch && (!q || text.includes(q))
          packageNode.hidden = !show
          packageNode.open = !!q && show
          personHasMatch ||= show
          return
        }
        const packageMeta = `${pack.id} ${pack.owner} ${pack.title} ${pack.modules} ${pack.summary} ${(pack.db || []).join(' ')} ${(pack.backend || []).join(' ')} ${(pack.frontShared || []).join(' ')} ${(pack.logic || []).join(' ')} ${(pack.tech || []).join(' ')} ${(pack.docs || []).map((item) => item.label).join(' ')}`.toLocaleLowerCase()
        const memberMeta = `${person.dataset.person || ''} ${person.dataset.alias || ''}`.toLocaleLowerCase()
        const packageHit = !!q && (packageMeta.includes(q) || memberMeta.includes(q))
        let packageHitChild = false
        $$('[data-feature-node]', packageNode).forEach((featureNode) => {
          const feature = pack.features[Number(featureNode.dataset.featureIndex)]
          const featureMeta = `${feature.title} ${feature.module} ${feature.summary} ${(feature.db || []).join(' ')} ${(feature.backend || []).join(' ')} ${(feature.frontShared || []).join(' ')} ${(feature.logic || []).join(' ')} ${(feature.tech || []).join(' ')} ${(feature.docs || []).map((item) => item.label).join(' ')}`.toLocaleLowerCase()
          const featureHit = !!q && featureMeta.includes(q)
          let featureHitChild = false
          $$('.tree-page', featureNode).forEach((screenNode) => {
            const screen = feature.pages.find((item) => item.id === screenNode.dataset.screenId)
            const screenMeta = screen ? `${screen.id} ${screen.title} ${screen.route} ${screen.figma || ''} ${screen.mockup || ''} ${(screen.front || []).join(' ')} ${(screen.backend || []).join(' ')} ${(screen.db || []).join(' ')} ${(screen.tech || []).join(' ')} ${(screen.logic || []).join(' ')} ${screen.note || ''}`.toLocaleLowerCase() : ''
            const screenHit = !q || packageHit || featureHit || screenMeta.includes(q)
            screenNode.hidden = !screenHit
            featureHitChild ||= screenHit
          })
          featureNode.hidden = !filterMatch || (!!q && !packageHit && !featureHit && !featureHitChild)
          if (q && !featureNode.hidden) featureNode.open = true
          packageHitChild ||= !featureNode.hidden
        })
        packageNode.hidden = !filterMatch || (!!q && !packageHit && !packageHitChild)
        if (q && !packageNode.hidden) packageNode.open = true
        personHasMatch ||= !packageNode.hidden
      })
      person.hidden = !personHasMatch
    })
    const hasResults = $$('.tree-package:not([hidden])', tree).length > 0
    if (q && !hasResults && !$('.no-results', tree)) {
      tree.insertAdjacentHTML('beforeend', '<p class="no-results">找不到符合項目。可搜尋功能名稱、畫面代號或檔案路徑。</p>')
    } else if ((!q || hasResults) && $('.no-results', tree)) {
      $('.no-results', tree).remove()
    }
  }

  function markSelection() {
    $$('.tree-root-button', document).forEach((button) => button.classList.toggle('selected', state.selected.kind === 'overview'))
    $$('.tree-package', tree).forEach((node) => node.classList.toggle('selected-package', state.selected.kind === 'package' && node.dataset.packageId === state.selected.packageId || state.selected.kind === 'foundation' && node.classList.contains('foundation-tree')))
    $$('.tree-feature', tree).forEach((node) => node.classList.toggle('selected-feature', ['feature', 'screen'].includes(state.selected.kind) && node.dataset.packageId === state.selected.packageId && Number(node.dataset.featureIndex) === state.selected.featureIndex))
    $$('.tree-page', tree).forEach((node) => node.classList.toggle('active', state.selected.kind === 'screen' && node.dataset.packageId === state.selected.packageId && Number(node.dataset.featureIndex) === state.selected.featureIndex && node.dataset.screenId === state.selected.screenId || state.selected.kind === 'foundation' && node.dataset.kind === 'foundation'))
  }

  function revealSelectionPath(selected) {
    if (selected.kind === 'foundation') {
      const foundation = $('.foundation-tree', tree)
      if (foundation) foundation.open = true
      return
    }
    if (!selected.packageId) return
    const packageNode = $$('.tree-package[data-package-id]', tree).find((node) => node.dataset.packageId === selected.packageId)
    if (!packageNode) return
    packageNode.open = true
    if (selected.kind === 'feature' || selected.kind === 'screen') {
      const featureNode = $$('[data-feature-node]', packageNode).find((node) => Number(node.dataset.featureIndex) === selected.featureIndex)
      if (featureNode) featureNode.open = true
    }
  }

  function setSelection(selected) {
    previewObserver?.disconnect()
    previewObserver = null
    thumbnailObserver?.disconnect()
    thumbnailObserver = null
    state.selected = selected
    markSelection()
    const packageId = selected.packageId
    const pack = packages.find((item) => item.id === packageId)
    if (selected.kind === 'overview') {
      $('#breadcrumbs').innerHTML = '<span>Smart Order</span><span class="crumb-sep">/</span><b>總覽</b>'
      renderOverview()
    } else if (selected.kind === 'foundation') {
      $('#breadcrumbs').innerHTML = '<span>Harry Wang</span><span class="crumb-sep">/</span><b>L0 共用技術地基</b>'
      renderFoundation()
    } else if (selected.kind === 'package') {
      $('#breadcrumbs').innerHTML = `<span>Smart Order</span><span class="crumb-sep">/</span><span>${safe(pack.owner)}</span><span class="crumb-sep">/</span><b>工作包 ${pack.id}</b>`
      renderPackage(pack)
    } else if (selected.kind === 'feature') {
      const feature = pack.features[selected.featureIndex]
      $('#breadcrumbs').innerHTML = `<span>${safe(pack.owner)}</span><span class="crumb-sep">/</span><span>工作包 ${pack.id}</span><span class="crumb-sep">/</span><b>${safe(feature.title)}</b>`
      renderFeature(pack, feature, selected.featureIndex)
    } else {
      const feature = pack.features[selected.featureIndex]
      const screen = feature.pages.find((item) => item.id === selected.screenId)
      $('#breadcrumbs').innerHTML = `<span>${safe(pack.owner)}</span><span class="crumb-sep">/</span><span>工作包 ${pack.id}</span><span class="crumb-sep">/</span><b>${safe(screen.id)} ${safe(screen.title)}</b>`
      renderScreen(pack, feature, screen)
    }
    root.focus({ preventScroll: true })
  }

  function mapOwnerCard(pack) {
    return `<button class="owner-card" type="button" data-select-package="${pack.id}" aria-label="查看 ${safe(pack.owner)} 工作包 ${pack.id}">
      <span class="owner-card-head"><span class="owner-card-avatar" style="background:${pack.color}">${pack.id}</span><b>${safe(pack.owner)}</b></span>
      <small>${safe(pack.title)}</small>
      <span class="owner-pack"><i class="mini-package" style="background:${pack.color}">${pack.id}</i>${pack.id === 'E' ? '<i class="mini-package" style="background:#596579">L0</i>' : ''}</span>
    </button>`
  }

  function packageCard(pack) {
    const standalone = pageCount(pack) - pack.features.flatMap((feature) => feature.pages).filter((screen) => screen.id === 'C-21' || screen.id === 'S-11').length
    const featureCards = pack.features.length
    return `<button class="overview-card" type="button" data-select-package="${pack.id}">
      <span class="overview-card-top"><span class="overview-card-mark" style="background:${pack.color}">${pack.id}</span><span><b>${safe(pack.title)}</b><small>${safe(pack.owner)} · ${safe(pack.modules)}</small></span></span>
      <p>${safe(pack.summary)}</p>
      <span class="overview-card-foot"><b>${featureCards} 個功能分支</b><span>${standalone} 個工作包畫面 →</span></span>
    </button>`
  }

  function renderOverview() {
    root.innerHTML = `<div class="overview-head">
      <div class="content-head"><div><div class="content-kicker"><span class="kicker-dot"></span> SYSTEM MAP · TEAM OWNERSHIP</div><h2>從成員展開的完整工作地圖</h2><p>五個工作包以功能切分，每位成員都能從資料表一路追到 API 與畫面。Harry 另外維護全隊共用的 L0 技術地基。</p></div><span class="package-badge"><i style="background:#79a77b"></i><b>基礎功能</b> 已完成</span></div>
    </div>
    <div class="tree-explainer"><b>根節點</b><span>→</span><b>成員與工作包</b><span>→</span><b>功能</b><span>→</span><b>畫面與程式細節</b></div>
    <div class="map-rail"><div class="map-root"><span class="root-glyph">◎</span><b>Smart Order</b><small>5 位成員・6 條責任線</small></div><div class="map-connector">⟶</div><div class="map-owners">${packages.map(mapOwnerCard).join('')}</div><div class="map-caption">Harry 同時負責工作包 E 與跨全隊的 L0 技術地基</div></div>
    <div class="subsection-title"><h3>功能工作包</h3><span>A—E · 每包由一位成員負責</span></div>
    <div class="overview-grid">${packages.map(packageCard).join('')}</div>
    <button class="foundation-card" type="button" data-select-foundation><span class="overview-card-mark">L0</span><span><b>共用技術地基 · Harry Wang</b><p>專案骨架、認證權限、資料庫 schema、統一錯誤、WebSocket、圖片儲存與 CI。跨功能修改先看這個分支。</p></span><span aria-hidden="true">→</span></button>
    <div class="subsection-title"><h3>從畫面開始逛</h3><span>點卡片直接開啟細節</span></div>
    ${packages.map((pack) => `<section><div class="subsection-title"><h3><span style="color:${pack.color}">${pack.id}</span> ${safe(pack.title)}</h3><span>${safe(pack.owner)}</span></div><div class="feature-grid">${pack.features.map((feature, index) => featureCard(pack, feature, index)).join('')}</div></section>`).join('')}
    <div class="warning-note"><span>ⓘ</span><span><b>資料庫管理現況：</b>目前專案以 <code>backend/db/schema.sql</code>、<code>seed.sql</code> 與 <code>migrate_*.sql</code> 維護表結構；Flyway 套件雖已加入，啟動設定仍關閉 Flyway。</span></div>`
    bindDetailActions()
  }

  function featureCard(pack, feature, featureIndex) {
    return `<button class="feature-card" type="button" data-select-feature="${pack.id}" data-feature-index="${featureIndex}">
      <span class="feature-card-head"><span class="feature-card-num">${String(featureIndex + 1).padStart(2, '0')}</span><span><b>${safe(feature.title)}</b><small>${safe(feature.module)}</small></span></span>
      <p>${safe(feature.summary)}</p>
      <span class="feature-card-foot"><span>${feature.pages.length} 個頁面／狀態</span><b>展開 →</b></span>
      <span class="feature-index"><b>包含畫面</b><span class="screen-chips">${feature.pages.map((screen) => `<span class="screen-chip">${safe(screen.id)}</span>`).join('')}</span></span>
    </button>`
  }

  function renderPackage(pack) {
    const pageTotal = pageCount(pack)
    const allScreens = pagesOf(pack)
    const embedded = allScreens.filter(({ id }) => id === 'C-21' || id === 'S-11').length
    root.innerHTML = `<div class="content-head"><div><div class="content-kicker"><span class="kicker-dot" style="background:${pack.color}"></span> WORK PACKAGE ${pack.id}</div><h2>${safe(pack.title)}</h2><p>${safe(pack.summary)}</p></div><span class="owner-chip"><span class="owner-circle" style="background:${pack.color}">${safe(ownerInitial(pack.owner))}</span>${safe(pack.owner)}</span></div>
      <div class="summary-band"><div class="summary-cell"><span>負責模組</span><b>${safe(pack.modules)}</b></div><div class="summary-cell"><span>功能分支</span><b>${pack.features.length} 個功能工作包</b></div><div class="summary-cell"><span>畫面與狀態</span><b>${pageTotal - embedded} 個主畫面${embedded ? `＋${embedded} 個整合面板` : ''}</b></div></div>
      <div class="work-summary">${safe(pack.summary)}<br><b>工作方式：</b>同一位成員負責資料表、後端 API、前端畫面與整合驗收，不按前後端分組。</div>
      <div class="subsection-title"><h3>功能 → 頁面</h3><span>選功能看資料與程式；選畫面看截圖和 Figma</span></div>
      <div class="feature-grid">${pack.features.map((feature, index) => featureCard(pack, feature, index)).join('')}</div>
      <div class="section-grid"><section class="info-card"><div class="info-card-title"><span class="tiny-mark">▦</span>主要資料表</div>${dbTags(pack.db)}</section><section class="info-card"><div class="info-card-title"><span class="tiny-mark">◇</span>技術與關鍵邏輯</div>${list(pack.logic)}</section></div>
      ${sourceLinks(pack.docs)}
      ${pack.id === 'D' ? `<div class="warning-note"><span>ⓘ</span><span><b>姓名來源差異：</b>工作包分工表將 D 列為「ting chiu」，實作回饋索引使用「Iris」。此頁保留兩個來源名稱，沒有把它們合併成同一姓名。</span></div>` : ''}`
    bindDetailActions()
  }

  function renderFeature(pack, feature, featureIndex) {
    root.innerHTML = `<div class="content-head"><div><div class="content-kicker"><span class="kicker-dot" style="background:${pack.color}"></span> ${safe(pack.owner)} · 工作包 ${pack.id} · ${safe(feature.module)}</div><h2>${safe(feature.title)}</h2><p>${safe(feature.summary)}</p></div><span class="package-badge"><i style="background:${pack.color}"></i><b>${feature.pages.length}</b> 個畫面／狀態</span></div>
      <div class="section-grid"><section class="info-card"><div class="info-card-title"><span class="tiny-mark">▦</span>資料庫表格</div>${dbTags(feature.db ?? pack.db)}</section><section class="info-card"><div class="info-card-title"><span class="tiny-mark">⌘</span>使用技術</div>${techTags(feature.tech ?? pack.tech)}</section></div>
      <div class="section-grid"><section class="info-card"><div class="info-card-title"><span class="tiny-mark">↳</span>使用邏輯與閱讀要點</div>${list(feature.logic ?? pack.logic)}</section><section class="info-card"><div class="info-card-title"><span class="tiny-mark">⌘</span>後端主要檔案</div>${fileList(feature.backend ?? pack.backend)}</section></div>
      <div class="subsection-title"><h3>頁面與狀態</h3><span>選取畫面查看專屬截圖、Figma 與前端檔案</span></div>
      <div class="screen-cards">${feature.pages.map((screen) => screenCard(pack, featureIndex, screen)).join('')}</div>
      ${sourceLinks(pack.docs)}`
    fitScreenThumbnails()
    bindDetailActions()
  }

  function renderScreen(pack, feature, screen) {
    const staff = screen.id.startsWith('S-')
    const isKds = screen.id === 'S-04'
    const useMockup = staff || !screen.image
    const designWidth = isKds ? 1920 : staff ? 1280 : 375
    const designHeight = isKds ? 1080 : staff ? 800 : 812
    const preview = !useMockup
      ? `<img src="${safe(screen.image)}" alt="${safe(screen.id)} ${safe(screen.title)} 的實作截圖">`
      : `<iframe class="${staff ? 'staff' : ''} ${isKds ? 'kds' : ''}" data-design-width="${designWidth}" data-design-height="${designHeight}" style="--frame-width:${designWidth}px;--frame-height:${designHeight}px" src="${safe(screen.mockup)}#thumbmode" title="${safe(screen.id)} ${safe(screen.title)} 的本機設計稿預覽"></iframe>`
    const relativeLinks = screen.docs || feature.docs || []
    root.innerHTML = `<div class="screen-detail-head"><div class="screen-title-wrap"><div class="content-kicker"><span class="kicker-dot" style="background:${pack.color}"></span> ${safe(pack.owner)} · 工作包 ${pack.id} · ${safe(feature.module)}</div><div class="screen-title-line"><span class="screen-id-big" style="background:${pack.color}">${safe(screen.id)}</span><h2>${safe(screen.title)}</h2></div><div class="screen-route">實際路由／狀態：${safe(screen.route)}</div></div><div class="screen-actions"><a class="primary-link" href="${safe(screen.figma)}" target="_blank" rel="noopener">開啟 Figma <span aria-hidden="true">↗</span></a><a class="secondary-link" href="${safe(screen.mockup)}" target="_blank" rel="noopener">完整畫面預覽 <span aria-hidden="true">↗</span></a></div></div>
      <div class="screen-detail-grid"><div>
        <div class="preview-frame"><div class="preview-stage ${staff ? 'staff-frame' : ''}">${preview}</div><div class="preview-meta"><span class="screenshot-type ${useMockup ? 'mockup' : ''}"><i></i>${useMockup ? '本機 HTML 設計稿預覽' : '實作截圖'}</span><span class="preview-meta-links"><a href="${safe(screen.figma)}" target="_blank" rel="noopener">Figma 畫框 ↗</a>${staff && screen.image ? `<a href="${safe(screen.image)}" target="_blank" rel="noopener">實作截圖原圖 ↗</a>` : ''}</span></div></div>
        ${screen.note ? `<p class="screen-note">${safe(screen.note)}</p>` : ''}
        ${useMockup && screen.mockup.includes('revisions/') ? '<p class="warning-note"><span>ⓘ</span><span>這是本機修訂稿預覽；原 Figma 畫框仍可由右側連結開啟，兩者可能有設計差異。</span></p>' : ''}
      </div><div class="screen-info">
        <section class="info-card"><div class="info-card-title"><span class="tiny-mark">▦</span>資料庫表格</div>${dbTags(feature.db ?? pack.db)}</section>
        <section class="info-card"><div class="info-card-title"><span class="tiny-mark">⌘</span>後端檔案</div>${fileList(feature.backend ?? pack.backend)}</section>
        <section class="info-card"><div class="info-card-title"><span class="tiny-mark">◇</span>前端檔案</div>${fileList([...new Set([...(pack.frontShared || []), ...(feature.frontShared || []), ...(screen.front || [])])])}</section>
        <section class="info-card"><div class="info-card-title"><span class="tiny-mark">⌁</span>使用技術與閱讀要點</div>${techTags([...new Set([...(feature.tech || []), ...(screen.tech || [])])])}${list([...new Set([...(feature.logic || []), ...(screen.logic || [])])])}</section>
        ${relativeLinks.length ? `<section class="info-card"><div class="info-card-title"><span class="tiny-mark">↗</span>模組文件與實作紀錄</div>${sourceLinks(relativeLinks)}</section>` : ''}
      </div></div>`
    fitScreenPreview()
    bindDetailActions()
  }

  function fitScreenPreview() {
    const stage = $('.preview-stage', root)
    const frame = $('iframe', stage)
    if (!stage || !frame) return
    const designWidth = Number(frame.dataset.designWidth) || (frame.classList.contains('staff') ? 1280 : 375)
    const designHeight = Number(frame.dataset.designHeight) || (frame.classList.contains('staff') ? 800 : 812)
    const fit = () => {
      const { width, height } = stage.getBoundingClientRect()
      if (!width || !height) return
      const scale = Math.min((width - 24) / designWidth, (height - 24) / designHeight, 1)
      if (scale > 0) frame.style.setProperty('--preview-scale', scale.toFixed(4))
    }
    fit()
    if (typeof ResizeObserver !== 'undefined') {
      previewObserver = new ResizeObserver(fit)
      previewObserver.observe(stage)
    }
  }

  function renderFoundation() {
    const l0 = data.foundation
    root.innerHTML = `<div class="content-head"><div><div class="content-kicker"><span class="kicker-dot" style="background:#596579"></span> CROSS-TEAM FOUNDATION · L0</div><h2>${safe(l0.title)}</h2><p>${safe(l0.summary)}</p></div><span class="owner-chip"><span class="owner-circle" style="background:#596579">H</span>${safe(l0.owner)}</span></div>
      <div class="summary-band"><div class="summary-cell"><span>責任範圍</span><b>跨工作包共用，不計入 A—E</b></div><div class="summary-cell"><span>核心技術</span><b>安全、API、即時事件、資料與 CI</b></div><div class="summary-cell"><span>閱讀起點</span><b>config → security → shared services</b></div></div>
      <div class="section-grid"><section class="info-card"><div class="info-card-title"><span class="tiny-mark">▦</span>資料庫與版本管理</div>${list(l0.db)}<div class="warning-note"><span>ⓘ</span><span><b>現況：</b>Flyway 已列入相依套件但啟動時停用；目前資料表以 backend/db 的 SQL 維護。規格中的 V1—V6 是未來拆分規劃，不是現行 migration 目錄。</span></div></section><section class="info-card"><div class="info-card-title"><span class="tiny-mark">⌁</span>共用技術</div>${techTags(l0.tech)}${list(l0.logic)}</section></div>
      <div class="section-grid"><section class="info-card"><div class="info-card-title"><span class="tiny-mark">⌘</span>後端與工程檔案</div>${fileList(l0.backend)}</section><section class="info-card"><div class="info-card-title"><span class="tiny-mark">◇</span>前端共用連線與版型</div>${fileList(l0.front)}</section></div>
      <section class="info-card wide"><div class="info-card-title"><span class="tiny-mark">!</span>閱讀時要留意</div>${list(l0.notes)}</section>
      ${sourceLinks(l0.docs)}`
    bindDetailActions()
  }

  function screenCard(pack, featureIndex, screen) {
    const kind = screen.id.startsWith('S-') ? 'staff' : 'customer'
    const useMockup = kind === 'staff' || !screen.image
    const isKds = screen.id === 'S-04'
    const designWidth = isKds ? 1920 : kind === 'staff' ? 1280 : 375
    const designHeight = isKds ? 1080 : kind === 'staff' ? 800 : 812
    const thumb = !useMockup
      ? `<img src="${safe(screen.image)}" alt="${safe(screen.id)} ${safe(screen.title)} 縮圖" loading="lazy">`
      : `<iframe data-design-width="${designWidth}" data-design-height="${designHeight}" style="--frame-width:${designWidth}px;--frame-height:${designHeight}px" src="${safe(screen.mockup)}#thumbmode" title="${safe(screen.id)} ${safe(screen.title)} 的整頁預覽" loading="lazy" scrolling="no" tabindex="-1"></iframe><span class="thumb-label">整頁設計預覽</span>`
    return `<button class="screen-card" type="button" data-kind="${kind}" data-select-page="${pack.id}" data-feature-index="${featureIndex}" data-screen-id="${safe(screen.id)}"><span class="screen-thumb">${thumb}</span><span class="screen-card-body"><span class="screen-card-code">${safe(screen.id)}</span><b>${safe(screen.title)}</b><small>${safe(screen.route)}</small></span></button>`
  }

  function fitScreenThumbnails() {
    const frames = $$('.screen-thumb iframe', root)
    if (!frames.length) return
    const fit = (frame) => {
      const designWidth = Number(frame.dataset.designWidth)
      const designHeight = Number(frame.dataset.designHeight)
      const { width, height } = frame.parentElement.getBoundingClientRect()
      if (!width || !height || !designWidth || !designHeight) return
      const scale = Math.min((width - 20) / designWidth, (height - 20) / designHeight, 1)
      if (scale > 0) frame.style.setProperty('--thumb-scale', scale.toFixed(4))
    }
    frames.forEach(fit)
    if (typeof ResizeObserver !== 'undefined') {
      thumbnailObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const frame = $('iframe', entry.target)
          if (frame) fit(frame)
        })
      })
      frames.forEach((frame) => thumbnailObserver.observe(frame.parentElement))
    }
  }

  function dbTags(items) {
    if (!items?.length) return '<span class="file-none">此畫面不直接存取資料表；依工作包邊界與其他模組串接。</span>'
    return `<div class="db-tags">${items.map((item) => `<span class="db-tag">${safe(item)}</span>`).join('')}</div><div style="margin-top:8px"><a class="text-button" href="../spec/03-資料庫設計.html">欄位與關聯定義 →</a></div>`
  }

  function fileList(paths) {
    const unique = [...new Set(paths || [])]
    if (!unique.length) return '<span class="file-none">此頁沒有專屬後端檔案；請沿交接說明查看負責 API 的工作包。</span>'
    return `<div class="file-list">${unique.map((path) => `<a class="file-link" href="${safe(repoLink(path))}" target="_blank" rel="noopener">${safe(path)}</a>`).join('')}</div>`
  }

  function list(items) {
    if (!items?.length) return '<span class="file-none">尚無補充說明。</span>'
    return `<ul>${items.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>`
  }

  function techTags(items) {
    if (!items?.length) return '<span class="file-none">—</span>'
    return `<div class="tech-tags">${items.map((item) => `<span class="tech-tag">${safe(item)}</span>`).join('')}</div>`
  }

  function sourceLinks(items) {
    if (!items?.length) return ''
    return `<div class="reading-links">${items.map((item) => `<a href="${safe(item.href)}" target="_blank" rel="noopener">${safe(item.label)} ↗</a>`).join('')}</div>`
  }

  function selectFromDetail(selection) {
    setSelection(selection)
    revealSelectionPath(selection)
  }

  function bindDetailActions() {
    $$('[data-select-package]', root).forEach((button) => button.addEventListener('click', () => selectFromDetail({ kind: 'package', packageId: button.dataset.selectPackage })))
    $$('[data-select-feature]', root).forEach((button) => button.addEventListener('click', () => selectFromDetail({ kind: 'feature', packageId: button.dataset.selectFeature, featureIndex: Number(button.dataset.featureIndex) })))
    $$('[data-select-page]', root).forEach((button) => button.addEventListener('click', () => selectFromDetail({ kind: 'screen', packageId: button.dataset.selectPage, featureIndex: Number(button.dataset.featureIndex), screenId: button.dataset.screenId })))
    $$('[data-select-foundation]', root).forEach((button) => button.addEventListener('click', () => selectFromDetail({ kind: 'foundation' })))
  }

  tree.addEventListener('click', (event) => {
    const target = event.target.closest('[data-kind]')
    if (!target) return
    const kind = target.dataset.kind
    const summary = target.closest('summary[data-kind]')
    if (summary) {
      event.preventDefault()
      summary.parentElement.open = !summary.parentElement.open
    }
    if (kind === 'package') setSelection({ kind, packageId: target.dataset.packageId })
    if (kind === 'feature') setSelection({ kind, packageId: target.dataset.packageId, featureIndex: Number(target.dataset.featureIndex) })
    if (kind === 'screen') setSelection({ kind, packageId: target.dataset.packageId, featureIndex: Number(target.dataset.featureIndex), screenId: target.dataset.screenId })
    if (kind === 'foundation') setSelection({ kind: 'foundation' })
  })
  $('.tree-root-button').addEventListener('click', () => {
    state.filter = 'all'
    renderFilters()
    renderTree()
    setSelection({ kind: 'overview' })
  })
  $('#filters').addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]')
    if (!button) return
    state.filter = button.dataset.filter
    if (state.filter === 'all') setSelection({ kind: 'overview' })
    else if (state.filter === 'L0') setSelection({ kind: 'foundation' })
    else setSelection({ kind: 'package', packageId: state.filter })
    renderFilters()
    renderTree()
  })
  search.addEventListener('input', () => {
    state.query = search.value
    applySearch()
  })
  $('#expandTree').addEventListener('click', () => {
    $$('.tree-package, .tree-feature', tree).forEach((node) => { node.open = true })
  })
  $('#collapseTree').addEventListener('click', () => {
    $$('.tree-package, .tree-feature', tree).forEach((node) => { node.open = false })
  })
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
      event.preventDefault()
      search.focus()
    }
    if (event.key === 'Escape' && document.activeElement === search) {
      search.value = ''
      state.query = ''
      applySearch()
    }
  })

  renderFilters()
  renderTree()
  renderOverview()
})()
