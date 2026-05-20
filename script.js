const STORAGE_KEY = "hjordisc_v1";

const POINT_TYPES = [
  { value: "tee", label: "Tee" },
  { value: "basket", label: "Korg" },
  { value: "fairway", label: "Fairway-punkt" },
  { value: "landingzone", label: "Landing zone" },
  { value: "mando", label: "Mando" },
  { value: "ob", label: "OB-punkt" },
  { value: "dropzone", label: "Drop Zone" },
  { value: "hazard", label: "Hazard" },
  { value: "elevation", label: "Höjdpunkt" },
  { value: "custom", label: "Custom" }
];

const defaultState = {
  currentView: "home",
  currentParams: {},
  history: [],
  activeRound: null,

  player: {
    name: "Ivar",
    role: "admin",
    rating: null,
    roundsPlayed: 0,
    bestRound: null,
    streakWeeks: 0,
    activeBagId: null
  },

  bags: [],
  rounds: [],

  courses: [
    {
      id: crypto.randomUUID(),
      name: "Tjärna Discgolfbana",
      location: "Borlänge",
      difficulty: "Teknisk / kuperad",
      status: "Öppen",
      manager: "Hjördisc Admin",
      loops: [
        {
          id: crypto.randomUUID(),
          name: "Gul slinga",
          holes: [
            {
              id: crypto.randomUUID(),
              number: 1,
              par: 3,
              length: 70,
              note: "Smal korridor. Spela kontrollerat.",
              mapPoints: []
            }
          ]
        }
      ]
    }
  ]
};

let state = loadState();
migrateState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    return JSON.parse(saved);
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function migrateState() {
  state.currentParams ??= {};
  state.history ??= [];
  state.bags ??= [];
  state.rounds ??= [];
  state.courses ??= structuredClone(defaultState.courses);
  state.player ??= structuredClone(defaultState.player);

  state.player.name ??= "Ivar";
  state.player.role ??= "admin";
  state.player.rating ??= null;
  state.player.bestRound ??= null;
  state.player.streakWeeks ??= 0;
  state.player.activeBagId ??= null;

  state.courses = state.courses.map(course => ({
    id: course.id ?? crypto.randomUUID(),
    name: course.name ?? "Namnlös bana",
    location: course.location ?? "",
    difficulty: course.difficulty ?? "",
    status: course.status ?? "Öppen",
    manager: course.manager ?? "Ej satt",
    loops: Array.isArray(course.loops) ? course.loops.map(loop => ({
      id: loop.id ?? crypto.randomUUID(),
      name: loop.name ?? "Namnlös slinga",
      holes: Array.isArray(loop.holes) ? loop.holes.map((hole, index) => ({
        id: hole.id ?? crypto.randomUUID(),
        number: Number(hole.number ?? index + 1),
        par: Number(hole.par ?? 3),
        length: Number(hole.length ?? 0),
        note: hole.note ?? "",
        mapPoints: Array.isArray(hole.mapPoints) ? hole.mapPoints : []
      })) : []
    })) : []
  }));

  state.bags = state.bags.map(bag => ({
    id: bag.id ?? crypto.randomUUID(),
    name: bag.name ?? "Namnlös väska",
    image: bag.image ?? "",
    discs: Array.isArray(bag.discs) ? bag.discs : []
  }));

  saveState();
}

function goTo(view, params = {}, pushHistory = true) {
  if (pushHistory) {
    state.history.push({
      view: state.currentView,
      params: state.currentParams || {}
    });
  }

  state.currentView = view;
  state.currentParams = params;
  saveState();
  render();
}

function setMainView(view) {
  state.currentView = view;
  state.currentParams = {};
  state.history = [];
  saveState();
  render();
}

function goBack() {
  const previous = state.history.pop();

  if (!previous) {
    setMainView("home");
    return;
  }

  state.currentView = previous.view;
  state.currentParams = previous.params || {};
  saveState();
  render();
}

function appLayout(content, title = "") {
  const canGoBack = state.history.length > 0;

  return `
    <div class="app-shell">
      <header class="header">
        ${canGoBack ? `<button class="btn" onclick="goBack()" style="padding:10px 13px; border-radius:16px;">←</button>` : ""}
        <img src="assets/logo.svg" class="logo" alt="Hjördisc logga">
        <div>
          <h1 class="brand-title">Hjördisc<span>™</span></h1>
          <p class="subtitle">${title || "Din runda. Din väska. Din utveckling."}</p>
        </div>
      </header>

      ${content}

      <nav class="nav">
        ${navButton("home", "🏠", "Hem")}
        ${navButton("play", "🥏", "Spela")}
        ${navButton("bags", "🎒", "Väskor")}
        ${navButton("stats", "📊", "Statistik")}
        ${navButton("profile", "👤", "Profil")}
      </nav>
    </div>
  `;
}

function navButton(view, icon, label) {
  return `
    <button class="${state.currentView === view ? "active" : ""}" onclick="setMainView('${view}')">
      <div>${icon}</div>
      <div>${label}</div>
    </button>
  `;
}

/* HOME */

function renderHome() {
  const activeBag = state.bags.find(bag => bag.id === state.player.activeBagId);

  return appLayout(`
    <section class="card card-glow">
      <h2>Välkommen tillbaka, ${escapeHtml(state.player.name)} 🩵</h2>
      <p class="muted">Hjördisc_v1.3 lever. DevKit kan nu samla GPS- och höjddata.</p>

      <div class="stat-row">
        <span>Aktiv väska</span>
        <strong>${activeBag ? escapeHtml(activeBag.name) : "Ingen vald"}</strong>
      </div>

      <div class="stat-row">
        <span>Banor i appen</span>
        <strong>${state.courses.length}</strong>
      </div>

      <div class="stat-row">
        <span>Rundor spelade</span>
        <strong>${state.rounds.length}</strong>
      </div>

      <div class="stat-row">
        <span>PB</span>
        <strong>${state.player.bestRound === null ? "Ej satt" : formatScore(state.player.bestRound)}</strong>
      </div>
    </section>
  `);
}

/* PLAY */

function renderPlay() {
  if (state.activeRound) return renderRound();

  return appLayout(`
    <section class="card">
      <h2>Spela</h2>
      <p class="muted">Välj bana och slinga för att starta en runda.</p>
    </section>

    ${state.courses.map(course => `
      <section class="card">
        <h3>${escapeHtml(course.name)}</h3>
        <p class="muted">${escapeHtml(course.location)} · ${escapeHtml(course.difficulty)} · ${escapeHtml(course.status)}</p>

        ${course.loops.length === 0 ? `<p class="muted">Banan saknar slingor.</p>` : course.loops.map(loop => `
          <button class="btn btn-primary" style="width:100%; margin-top:8px;" onclick="startRound('${course.id}', '${loop.id}')">
            Starta ${escapeHtml(loop.name)}
          </button>
        `).join("")}
      </section>
    `).join("")}
  `, "Spela runda");
}

function startRound(courseId, loopId) {
  const course = state.courses.find(c => c.id === courseId);
  const loop = course?.loops.find(l => l.id === loopId);

  if (!course || !loop || loop.holes.length === 0) {
    alert("Den här slingan saknar hål.");
    return;
  }

  state.activeRound = {
    id: crypto.randomUUID(),
    courseId,
    courseName: course.name,
    loopId,
    loopName: loop.name,
    currentHoleIndex: 0,
    cardmates: [],
    format: "singel",
    holes: loop.holes.map(hole => ({ ...hole, throws: 0 })),
    startedAt: new Date().toISOString()
  };

  state.history = [];
  state.currentView = "play";
  state.currentParams = {};
  saveState();
  render();
}

function renderRound() {
  const round = state.activeRound;
  const hole = round.holes[round.currentHoleIndex];
  const scoreName = getScoreName(hole.throws, hole.par);
  const basket = getPointByType(hole, "basket");

  return appLayout(`
    <section class="card">
      <div class="hole-title">
        <div>
          <h2>Hål ${hole.number}</h2>
          <p class="muted">Par ${hole.par} · ${hole.length} m</p>
        </div>
        <span class="badge">${round.currentHoleIndex + 1}/${round.holes.length}</span>
      </div>
      <p>${escapeHtml(hole.note || "Ingen hålnotering ännu.")}</p>
      ${basket ? `<p class="muted small">Korg höjd: ${formatElevation(basket.elevation)} · GPS: ${formatAccuracy(basket.accuracy)}</p>` : ""}
    </section>

    <section class="card score-box">
      <div class="score-number">${hole.throws}</div>
      <div class="score-label">${scoreName}</div>
    </section>

    <section class="card">
      <div class="grid grid-2">
        <button class="btn" onclick="changeThrows(-1)">-</button>
        <button class="btn" onclick="changeThrows(1)">+</button>
      </div>

      <div class="grid grid-2" style="margin-top: 12px;">
        <button class="btn btn-pink" onclick="setHoleThrows(1)">ACE</button>
        <button class="btn btn-primary" onclick="setHoleThrows(${hole.par})">PAR</button>
        <button class="btn" onclick="setHoleThrows(${Math.max(1, hole.par - 1)})">Birdie</button>
        <button class="btn" onclick="setHoleThrows(${Math.max(1, hole.par - 2)})">Eagle</button>
      </div>
    </section>

    <section class="card">
      <div class="grid grid-2">
        <button class="btn" onclick="previousHole()">Föregående</button>
        ${
          round.currentHoleIndex === round.holes.length - 1
            ? `<button class="btn btn-primary" onclick="finishRound()">Avsluta</button>`
            : `<button class="btn btn-primary" onclick="nextHole()">Nästa</button>`
        }
      </div>
      <button class="btn btn-danger" style="width:100%; margin-top:12px;" onclick="cancelRound()">Avbryt runda</button>
    </section>
  `, `${round.courseName} · ${round.loopName}`);
}

function changeThrows(amount) {
  const hole = state.activeRound.holes[state.activeRound.currentHoleIndex];

  if (hole.throws === 0 && amount > 0) hole.throws = hole.par;
  else if (hole.throws === 0 && amount < 0) hole.throws = Math.max(1, hole.par - 1);
  else hole.throws = Math.max(0, hole.throws + amount);

  saveState();
  render();
}

function setHoleThrows(value) {
  state.activeRound.holes[state.activeRound.currentHoleIndex].throws = value;
  saveState();
  render();
}

function nextHole() {
  state.activeRound.currentHoleIndex++;
  saveState();
  render();
}

function previousHole() {
  state.activeRound.currentHoleIndex = Math.max(0, state.activeRound.currentHoleIndex - 1);
  saveState();
  render();
}

function cancelRound() {
  if (!confirm("Avbryta rundan?")) return;
  state.activeRound = null;
  saveState();
  render();
}

function finishRound() {
  const round = state.activeRound;
  const totalThrows = round.holes.reduce((sum, h) => sum + h.throws, 0);
  const totalPar = round.holes.reduce((sum, h) => sum + h.par, 0);
  const totalToPar = totalThrows - totalPar;

  const finishedRound = {
    ...round,
    totalThrows,
    totalPar,
    totalToPar,
    finishedAt: new Date().toISOString()
  };

  state.rounds.push(finishedRound);
  state.player.roundsPlayed = state.rounds.length;

  if (state.player.bestRound === null || totalToPar < state.player.bestRound) {
    state.player.bestRound = totalToPar;
    setTimeout(() => alert("🥏 PB RUNDA! Hjördis hade varit stolt."), 250);
  }

  state.activeRound = null;
  saveState();
  render();
}

/* BAGS */

function renderBags() {
  return appLayout(`
    <section class="card">
      <h2>Väskor</h2>
      <p class="muted">Skapa väskor, öppna dem och fyll dem med discar.</p>

      <input class="input" id="bagName" placeholder="Namn på väska" />
      <input class="input" id="bagImage" type="file" accept="image/*" />
      <button class="btn btn-primary" onclick="addBag()">Lägg till väska</button>
    </section>

    ${state.bags.length === 0 ? `
      <section class="card"><p class="muted">Du har inga väskor än.</p></section>
    ` : state.bags.map(bag => `
      <section class="card bag-card">
        <img class="bag-image" src="${bag.image || ""}" alt="">
        <div style="flex:1">
          <h3>${escapeHtml(bag.name)}</h3>
          <p class="muted">${bag.discs.length} discar</p>
          ${state.player.activeBagId === bag.id ? `<span class="badge">Aktiv</span>` : ""}
          <div class="grid grid-2">
            <button class="btn btn-primary" onclick="openBag('${bag.id}')">Öppna</button>
            <button class="btn" onclick="setActiveBag('${bag.id}')">Välj aktiv</button>
          </div>
          <button class="btn btn-danger" style="width:100%; margin-top:10px;" onclick="deleteBag('${bag.id}')">Ta bort</button>
        </div>
      </section>
    `).join("")}
  `, "Väskor");
}

function openBag(bagId) {
  goTo("bagDetail", { bagId });
}

function renderBagDetail() {
  const bag = state.bags.find(b => b.id === state.currentParams?.bagId);
  if (!bag) return renderBags();

  return appLayout(`
    <section class="card card-glow">
      <div class="bag-card">
        <img class="bag-image" src="${bag.image || ""}" alt="">
        <div style="flex:1">
          <h2>${escapeHtml(bag.name)}</h2>
          <p class="muted">${bag.discs.length} discar i väskan</p>
          ${state.player.activeBagId === bag.id ? `<span class="badge">Aktiv väska</span>` : ""}
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:14px;">
        <button class="btn btn-primary" onclick="setActiveBag('${bag.id}')">Välj aktiv</button>
        <button class="btn" onclick="goTo('editBag', { bagId: '${bag.id}' })">Redigera</button>
      </div>
    </section>

    <section class="card">
      <h3>Discar</h3>
      <button class="btn btn-primary" style="width:100%;" onclick="goTo('addDisc', { bagId: '${bag.id}' })">Lägg till disc</button>
    </section>

    ${bag.discs.length === 0 ? `
      <section class="card"><p class="muted">Inga discar än.</p></section>
    ` : bag.discs.map(disc => `
      <section class="card">
        <h3>${escapeHtml(disc.name)}</h3>
        <p class="muted">${escapeHtml(disc.brand || "Okänt märke")} ${disc.plastic ? "· " + escapeHtml(disc.plastic) : ""}</p>

        <div>
          <span class="badge">${disc.speed || "?"}</span>
          <span class="badge">${disc.glide || "?"}</span>
          <span class="badge">${disc.turn || "?"}</span>
          <span class="badge">${disc.fade || "?"}</span>
        </div>

        <p class="muted small">${escapeHtml(disc.notes || "Ingen anteckning.")}</p>

        <div class="grid grid-2">
          <button class="btn" onclick="goTo('editDisc', { bagId: '${bag.id}', discId: '${disc.id}' })">Redigera</button>
          <button class="btn btn-danger" onclick="deleteDisc('${bag.id}', '${disc.id}')">Ta bort</button>
        </div>
      </section>
    `).join("")}
  `, bag.name);
}

function renderEditBag() {
  const bag = state.bags.find(b => b.id === state.currentParams?.bagId);
  if (!bag) return renderBags();

  return appLayout(`
    <section class="card">
      <h2>Redigera väska</h2>
      <label class="small muted">Namn</label>
      <input class="input" id="editBagName" value="${escapeAttr(bag.name)}">
      <label class="small muted">Byt bild</label>
      <input class="input" id="editBagImage" type="file" accept="image/*">
      <button class="btn btn-primary" onclick="saveEditedBag('${bag.id}')">Spara</button>
    </section>
  `, "Redigera väska");
}

function addBag() {
  const nameInput = document.getElementById("bagName");
  const imageInput = document.getElementById("bagImage");
  const name = nameInput.value.trim();

  if (!name) return alert("Ge väskan ett namn först.");

  const bag = { id: crypto.randomUUID(), name, image: "", discs: [] };
  const file = imageInput.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      bag.image = reader.result;
      saveBag(bag);
    };
    reader.readAsDataURL(file);
  } else saveBag(bag);
}

function saveBag(bag) {
  state.bags.push(bag);
  if (!state.player.activeBagId) state.player.activeBagId = bag.id;
  saveState();
  render();
}

function saveEditedBag(bagId) {
  const bag = state.bags.find(b => b.id === bagId);
  const name = document.getElementById("editBagName").value.trim();
  const imageInput = document.getElementById("editBagImage");

  if (!name) return alert("Väskan behöver ett namn.");
  bag.name = name;

  const file = imageInput.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      bag.image = reader.result;
      saveState();
      goBack();
    };
    reader.readAsDataURL(file);
  } else {
    saveState();
    goBack();
  }
}

function setActiveBag(id) {
  state.player.activeBagId = id;
  saveState();
  render();
}

function deleteBag(id) {
  if (!confirm("Ta bort väskan?")) return;
  state.bags = state.bags.filter(bag => bag.id !== id);
  if (state.player.activeBagId === id) state.player.activeBagId = null;
  saveState();
  setMainView("bags");
}

/* DISCS */

function renderAddDisc() {
  const bag = state.bags.find(b => b.id === state.currentParams?.bagId);
  if (!bag) return renderBags();

  return appLayout(`
    <section class="card">
      <h2>Lägg till disc</h2>
      <p class="muted">Lägg till en disc i ${escapeHtml(bag.name)}.</p>
      ${discFormHtml()}
      <button class="btn btn-primary" onclick="saveNewDisc('${bag.id}')">Spara disc</button>
    </section>
  `, "Ny disc");
}

function renderEditDisc() {
  const { bagId, discId } = state.currentParams || {};
  const bag = state.bags.find(b => b.id === bagId);
  const disc = bag?.discs.find(d => d.id === discId);
  if (!bag || !disc) return renderBags();

  return appLayout(`
    <section class="card">
      <h2>Redigera disc</h2>
      ${discFormHtml(disc)}
      <button class="btn btn-primary" onclick="saveEditedDisc('${bag.id}', '${disc.id}')">Spara ändringar</button>
    </section>
  `, disc.name);
}

function discFormHtml(disc = {}) {
  return `
    <label class="small muted">Namn</label>
    <input class="input" id="discName" placeholder="Ex: Nuke" value="${escapeAttr(disc.name || "")}">
    <label class="small muted">Märke</label>
    <input class="input" id="discBrand" placeholder="Ex: Discraft" value="${escapeAttr(disc.brand || "")}">
    <label class="small muted">Plast</label>
    <input class="input" id="discPlastic" placeholder="Ex: ESP / Z / Titanium" value="${escapeAttr(disc.plastic || "")}">
    <div class="grid grid-2">
      <input class="input" id="discSpeed" placeholder="Speed" value="${escapeAttr(disc.speed || "")}">
      <input class="input" id="discGlide" placeholder="Glide" value="${escapeAttr(disc.glide || "")}">
      <input class="input" id="discTurn" placeholder="Turn" value="${escapeAttr(disc.turn || "")}">
      <input class="input" id="discFade" placeholder="Fade" value="${escapeAttr(disc.fade || "")}">
    </div>
    <label class="small muted">Anteckning</label>
    <textarea class="input" id="discNotes" rows="4" placeholder="Ex: Trygg FH, skippar hårt, bra i motvind...">${escapeHtml(disc.notes || "")}</textarea>
  `;
}

function getDiscFormData() {
  const name = document.getElementById("discName").value.trim();
  if (!name) return alert("Discen behöver ett namn."), null;

  return {
    name,
    brand: document.getElementById("discBrand").value.trim(),
    plastic: document.getElementById("discPlastic").value.trim(),
    speed: document.getElementById("discSpeed").value.trim(),
    glide: document.getElementById("discGlide").value.trim(),
    turn: document.getElementById("discTurn").value.trim(),
    fade: document.getElementById("discFade").value.trim(),
    notes: document.getElementById("discNotes").value.trim()
  };
}

function saveNewDisc(bagId) {
  const bag = state.bags.find(b => b.id === bagId);
  const data = getDiscFormData();
  if (!bag || !data) return;

  bag.discs.push({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...data });
  saveState();
  goBack();
}

function saveEditedDisc(bagId, discId) {
  const bag = state.bags.find(b => b.id === bagId);
  const disc = bag?.discs.find(d => d.id === discId);
  const data = getDiscFormData();
  if (!bag || !disc || !data) return;

  Object.assign(disc, data, { updatedAt: new Date().toISOString() });
  saveState();
  goBack();
}

function deleteDisc(bagId, discId) {
  if (!confirm("Ta bort discen?")) return;
  const bag = state.bags.find(b => b.id === bagId);
  if (!bag) return;

  bag.discs = bag.discs.filter(disc => disc.id !== discId);
  saveState();
  render();
}

/* PROFILE */

function renderProfile() {
  const isAdmin = state.player.role === "admin";

  return appLayout(`
    <section class="card card-glow">
      <h2>Profil</h2>
      <label class="small muted">Spelarnamn</label>
      <input class="input" value="${escapeAttr(state.player.name)}" onchange="updatePlayerName(this.value)" />

      <div class="stat-row">
        <span>Roll</span>
        <strong>${escapeHtml(state.player.role)}</strong>
      </div>

      <div class="stat-row">
        <span>Rundor</span>
        <strong>${state.rounds.length}</strong>
      </div>
    </section>

    ${isAdmin ? `
      <section class="card">
        <h3>Adminverktyg</h3>
        <p class="muted">Dolt DevKit för banor, GPS-punkter och höjddata.</p>
        <button class="btn btn-primary" style="width:100%;" onclick="goTo('devkit')">Öppna DevKit</button>
      </section>
    ` : ""}
  `, "Profil");
}

function updatePlayerName(name) {
  state.player.name = name.trim() || "Spelare";
  saveState();
  render();
}

/* DEVKIT */

function renderDevkit() {
  if (state.player.role !== "admin") return appLayout(`<section class="card"><h2>Ingen åtkomst</h2></section>`);

  return appLayout(`
    <section class="card card-glow">
      <h2>DevKit</h2>
      <p class="muted">Bygg banor, slingor, hål och GPS-kartdata.</p>

      <div class="grid grid-2">
        <button class="btn btn-primary" onclick="goTo('devAddCourse')">Ny bana</button>
        <button class="btn" onclick="goTo('devDataTools')">Data/Backup</button>
      </div>
    </section>

    ${state.courses.map(course => `
      <section class="card">
        <h3>${escapeHtml(course.name)}</h3>
        <p class="muted">${escapeHtml(course.location)} · ${escapeHtml(course.status)}</p>
        <p class="muted small">${course.loops.length} slingor · ${course.loops.reduce((sum, loop) => sum + loop.holes.length, 0)} hål</p>

        <div class="grid grid-2">
          <button class="btn btn-primary" onclick="goTo('devCourse', { courseId: '${course.id}' })">Hantera</button>
          <button class="btn btn-danger" onclick="deleteCourse('${course.id}')">Ta bort</button>
        </div>
      </section>
    `).join("")}
  `, "DevKit");
}

function renderDevAddCourse() {
  return appLayout(`
    <section class="card">
      <h2>Ny bana</h2>
      ${courseFormHtml()}
      <button class="btn btn-primary" onclick="saveNewCourse()">Skapa bana</button>
    </section>
  `, "Ny bana");
}

function renderDevEditCourse() {
  const course = findCourse();
  if (!course) return renderDevkit();

  return appLayout(`
    <section class="card">
      <h2>Redigera bana</h2>
      ${courseFormHtml(course)}
      <button class="btn btn-primary" onclick="saveEditedCourse('${course.id}')">Spara bana</button>
    </section>
  `, "Redigera bana");
}

function courseFormHtml(course = {}) {
  return `
    <label class="small muted">Bannamn</label>
    <input class="input" id="courseName" placeholder="Ex: Tjärna Discgolfbana" value="${escapeAttr(course.name || "")}">
    <label class="small muted">Plats</label>
    <input class="input" id="courseLocation" placeholder="Ex: Borlänge" value="${escapeAttr(course.location || "")}">
    <label class="small muted">Svårighet / typ</label>
    <input class="input" id="courseDifficulty" placeholder="Ex: Teknisk / kuperad" value="${escapeAttr(course.difficulty || "")}">
    <label class="small muted">Status</label>
    <select class="input" id="courseStatus">
      ${["Öppen", "Stängd", "Under ombyggnad", "Vinterlayout", "Tävlingslayout"].map(status => `
        <option value="${status}" ${course.status === status ? "selected" : ""}>${status}</option>
      `).join("")}
    </select>
    <label class="small muted">Förvaltare</label>
    <input class="input" id="courseManager" placeholder="Ex: Tjärna Discgolfklubb" value="${escapeAttr(course.manager || "")}">
  `;
}

function getCourseFormData() {
  const name = document.getElementById("courseName").value.trim();
  if (!name) return alert("Banan behöver ett namn."), null;

  return {
    name,
    location: document.getElementById("courseLocation").value.trim(),
    difficulty: document.getElementById("courseDifficulty").value.trim(),
    status: document.getElementById("courseStatus").value,
    manager: document.getElementById("courseManager").value.trim()
  };
}

function saveNewCourse() {
  const data = getCourseFormData();
  if (!data) return;

  state.courses.push({ id: crypto.randomUUID(), ...data, loops: [] });
  saveState();
  goBack();
}

function saveEditedCourse(courseId) {
  const course = state.courses.find(c => c.id === courseId);
  const data = getCourseFormData();
  if (!course || !data) return;

  Object.assign(course, data);
  saveState();
  goBack();
}

function deleteCourse(courseId) {
  if (!confirm("Ta bort hela banan?")) return;
  state.courses = state.courses.filter(course => course.id !== courseId);
  saveState();
  render();
}

function renderDevCourse() {
  const course = findCourse();
  if (!course) return renderDevkit();

  return appLayout(`
    <section class="card card-glow">
      <h2>${escapeHtml(course.name)}</h2>
      <p class="muted">${escapeHtml(course.location)} · ${escapeHtml(course.difficulty)}</p>
      <span class="badge">${escapeHtml(course.status)}</span>
      <span class="badge">${escapeHtml(course.manager || "Ingen förvaltare")}</span>

      <div class="grid grid-2" style="margin-top:14px;">
        <button class="btn" onclick="goTo('devEditCourse', { courseId: '${course.id}' })">Redigera bana</button>
        <button class="btn btn-primary" onclick="goTo('devAddLoop', { courseId: '${course.id}' })">Ny slinga</button>
      </div>
    </section>

    ${course.loops.length === 0 ? `<section class="card"><p class="muted">Banan saknar slingor.</p></section>` : course.loops.map(loop => `
      <section class="card">
        <h3>${escapeHtml(loop.name)}</h3>
        <p class="muted">${loop.holes.length} hål</p>
        <div class="grid grid-2">
          <button class="btn btn-primary" onclick="goTo('devLoop', { courseId: '${course.id}', loopId: '${loop.id}' })">Hantera</button>
          <button class="btn btn-danger" onclick="deleteLoop('${course.id}', '${loop.id}')">Ta bort</button>
        </div>
      </section>
    `).join("")}
  `, "Hantera bana");
}

function renderDevAddLoop() {
  const course = findCourse();
  if (!course) return renderDevkit();

  return appLayout(`
    <section class="card">
      <h2>Ny slinga</h2>
      <p class="muted">${escapeHtml(course.name)}</p>
      <label class="small muted">Slingnamn</label>
      <input class="input" id="loopName" placeholder="Ex: Gul slinga">
      <button class="btn btn-primary" onclick="saveNewLoop('${course.id}')">Skapa slinga</button>
    </section>
  `, "Ny slinga");
}

function saveNewLoop(courseId) {
  const course = state.courses.find(c => c.id === courseId);
  const name = document.getElementById("loopName").value.trim();
  if (!course) return;
  if (!name) return alert("Slingan behöver ett namn.");

  course.loops.push({ id: crypto.randomUUID(), name, holes: [] });
  saveState();
  goBack();
}

function deleteLoop(courseId, loopId) {
  if (!confirm("Ta bort slingan?")) return;
  const course = state.courses.find(c => c.id === courseId);
  if (!course) return;

  course.loops = course.loops.filter(loop => loop.id !== loopId);
  saveState();
  render();
}

function renderDevLoop() {
  const course = findCourse();
  const loop = findLoop();
  if (!course || !loop) return renderDevkit();

  return appLayout(`
    <section class="card card-glow">
      <h2>${escapeHtml(loop.name)}</h2>
      <p class="muted">${escapeHtml(course.name)}</p>
      <div class="grid grid-2">
        <button class="btn" onclick="goTo('devEditLoop', { courseId: '${course.id}', loopId: '${loop.id}' })">Byt namn</button>
        <button class="btn btn-primary" onclick="goTo('devAddHole', { courseId: '${course.id}', loopId: '${loop.id}' })">Lägg till hål</button>
      </div>
    </section>

    ${loop.holes.length === 0 ? `<section class="card"><p class="muted">Slingan saknar hål.</p></section>` : loop.holes
      .slice()
      .sort((a, b) => a.number - b.number)
      .map(hole => `
        <section class="card">
          <h3>Hål ${hole.number}</h3>
          <p class="muted">Par ${hole.par} · ${hole.length} m · ${hole.mapPoints?.length || 0} kartpunkter</p>
          <p class="small muted">${escapeHtml(hole.note || "Ingen notering.")}</p>
          <div class="grid grid-2">
            <button class="btn" onclick="goTo('devEditHole', { courseId: '${course.id}', loopId: '${loop.id}', holeId: '${hole.id}' })">Redigera</button>
            <button class="btn btn-primary" onclick="goTo('devHoleMap', { courseId: '${course.id}', loopId: '${loop.id}', holeId: '${hole.id}' })">GPS/Karta</button>
          </div>
          <button class="btn btn-danger" style="width:100%; margin-top:10px;" onclick="deleteHole('${course.id}', '${loop.id}', '${hole.id}')">Ta bort</button>
        </section>
      `).join("")}
  `, "Hantera slinga");
}

function renderDevEditLoop() {
  const loop = findLoop();
  if (!loop) return renderDevkit();

  return appLayout(`
    <section class="card">
      <h2>Byt namn på slinga</h2>
      <label class="small muted">Slingnamn</label>
      <input class="input" id="loopName" value="${escapeAttr(loop.name)}">
      <button class="btn btn-primary" onclick="saveEditedLoop()">Spara</button>
    </section>
  `, "Redigera slinga");
}

function saveEditedLoop() {
  const loop = findLoop();
  const name = document.getElementById("loopName").value.trim();
  if (!loop) return;
  if (!name) return alert("Slingan behöver ett namn.");

  loop.name = name;
  saveState();
  goBack();
}

function renderDevAddHole() {
  const loop = findLoop();
  if (!loop) return renderDevkit();

  return appLayout(`
    <section class="card">
      <h2>Lägg till hål</h2>
      ${holeFormHtml({ number: loop.holes.length + 1, par: 3, length: 0, note: "" })}
      <button class="btn btn-primary" onclick="saveNewHole()">Spara hål</button>
    </section>
  `, "Nytt hål");
}

function renderDevEditHole() {
  const hole = findHole();
  if (!hole) return renderDevkit();

  return appLayout(`
    <section class="card">
      <h2>Redigera hål</h2>
      ${holeFormHtml(hole)}
      <button class="btn btn-primary" onclick="saveEditedHole()">Spara hål</button>
    </section>
  `, "Redigera hål");
}

function holeFormHtml(hole = {}) {
  return `
    <label class="small muted">Hålnummer</label>
    <input class="input" id="holeNumber" type="number" value="${escapeAttr(hole.number ?? "")}">
    <label class="small muted">Par</label>
    <input class="input" id="holePar" type="number" value="${escapeAttr(hole.par ?? 3)}">
    <label class="small muted">Längd meter</label>
    <input class="input" id="holeLength" type="number" value="${escapeAttr(hole.length ?? 0)}">
    <label class="small muted">Hålnotering</label>
    <textarea class="input" id="holeNote" rows="4" placeholder="Ex: Mando vänster, OB långt, trygg FH med Zone...">${escapeHtml(hole.note || "")}</textarea>
  `;
}

function getHoleFormData() {
  const number = Number(document.getElementById("holeNumber").value);
  const par = Number(document.getElementById("holePar").value);
  const length = Number(document.getElementById("holeLength").value);
  const note = document.getElementById("holeNote").value.trim();

  if (!number || number < 1) return alert("Hålet behöver ett giltigt nummer."), null;
  if (!par || par < 1) return alert("Hålet behöver ett giltigt par."), null;

  return { number, par, length, note };
}

function saveNewHole() {
  const loop = findLoop();
  const data = getHoleFormData();
  if (!loop || !data) return;

  loop.holes.push({ id: crypto.randomUUID(), ...data, mapPoints: [] });
  saveState();
  goBack();
}

function saveEditedHole() {
  const hole = findHole();
  const data = getHoleFormData();
  if (!hole || !data) return;

  Object.assign(hole, data);
  saveState();
  goBack();
}

function deleteHole(courseId, loopId, holeId) {
  if (!confirm("Ta bort hålet?")) return;
  const loop = state.courses.find(c => c.id === courseId)?.loops.find(l => l.id === loopId);
  if (!loop) return;

  loop.holes = loop.holes.filter(hole => hole.id !== holeId);
  saveState();
  render();
}

/* GPS / MAP POINTS */

function renderDevHoleMap() {
  const hole = findHole();
  if (!hole) return renderDevkit();

  hole.mapPoints ??= [];

  return appLayout(`
    <section class="card card-glow">
      <h2>Hål ${hole.number} · GPS/Karta</h2>
      <p class="muted">Spara tee, korg, fairway, mando, OB, drop zone och höjdpunkter.</p>

      <div class="grid grid-2">
        <button class="btn btn-primary" onclick="capturePoint('tee')">Sätt Tee GPS</button>
        <button class="btn btn-primary" onclick="capturePoint('basket')">Sätt Korg GPS</button>
        <button class="btn" onclick="capturePoint('fairway')">+ Fairway</button>
        <button class="btn" onclick="capturePoint('landingzone')">+ Landing zone</button>
        <button class="btn" onclick="capturePoint('mando')">+ Mando</button>
        <button class="btn" onclick="capturePoint('ob')">+ OB-punkt</button>
        <button class="btn" onclick="capturePoint('dropzone')">+ Drop Zone</button>
        <button class="btn" onclick="capturePoint('elevation')">+ Höjdpunkt</button>
      </div>

      <button class="btn" style="width:100%; margin-top:12px;" onclick="goTo('devAddManualPoint', state.currentParams)">
        Lägg till punkt manuellt
      </button>
    </section>

    ${renderHjordisPreview(hole)}

    ${hole.mapPoints.length === 0 ? `
      <section class="card"><p class="muted">Inga kartpunkter än.</p></section>
    ` : hole.mapPoints.map(point => `
      <section class="card">
        <h3>${getPointLabel(point.type)}</h3>
        <p class="muted small">
          Lat: ${formatCoord(point.lat)}<br>
          Lng: ${formatCoord(point.lng)}<br>
          Höjd: ${formatElevation(point.elevation)}<br>
          GPS-noggrannhet: ${formatAccuracy(point.accuracy)}<br>
          Höjd-noggrannhet: ${formatAccuracy(point.altitudeAccuracy)}
        </p>
        ${point.note ? `<p>${escapeHtml(point.note)}</p>` : ""}

        <div class="grid grid-2">
          <button class="btn" onclick="goTo('devEditPoint', { ...state.currentParams, pointId: '${point.id}' })">Redigera</button>
          <button class="btn btn-danger" onclick="deleteMapPoint('${point.id}')">Ta bort</button>
        </div>
      </section>
    `).join("")}
  `, "GPS/Karta");
}

function renderHjordisPreview(hole) {
  const tee = getPointByType(hole, "tee");
  const basket = getPointByType(hole, "basket");

  if (!tee || !basket) {
    return `
      <section class="card">
        <h3>Hjördis-preview</h3>
        <p class="muted">Sätt minst tee och korg för att kunna räkna avstånd och höjdskillnad.</p>
      </section>
    `;
  }

  const distance = haversineMeters(tee.lat, tee.lng, basket.lat, basket.lng);
  const elevationDiff = estimateElevationDiff(tee, basket, hole.mapPoints);

  return `
    <section class="card">
      <h3>Hjördis-preview</h3>
      <p>
        Från tee till korg är det cirka <strong>${Math.round(distance)} m</strong>.
        ${elevationDiff !== null ? `Korgen ligger cirka <strong>${formatSigned(elevationDiff)} m</strong> relativt tee.` : "Höjdskillnad saknas ännu."}
      </p>
      <p class="muted small">Detta är bara baserat på inmätta punkter. Senare används spelarens live-position.</p>
    </section>
  `;
}

function capturePoint(type) {
  const hole = findHole();
  if (!hole) return;

  if (!navigator.geolocation) {
    alert("Den här enheten/webbläsaren stödjer inte GPS.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      const coords = position.coords;

      const existingIndex = hole.mapPoints.findIndex(p => ["tee", "basket"].includes(type) && p.type === type);

      const point = {
        id: crypto.randomUUID(),
        type,
        lat: coords.latitude,
        lng: coords.longitude,
        elevation: coords.altitude,
        manualElevation: "",
        accuracy: coords.accuracy,
        altitudeAccuracy: coords.altitudeAccuracy,
        note: "",
        capturedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) hole.mapPoints[existingIndex] = point;
      else hole.mapPoints.push(point);

      saveState();
      render();
    },
    error => {
      alert("Kunde inte hämta GPS-position: " + error.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

function renderDevAddManualPoint() {
  return appLayout(`
    <section class="card">
      <h2>Manuell kartpunkt</h2>
      ${mapPointFormHtml()}
      <button class="btn btn-primary" onclick="saveManualPoint()">Spara punkt</button>
    </section>
  `, "Ny kartpunkt");
}

function renderDevEditPoint() {
  const point = findMapPoint();
  if (!point) return renderDevHoleMap();

  return appLayout(`
    <section class="card">
      <h2>Redigera kartpunkt</h2>
      ${mapPointFormHtml(point)}
      <button class="btn btn-primary" onclick="saveEditedMapPoint('${point.id}')">Spara punkt</button>
    </section>
  `, "Redigera punkt");
}

function mapPointFormHtml(point = {}) {
  return `
    <label class="small muted">Typ</label>
    <select class="input" id="pointType">
      ${POINT_TYPES.map(type => `
        <option value="${type.value}" ${point.type === type.value ? "selected" : ""}>${type.label}</option>
      `).join("")}
    </select>

    <label class="small muted">Latitud</label>
    <input class="input" id="pointLat" type="number" step="any" value="${escapeAttr(point.lat ?? "")}">

    <label class="small muted">Longitud</label>
    <input class="input" id="pointLng" type="number" step="any" value="${escapeAttr(point.lng ?? "")}">

    <label class="small muted">Höjd meter</label>
    <input class="input" id="pointElevation" type="number" step="any" value="${escapeAttr(point.elevation ?? point.manualElevation ?? "")}">

    <label class="small muted">GPS-noggrannhet meter</label>
    <input class="input" id="pointAccuracy" type="number" step="any" value="${escapeAttr(point.accuracy ?? "")}">

    <label class="small muted">Anteckning</label>
    <textarea class="input" id="pointNote" rows="3" placeholder="Ex: precis förbi mando på rätt sida...">${escapeHtml(point.note || "")}</textarea>
  `;
}

function getMapPointFormData() {
  const type = document.getElementById("pointType").value;
  const lat = parseFloat(document.getElementById("pointLat").value);
  const lng = parseFloat(document.getElementById("pointLng").value);
  const elevationRaw = document.getElementById("pointElevation").value;
  const accuracyRaw = document.getElementById("pointAccuracy").value;
  const note = document.getElementById("pointNote").value.trim();

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    alert("Punkten behöver latitud och longitud.");
    return null;
  }

  return {
    type,
    lat,
    lng,
    elevation: elevationRaw === "" ? null : Number(elevationRaw),
    manualElevation: elevationRaw,
    accuracy: accuracyRaw === "" ? null : Number(accuracyRaw),
    altitudeAccuracy: null,
    note
  };
}

function saveManualPoint() {
  const hole = findHole();
  const data = getMapPointFormData();
  if (!hole || !data) return;

  const existingIndex = hole.mapPoints.findIndex(p => ["tee", "basket"].includes(data.type) && p.type === data.type);

  const point = {
    id: crypto.randomUUID(),
    ...data,
    capturedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) hole.mapPoints[existingIndex] = point;
  else hole.mapPoints.push(point);

  saveState();
  goBack();
}

function saveEditedMapPoint(pointId) {
  const point = findMapPoint();
  const data = getMapPointFormData();
  if (!point || !data) return;

  Object.assign(point, data, { updatedAt: new Date().toISOString() });
  saveState();
  goBack();
}

function deleteMapPoint(pointId) {
  if (!confirm("Ta bort kartpunkten?")) return;
  const hole = findHole();
  if (!hole) return;

  hole.mapPoints = hole.mapPoints.filter(point => point.id !== pointId);
  saveState();
  render();
}

/* DATA TOOLS */

function renderDevDataTools() {
  return appLayout(`
    <section class="card card-glow">
      <h2>Data / Backup</h2>
      <p class="muted">Exportera och importera all lokal Hjördisc-data.</p>

      <button class="btn btn-primary" style="width:100%; margin-bottom:10px;" onclick="exportData()">Exportera data</button>

      <label class="small muted">Importera JSON</label>
      <textarea class="input" id="importDataBox" rows="8" placeholder="Klistra in exporterad JSON här..."></textarea>
      <button class="btn" style="width:100%;" onclick="importData()">Importera data</button>
    </section>

    <section class="card">
      <h3>Farlig zon</h3>
      <p class="muted">Nollställer all lokal testdata.</p>
      <button class="btn btn-danger" style="width:100%;" onclick="resetAllData()">Nollställ allt</button>
    </section>
  `, "Backup");
}

function exportData() {
  const data = JSON.stringify(state, null, 2);

  navigator.clipboard.writeText(data)
    .then(() => alert("Data kopierad till urklipp."))
    .catch(() => alert(data));
}

function importData() {
  const raw = document.getElementById("importDataBox").value.trim();
  if (!raw) return alert("Klistra in JSON först.");

  try {
    state = JSON.parse(raw);
    migrateState();
    saveState();
    alert("Data importerad.");
    setMainView("home");
  } catch {
    alert("Kunde inte läsa JSON. Något är fel i texten.");
  }
}

function resetAllData() {
  if (!confirm("Nollställa ALL lokal data?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = structuredClone(defaultState);
  saveState();
  render();
}

/* STATS */

function renderStats() {
  const rounds = state.rounds;

  return appLayout(`
    <section class="card">
      <h2>Statistik</h2>
      <p class="muted">Första grunden för rundrating, vardagsrating, streaks och Hjördis-analys.</p>

      <div class="stat-row">
        <span>Rundor</span>
        <strong>${rounds.length}</strong>
      </div>

      <div class="stat-row">
        <span>Bästa runda</span>
        <strong>${state.player.bestRound === null ? "Ej satt" : formatScore(state.player.bestRound)}</strong>
      </div>

      <div class="stat-row">
        <span>Vardagsrating</span>
        <strong>${rounds.length >= 10 ? "Redo att räknas" : `${10 - rounds.length} rundor kvar`}</strong>
      </div>
    </section>

    ${rounds.map(round => `
      <section class="card">
        <h3>${escapeHtml(round.courseName)}</h3>
        <p class="muted">${escapeHtml(round.loopName)}</p>
        <span class="badge">${formatScore(round.totalToPar)}</span>
        <span class="badge">${round.totalThrows} kast</span>
      </section>
    `).join("")}
  `, "Statistik");
}

/* FINDERS */

function findCourse() {
  return state.courses.find(c => c.id === state.currentParams?.courseId);
}

function findLoop() {
  return findCourse()?.loops.find(l => l.id === state.currentParams?.loopId);
}

function findHole() {
  return findLoop()?.holes.find(h => h.id === state.currentParams?.holeId);
}

function findMapPoint() {
  return findHole()?.mapPoints.find(p => p.id === state.currentParams?.pointId);
}

function getPointByType(hole, type) {
  return hole.mapPoints?.find(point => point.type === type);
}

/* HELPERS */

function getPointLabel(type) {
  return POINT_TYPES.find(item => item.value === type)?.label || type;
}

function getScoreName(throws, par) {
  if (throws === 0) return "Ej ifyllt";
  if (throws === 1) return "ACE";
  if (throws === par - 3) return "Albatross";
  if (throws === par - 2) return "Eagle";
  if (throws === par - 1) return "Birdie";
  if (throws === par) return "Par";
  if (throws === par + 1) return "Bogey";
  if (throws > par + 1) return `+${throws - par}`;
  return `${throws - par}`;
}

function formatScore(score) {
  if (score === 0) return "E";
  return score > 0 ? `+${score}` : `${score}`;
}

function formatCoord(value) {
  return value === null || value === undefined || value === "" ? "saknas" : Number(value).toFixed(6);
}

function formatElevation(value) {
  return value === null || value === undefined || value === "" ? "saknas" : `${Number(value).toFixed(1)} m`;
}

function formatAccuracy(value) {
  return value === null || value === undefined || value === "" ? "saknas" : `±${Number(value).toFixed(1)} m`;
}

function formatSigned(value) {
  if (value > 0) return `+${value.toFixed(1)}`;
  return value.toFixed(1);
}

function estimateElevationDiff(fromPoint, toPoint, allPoints = []) {
  const fromElevation = getUsableElevation(fromPoint, allPoints);
  const toElevation = getUsableElevation(toPoint, allPoints);

  if (fromElevation === null || toElevation === null) return null;
  return toElevation - fromElevation;
}

function getUsableElevation(point, allPoints = []) {
  if (Number.isFinite(Number(point.elevation))) return Number(point.elevation);

  const nearby = allPoints
    .filter(p => Number.isFinite(Number(p.elevation)))
    .map(p => ({
      elevation: Number(p.elevation),
      distance: haversineMeters(point.lat, point.lng, p.lat, p.lng)
    }))
    .sort((a, b) => a.distance - b.distance)[0];

  return nearby ? nearby.elevation : null;
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = deg => deg * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

/* RENDER */

function render() {
  const app = document.getElementById("app");

  if (state.currentView === "home") app.innerHTML = renderHome();
  if (state.currentView === "play") app.innerHTML = renderPlay();
  if (state.currentView === "bags") app.innerHTML = renderBags();
  if (state.currentView === "bagDetail") app.innerHTML = renderBagDetail();
  if (state.currentView === "editBag") app.innerHTML = renderEditBag();
  if (state.currentView === "addDisc") app.innerHTML = renderAddDisc();
  if (state.currentView === "editDisc") app.innerHTML = renderEditDisc();
  if (state.currentView === "stats") app.innerHTML = renderStats();
  if (state.currentView === "profile") app.innerHTML = renderProfile();

  if (state.currentView === "devkit") app.innerHTML = renderDevkit();
  if (state.currentView === "devAddCourse") app.innerHTML = renderDevAddCourse();
  if (state.currentView === "devEditCourse") app.innerHTML = renderDevEditCourse();
  if (state.currentView === "devCourse") app.innerHTML = renderDevCourse();
  if (state.currentView === "devAddLoop") app.innerHTML = renderDevAddLoop();
  if (state.currentView === "devEditLoop") app.innerHTML = renderDevEditLoop();
  if (state.currentView === "devLoop") app.innerHTML = renderDevLoop();
  if (state.currentView === "devAddHole") app.innerHTML = renderDevAddHole();
  if (state.currentView === "devEditHole") app.innerHTML = renderDevEditHole();
  if (state.currentView === "devHoleMap") app.innerHTML = renderDevHoleMap();
  if (state.currentView === "devAddManualPoint") app.innerHTML = renderDevAddManualPoint();
  if (state.currentView === "devEditPoint") app.innerHTML = renderDevEditPoint();
  if (state.currentView === "devDataTools") app.innerHTML = renderDevDataTools();
}

render();