// static/script.js (FULL replacement)

// global state
let deck = [];
let flippedCards = [];   // DOM elements of currently flipped cards (max 2)
let lockBoard = false;   // prevents clicking while evaluating
let matchedPairs = 0;    // count matched pairs
let timerInterval = null;
let timeLeft = 0;


// start a new game by fetching the shuffled deck from the backend
// start a new game by fetching the shuffled deck from the backend

// Preload all card images so they don't lag when flipped
function preloadImages(deck) {
  deck.forEach(file => {
    const img = new Image();
    img.src = `/static/images/${file}`;
  });
}


// Force refresh (F5) to go to home page
if (performance.navigation.type === 1) {
  window.location.href = "/";
}

async function startNewGame() {
  try {
    // Try to get mode from hidden input (game.html)
    const hiddenMode = document.getElementById("initial-mode");
    let mode = hiddenMode ? hiddenMode.value : null;

    // Fallback: if running directly with select dropdown (old setup)
    if (!mode) {
      const modeSelect = document.getElementById("mode");
      mode = modeSelect ? modeSelect.value : "easy";
    }

    const res = await fetch(`/new-game?mode=${mode}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    deck = data.deck || [];
    preloadImages(deck);
    matchedPairs = 0;
    flippedCards = [];
    lockBoard = false;

    // set time based on total pairs
    const totalPairs = deck.length / 2;
    if (totalPairs === 5) {
      timeLeft = 30;   // 30 seconds
    } else if (totalPairs === 10) {
      timeLeft = 45;   // 1 minute
    } else if (totalPairs === 15) {
      timeLeft = 60;  // 2 minutes
    } else if (totalPairs === 20) {
      timeLeft = 80;  // 3 minutes (expert)
    } else {
      timeLeft = 90;   // fallback
    }
    startTimer();

    renderBoard(deck, mode);
  } catch (err) {
    console.error('Failed to start new game:', err);
    alert('Could not start a new game. Check console for details.');
  }
}



function startTimer() {
  clearInterval(timerInterval);
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      triggerLose();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const timerEl = document.getElementById("timer");
  if (timerEl) {
    timerEl.textContent = `Time: ${timeLeft}s`;
  }
}


// render the board DOM (deck: array of filenames, mode: "easy"/"medium"/"hard")
function renderBoard(deck, mode) {
  const container = document.getElementById("game-container");
  if (!container) {
    console.error("No #game-container element found.");
    return;
  }
  container.innerHTML = "";

  // Determine grid dimensions that exactly fit the deck
  let columns = 5, rows = 2; // default easy (5x2 = 10)
  if (mode === "easy") {
    columns = 5; rows = 2;   // 10 cards
  } else if (mode === "medium") {
    columns = 5; rows = 4;   // 20 cards
  } else if (mode === "hard") {
    columns = 6; rows = 5;   // 30 cards
  } else if (mode === "expert") {
    columns = 5; rows = 8;   // 40 cards
  } else {
    columns = 5; rows = 4;   // fallback
  }

  // Explicit grid sizing so every row has equal cards
  container.style.display = "grid";
  container.style.gridTemplateColumns = `repeat(${columns}, 120px)`;
  container.style.gridTemplateRows = `repeat(${rows}, 120px)`;
  container.style.gap = "15px";
  container.style.justifyContent = "center";

  // Render each card
  deck.forEach((cardFileName, idx) => {
    const div = document.createElement("div");
    div.className = "card";
    div.dataset.card = cardFileName;   // e.g. "char_1.png"
    div.dataset.index = String(idx);   // a unique index
    // initial (hidden) mask image
    div.style.backgroundImage = "url('/static/images/mask.png')";
    div.addEventListener("click", () => flipCard(div));
    container.appendChild(div);
  });
}

// flipCard is the click handler attached to each card element
function flipCard(cardEl) {
  if (lockBoard) return;
  if (!cardEl) return;
  if (cardEl.classList.contains("flipped")) return;
  if (cardEl.classList.contains("matched")) return;

  // show face
  flipToFace(cardEl);

  // track flipped cards
  flippedCards.push(cardEl);

  if (flippedCards.length === 2) {
    checkForMatch();
  }
}

function flipToFace(cardEl) {
  const file = cardEl.dataset.card;
  cardEl.classList.add("flipped");
  cardEl.style.backgroundImage = `url('/static/images/${file}')`;
}

function flipToMask(cardEl) {
  cardEl.classList.remove("flipped");
  cardEl.style.backgroundImage = "url('/static/images/mask.png')";
}

function checkForMatch() {
  if (flippedCards.length < 2) return;
  const [c1, c2] = flippedCards;

  // Safety: if user somehow clicked the same DOM element twice
  if (c1.dataset.index === c2.dataset.index) {
    setTimeout(() => {
      flipToMask(c2);
      flippedCards = [];
    }, 150);
    return;
  }

  // Compare filenames
  if (c1.dataset.card === c2.dataset.card) {
    // MATCH: keep them shown and mark matched
    c1.classList.add("matched");
    c2.classList.add("matched");
    c1.style.pointerEvents = "none";
    c2.style.pointerEvents = "none";
    flippedCards = [];
    matchedPairs += 1;

    // WIN check
    const totalPairs = deck.length / 2;
    if (matchedPairs >= totalPairs) {
      clearInterval(timerInterval);  // stop timer
      setTimeout(() => {
        showCelebration();
      }, 500);
    }
  } else {
    // NOT A MATCH: lock and flip both back after a short delay
    lockBoard = true;
    setTimeout(() => {
      flipToMask(c1);
      flipToMask(c2);
      flippedCards = [];
      lockBoard = false;
    }, 900);
  }
}


function showCelebration() {
  const overlay = document.getElementById("celebration-overlay");
  const video = document.getElementById("celebration-video");
  const unmuteBtn = document.getElementById("unmute-btn");

  overlay.style.display = "flex";

  if (video) {
    video.currentTime = 0;
    video.muted = false;  // start muted
    video.play();
  }


  const btn = document.getElementById("celebration-btn");
  if (btn) {
    btn.onclick = () => {
      overlay.style.display = "none";
      if (video) video.pause();
      window.location.href = "/";
    };
  }
}

function triggerLose() {
  const overlay = document.getElementById("lose-overlay");
  const video = document.getElementById("lose-video");
  if (!overlay) return;

  overlay.style.display = "flex";

  if (video) {
    video.currentTime = 0;
    video.muted = false;   // play with sound
    video.play();
  }

  const btn = document.getElementById("lose-btn");
  if (btn) {
    btn.onclick = () => {
      overlay.style.display = "none";
      if (video) video.pause();
      startNewGame();
    };
  }
}


// Auto-start the first game when page loads
// Auto-start when page loads
window.addEventListener("load", () => {
  startNewGame();

  // Allow in-game mode switching
  const modeSwitcher = document.getElementById("mode-in-game");
  if (modeSwitcher) {
    modeSwitcher.value = document.getElementById("initial-mode").value; // set current mode
    modeSwitcher.addEventListener("change", () => {
      const newMode = modeSwitcher.value;
      window.location.href = `/game?mode=${newMode}`;
    });
  }

  // Back to home when New Game button is clicked
  const backBtn = document.getElementById("back-home");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "/";
    });
  }
});
