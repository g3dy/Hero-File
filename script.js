
const BASE_API = '2add14c8cd3aa77ba305561617a7beca'
const BASE_URL = 'https://superheroapi.com/api.php/'
 
const searchInput = document.getElementById('searchInput')
const dropdown    = document.getElementById('dropdown')
const randomHero  = document.getElementById('randomHero')
 
// ── Debounce ──
function debounce(fn, ms) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}
 
// ── Highlight matched text ──
function highlight(text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return text.slice(0, idx)
    + `<mark>${text.slice(idx, idx + query.length)}</mark>`
    + text.slice(idx + query.length)
}
 
// ── Dropdown open/close ──
let focusedIndex = -1
let currentResults = []
 
function openDropdown(html) {
  dropdown.innerHTML = html
  dropdown.classList.add('open')
  focusedIndex = -1
}
 
function closeDropdown() {
  dropdown.classList.remove('open')
  dropdown.innerHTML = ''
  currentResults = []
  focusedIndex = -1
}
 
// ── Fetch suggestions as user types ──
const fetchSuggestions = debounce((query) => {
  if (!query.trim()) { closeDropdown(); return }
 
  // Show searching state immediately
  openDropdown('<div class="dd-searching">SEARCHING…</div>')
 
  fetch(`${BASE_URL}${BASE_API}/search/${encodeURIComponent(query)}`)
    .then(r => r.json())
    .then(json => {
      if (!json.results?.length) {
        openDropdown('<div class="dd-none">No heroes found</div>')
        currentResults = []
        return
      }
 
      currentResults = json.results.slice(0, 8) // cap at 8 suggestions
 
      const items = currentResults.map((h, i) => {
        const al  = (h.biography?.alignment || '').toLowerCase()
        const cls = al === 'good' ? 'da-good' : al === 'bad' ? 'da-bad' : 'da-neutral'
        const alLabel = (al && al !== 'null' && al !== '-')
          ? `<span class="dd-align ${cls}">${al.toUpperCase()}</span>` : ''
        return `
        <div class="dd-item" data-index="${i}">
          <img class="dd-thumb" src="${h.image?.url || ''}" alt="${h.name}">
          <span class="dd-name">${highlight(h.name, query)}</span>
          ${alLabel}
        </div>`
      }).join('')
 
      openDropdown(items)
 
      // Attach click listeners
      dropdown.querySelectorAll('.dd-item').forEach(el => {
        el.addEventListener('mousedown', (e) => {
          e.preventDefault() // prevent input blur before click fires
          const idx = parseInt(el.dataset.index)
          selectHero(currentResults[idx])
        })
      })
    })
    .catch(() => {
      openDropdown('<div class="dd-none">Error — try again</div>')
    })
}, 280)
 
// ── Keyboard navigation inside dropdown ──
searchInput.addEventListener('keydown', (e) => {
  const items = dropdown.querySelectorAll('.dd-item')
  if (!items.length) return
 
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusedIndex = Math.min(focusedIndex + 1, items.length - 1)
    items.forEach((el, i) => el.classList.toggle('focused', i === focusedIndex))
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    focusedIndex = Math.max(focusedIndex - 1, 0)
    items.forEach((el, i) => el.classList.toggle('focused', i === focusedIndex))
  } else if (e.key === 'Enter') {
    if (focusedIndex >= 0 && currentResults[focusedIndex]) {
      selectHero(currentResults[focusedIndex])
    }
  } else if (e.key === 'Escape') {
    closeDropdown()
  }
})
 
searchInput.addEventListener('input', (e) => fetchSuggestions(e.target.value))
searchInput.addEventListener('blur', () => setTimeout(closeDropdown, 150))
searchInput.addEventListener('focus', () => {
  if (searchInput.value.trim()) fetchSuggestions(searchInput.value)
})
 
// ── Select a hero from suggestions ──
function selectHero(hero) {
  searchInput.value = hero.name
  closeDropdown()
  heroinfo(hero)
}
 
// ── Load by ID (for random) ──
function loadById(id) {
  setState('loading')
  fetch(`${BASE_URL}${BASE_API}/${id}`)
    .then(r => r.json())
    .then(json => heroinfo(json))
    .catch(() => setState('error'))
}
 
// ── Helpers ──
function fillClass(val) {
  const n = parseInt(val)
  if (isNaN(n)) return 'fill-mid'
  if (n < 25)  return 'fill-low'
  if (n < 50)  return 'fill-mid'
  if (n < 75)  return 'fill-good'
  return 'fill-high'
}
 
function setState(s) {
  const wrap = document.getElementById('stateWrap')
  const card = document.getElementById('heroCard')
  wrap.style.display = s === 'card' ? 'none' : 'flex'
  card.style.display = s === 'card' ? 'block' : 'none'
  document.getElementById('stateEmpty').style.display   = s === 'empty'   ? 'block' : 'none'
  document.getElementById('stateLoading').style.display = s === 'loading' ? 'flex'  : 'none'
  document.getElementById('stateError').style.display   = s === 'error'   ? 'block' : 'none'
}
 
// ── Render card ──
const heroinfo = (character) => {
  if (!character || character.response === 'error') { setState('error'); return }
 
  document.getElementById('heroImg').src = character.image?.url || ''
  document.getElementById('heroName').textContent = character.name
  document.getElementById('cardNumber').textContent =
    character.id ? `#${String(character.id).padStart(3,'0')}` : '#???'
 
  const al   = (character.biography?.alignment || '').toLowerCase()
  const alEl = document.getElementById('heroAlignment')
  if (al && al !== 'null' && al !== '-') {
    const cls = al === 'good' ? 'pill-good' : al === 'bad' ? 'pill-bad' : 'pill-neutral'
    alEl.innerHTML = `<span class="alignment-pill ${cls}">${al.toUpperCase()}</span>`
  } else {
    alEl.innerHTML = '<span style="font-size:13px;opacity:.4;letter-spacing:2px">UNKNOWN</span>'
  }
 
  const container = document.getElementById('statsRows')
  container.innerHTML = Object.entries(character.powerstats ?? {}).map(([stat, val], i) => {
    const pct = Math.min(parseInt(val) || 0, 100)
    const fc  = fillClass(val)
    return `
    <div class="stat-row" style="animation-delay:${i * 0.07}s">
      <div class="stat-name">${stat}</div>
      <div class="stat-track">
        <div class="stat-fill ${fc}" data-pct="${pct}" style="width:0%"></div>
      </div>
      <div class="stat-num">${val === 'null' || !val ? '—' : val}</div>
    </div>`
  }).join('')
 
  setState('card')
 
  requestAnimationFrame(() => requestAnimationFrame(() => {
    container.querySelectorAll('.stat-fill').forEach(el => {
      el.style.width = el.dataset.pct + '%'
    })
  }))
}
 
// ── Random ──
randomHero.onclick = () => {
  closeDropdown()
  searchInput.value = ''
  loadById(Math.ceil(Math.random() * 732))
}
 
setState('empty')