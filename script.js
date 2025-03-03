// Global variables
let grid = [];
let wordPositions = []; // stores strings "r,c" for each letter that is part of a word
let blacklist = [];
let currentRows = 0, currentCols = 0;

// Global array to hold words that couldn't be placed
let failedWords = [];

// Remove the fixed global directions array. Instead, get allowed directions on the fly.

// Event listeners
document.getElementById("generateBtn").addEventListener("click", generateWordSearch);
document.getElementById("words").addEventListener("input", validateWordsInput);
document.getElementById("spaces").addEventListener("change", () => {
  // Re-render the grid with or without spaces if a grid exists.
  if (currentRows && currentCols) {
    renderGrid(currentRows, currentCols, document.getElementById("spaces").checked);
  }
});
document.getElementById("darkMode").addEventListener("change", toggleDarkMode);

// Disable Generate button if words box is empty
function validateWordsInput() {
  const wordsValue = document.getElementById("words").value.trim();
  document.getElementById("generateBtn").disabled = wordsValue.length === 0;
}

// Load profanity blacklist from an external file.
function loadBlacklist() {
  fetch("blacklist.txt")
    .then(response => response.text())
    .then(text => {
      // Assume one word per line; convert to uppercase.
      blacklist = text.split("\n")
                      .map(word => word.trim().toUpperCase())
                      .filter(word => word.length > 0);
    })
    .catch(err => {
      console.error("Failed to load blacklist.txt", err);
      blacklist = []; // Fallback: empty blacklist
    });
}

// Call loadBlacklist when the page loads.
loadBlacklist();

// Returns an array of allowed direction objects based on user options.
function getAllowedDirections() {
  let allowDiagonals = document.getElementById("allowDiagonals").checked;
  let allowReverse = document.getElementById("allowReverse").checked;
  let allDirections = [
    { r: 0, c: 1 },    // Right
    { r: 0, c: -1 },   // Left
    { r: 1, c: 0 },    // Down
    { r: -1, c: 0 },   // Up
    { r: 1, c: 1 },    // Down-right
    { r: 1, c: -1 },   // Down-left
    { r: -1, c: 1 },   // Up-right
    { r: -1, c: -1 }   // Up-left
  ];
  if (!allowDiagonals) {
    // Remove any direction that is diagonal (both r and c nonzero)
    allDirections = allDirections.filter(dir => !(dir.r !== 0 && dir.c !== 0));
  }
  if (!allowReverse) {
    // Remove directions that go right-to-left (negative c values)
    allDirections = allDirections.filter(dir => dir.c >= 0);
  }
  return allDirections;
}

// Global function to generate word search
function generateWordSearch() {
  // Clear warnings
  document.getElementById("warnings").textContent = "";
  failedWords = [];

  // Get user inputs
  const rows = parseInt(document.getElementById("rows").value, 10);
  const cols = parseInt(document.getElementById("cols").value, 10);
  currentRows = rows;
  currentCols = cols;

  const wordsInput = document.getElementById("words").value;
  const showSpaces = document.getElementById("spaces").checked;

  // Create empty grid and clear word positions
  grid = Array.from({ length: rows }, () => Array(cols).fill(""));
  wordPositions = []; // clear previous positions

  // Parse and clean up word list (split on newlines)
  let words = wordsInput.split("\n")
    .map(word => word.trim().toUpperCase())
    .filter(word => word.length > 0);

  // Calculate total letters in the word list
  let totalLetters = words.reduce((sum, word) => sum + word.length, 0);
  let gridCells = rows * cols;
  let warnings = [];

  if (totalLetters > gridCells) {
    warnings.push("Warning: Total letters of words exceed available grid cells. Some words may not be placed.");
  }
  if (gridCells < 50) {
    warnings.push("Warning: The grid is very small; generating a valid grid may be difficult.");
  }

  // Get allowed directions based on user options.
  let allowedDirections = getAllowedDirections();

  // Place each word in the grid randomly.
  words.forEach(word => {
    if (!placeWordInGrid(word, rows, cols, allowedDirections)) {
      failedWords.push(word);
    }
  });

  // If any words failed to be placed, add a warning.
  if (failedWords.length > 0) {
    warnings.push("Warning: The following words could not be placed. Consider increasing the grid size or reducing the number of words: " + failedWords.join(", "));
  }

  // Display warnings if any.
  if (warnings.length > 0) {
    document.getElementById("warnings").innerHTML = warnings.join("<br>");
  }

  // Fill in empty cells with random letters
  fillEmptyCells(rows, cols);

  // Check and remove accidental profane words from the grid (using blacklist)
  removeProfanity(rows, cols);

  // Render the grids
  renderGrid(rows, cols, showSpaces);
}

// Attempt to place a word in the grid at random positions/directions.
// Returns true if the word was placed, false otherwise.
function placeWordInGrid(word, rows, cols, allowedDirections) {
  const maxAttempts = 100;
  let placed = false;

  for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
    // Choose random starting point and random direction from allowedDirections.
    const startRow = Math.floor(Math.random() * rows);
    const startCol = Math.floor(Math.random() * cols);
    const dir = allowedDirections[Math.floor(Math.random() * allowedDirections.length)];

    // Check if word fits within bounds.
    const endRow = startRow + dir.r * (word.length - 1);
    const endCol = startCol + dir.c * (word.length - 1);
    if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) {
      continue;
    }

    // Check if path is clear or already matches the required letters (allows crossing)
    let validPlacement = true;
    let tempPositions = [];
    for (let i = 0; i < word.length; i++) {
      const r = startRow + dir.r * i;
      const c = startCol + dir.c * i;
      const currentLetter = grid[r][c];
      if (currentLetter !== "" && currentLetter !== word[i]) {
        validPlacement = false;
        break;
      }
      tempPositions.push({ r, c });
    }

    if (!validPlacement) continue;

    // Place the word in the grid and record its letter positions.
    for (let i = 0; i < word.length; i++) {
      const { r, c } = tempPositions[i];
      grid[r][c] = word[i];
      wordPositions.push(`${r},${c}`);
    }
    placed = true;
  }
  return placed;
}

// Fill remaining empty grid cells with random letters A-Z.
function fillEmptyCells(rows, cols) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = letters.charAt(Math.floor(Math.random() * letters.length));
      }
    }
  }
}

// Check rows and columns for accidental profane words (using blacklist)
// and alter one letter to break any profanity.
function removeProfanity(rows, cols) {
  function randomReplace(letter) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let newLetter = letter;
    while(newLetter === letter) {
      newLetter = letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return newLetter;
  }

  // Check horizontal (rows)
  for (let r = 0; r < rows; r++) {
    let rowStr = grid[r].join("");
    blacklist.forEach(badWord => {
      let idx = rowStr.indexOf(badWord);
      while (idx !== -1) {
        const replacePos = idx + Math.floor(Math.random() * badWord.length);
        grid[r][replacePos] = randomReplace(grid[r][replacePos]);
        rowStr = grid[r].join("");
        idx = rowStr.indexOf(badWord);
      }
    });
  }

  // Check vertical (columns)
  for (let c = 0; c < cols; c++) {
    let colStr = "";
    for (let r = 0; r < rows; r++) {
      colStr += grid[r][c];
    }
    blacklist.forEach(badWord => {
      let idx = colStr.indexOf(badWord);
      while (idx !== -1) {
        const replaceRow = idx + Math.floor(Math.random() * badWord.length);
        grid[replaceRow][c] = randomReplace(grid[replaceRow][c]);
        colStr = "";
        for (let r = 0; r < rows; r++) {
          colStr += grid[r][c];
        }
        idx = colStr.indexOf(badWord);
      }
    });
  }
  // (Optional: diagonal checks could be added if needed)
}

// Render the plain grid and the grid with revealed words (with bold for placed words).
function renderGrid(rows, cols, showSpaces) {
  const gridOutput = document.getElementById("gridOutput");
  const revealedOutput = document.getElementById("revealedOutput");
  let plainText = "";
  let revealedText = "";

  const separator = showSpaces ? " " : "";

  for (let r = 0; r < rows; r++) {
    let rowPlain = [];
    let rowRevealed = [];
    for (let c = 0; c < cols; c++) {
      let letter = grid[r][c];
      rowPlain.push(letter);
      if (wordPositions.includes(`${r},${c}`)) {
        rowRevealed.push(`<b>${letter}</b>`);
      } else {
        rowRevealed.push(letter);
      }
    }
    plainText += rowPlain.join(separator) + "\n";
    revealedText += rowRevealed.join(separator) + "\n";
  }
  gridOutput.textContent = plainText;
  revealedOutput.innerHTML = revealedText;
}

// Toggle dark mode by adding or removing the 'dark-mode' class on the body.
function toggleDarkMode(event) {
  if (event.target.checked) {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
}
