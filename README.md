# Sudoku Smart Trainer

Mobile Sudoku app built with Expo and React Native.

## Features

- Play Sudoku on a 9x9 mobile-friendly board
- Accuracy tracking for the current round
- Automatic level adjustment after each solved puzzle
- Reset the current puzzle or start another round

## Adaptive difficulty

After each solved puzzle, the app checks the player's accuracy:

- `>= 90%`: move up one difficulty level
- `65% to 89%`: stay on the current level
- `< 65%`: move down one difficulty level

## Run

```bash
npm install
npm start
```
