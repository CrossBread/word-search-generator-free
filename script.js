// List of profane words to check (add more words as needed)
const profaneWords = ["DAMN", "HELL"]; // all uppercase for comparison

// Possible directions for word placement (rowDelta, colDelta)
const directions = [
  { r: 0,  c: 1 },   // Right
  { r: 0,  c: -1 },  // Left
  { r: 1,  c: 0 },   // Down
  { r: -1, c: 0 },   // Up
  { r: 1,  c: 1 },   // Down-right
  { r: 1,  c: -1 },  // Down-left
  { r: -1, c: 1 },   // Up-right
  { r: -1, c: -1 }   // Up-left
];

document.getElementById("generateBtn").addEventListener("click", generateWordSearch);
document.getElementById("copyBtn").addEventListener("click", copyGrid);
document.getElementById("darkMode").addEventListener("change", toggleDarkMode);

// Global grid variables
let grid = [];
let wordPositions = []; // stores objects: {row, col} for each letter that is part of a word

function generateWordSearch() {
  // Get user inputs
  const rows = parseInt(document.getElementById("rows").value, 10);
  const cols = parseInt(document.getElementById("cols").value, 10);
  const wordsInput = document.getElementById("words").value;
  const insertSpaces = document.getElementById("spaces").checked;

  // Create empty grid and clear word positions
  grid = Array.from({ length: rows }, () => Array(cols).fill(""));
  wordPositions = []; // clear previous positions

  // Parse and clean up word list (split on newlines)
  let words = wordsInput.split("\n")
    .map(word => word.trim().toUpperCase())
    .filter(word => word.length > 0);

  // Place each word in the grid randomly
  words.forEach(word => {
    placeWordInGrid(word, rows, cols);
  });

  // Fill in empty cells with random letters
  fillEmptyCells(rows, cols);

  // Check and remove accidental profane words from the grid
  removeProfanity(rows, cols);

  // Render the grids
  renderGrid(rows, cols, insertSpaces);
}

// Attempt to place a word in the grid at random positions/directions
function placeWordInGrid(word, rows, cols) {
  const maxAttempts = 100;
  let placed = false;

  for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
    // choose random starting point and direction
    const startRow = Math.floor(Math.random() * rows);
    const startCol = Math.floor(Math.random() * cols);
    const dir = directions[Math.floor(Math.random() * directions.length)];

    // Check if word fits within bounds
    const endRow = startRow + dir.r * (word.length - 1);
    const endCol = startCol + dir.c * (word.length - 1);
    if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) {
      continue;
    }

    // Check if path is clear or has matching letters (allows crossing)
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

    // Place the word in the grid and record its letter positions
    for (let i = 0; i < word.length; i++) {
      const { r, c } = tempPositions[i];
      grid[r][c] = word[i];
      // Mark the cell as part of a word (for the revealed grid)
      wordPositions.push(`${r},${c}`);
    }
    placed = true;
  }
  // If word was not placed after many attempts, it is skipped.
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

// Check rows and columns for accidental profane words and alter one letter to break them.
function removeProfanity(rows, cols) {
  // Helper function to replace a letter with a random one
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
    profaneWords.forEach(profane => {
      let idx = rowStr.indexOf(profane);
      while (idx !== -1) {
        // Replace one letter in the found profane segment
        const replacePos = idx + Math.floor(Math.random() * profane.length);
        grid[r][replacePos] = randomReplace(grid[r][replacePos]);
        // Update row string and search again
        rowStr = grid[r].join("");
        idx = rowStr.indexOf(profane);
      }
    });
  }

  // Check vertical (columns)
  for (let c = 0; c < cols; c++) {
    let colStr = "";
    for (let r = 0; r < rows; r++) {
      colStr += grid[r][c];
    }
    profaneWords.forEach(profane => {
      let idx = colStr.indexOf(profane);
      while (idx !== -1) {
        const replaceRow = idx + Math.floor(Math.random() * profane.length);
        grid[replaceRow][c] = randomReplace(grid[replaceRow][c]);
        // Update column string and search again
        colStr = "";
        for (let r = 0; r < rows; r++) {
          colStr += grid[r][c];
        }
        idx = colStr.indexOf(profane);
      }
    });
  }

  // Optionally, you could add diagonal checks here.
}

// Render the plain grid and the grid with revealed words.
function renderGrid(rows, cols, insertSpaces) {
  const gridOutput = document.getElementById("gridOutput");
  const revealedOutput = document.getElementById("revealedOutput");
  let plainText = "";
  let revealedText = "";

  for (let r = 0; r < rows; r++) {
    let rowPlain = [];
    let rowRevealed = [];
    for (let c = 0; c < cols; c++) {
      let letter = grid[r][c];
      rowPlain.push(letter);
      // If the cell is part of a placed word, wrap it in bold tags.
      if (wordPositions.includes(`${r},${c}`)) {
        rowRevealed.push(`<b>${letter}</b>`);
      } else {
        rowRevealed.push(letter);
      }
    }
    // Join letters with or without spaces as chosen by user.
    const separator = insertSpaces ? " " : "";
    plainText += rowPlain.join(separator) + "\n";
    revealedText += rowRevealed.join(separator) + "\n";
  }
  gridOutput.textContent = plainText;
  // Use innerHTML for revealed output to render <b> tags
  revealedOutput.innerHTML = revealedText;
}

// Copy the plain grid text to clipboard.
function copyGrid() {
  const gridText = document.getElementById("gridOutput").textContent;
  navigator.clipboard.writeText(gridText).then(() => {
    alert("Grid copied to clipboard!");
  }).catch(err => {
    alert("Failed to copy grid.");
  });
}

// Toggle dark mode by adding or removing a class on the body.
function toggleDarkMode(event) {
  if (event.target.checked) {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
}
