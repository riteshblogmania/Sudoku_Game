import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

const GRID_SIZE = 9;
const BLOCK_SIZE = 3;

const DIFFICULTIES = [
  { key: 'easy', label: 'Easy', blanks: 34, accent: '#2f855a' },
  { key: 'medium', label: 'Medium', blanks: 43, accent: '#c05621' },
  { key: 'hard', label: 'Hard', blanks: 51, accent: '#9b2c2c' },
  { key: 'expert', label: 'Expert', blanks: 56, accent: '#44337a' },
];

const cloneGrid = (grid) => grid.map((row) => [...row]);

const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const pattern = (row, column) => ((row * BLOCK_SIZE + Math.floor(row / BLOCK_SIZE) + column) % GRID_SIZE) + 1;

const generateSolvedGrid = () => {
  const rowGroups = shuffle([0, 1, 2]);
  const columnGroups = shuffle([0, 1, 2]);
  const rows = rowGroups.flatMap((group) =>
    shuffle([0, 1, 2]).map((row) => group * BLOCK_SIZE + row)
  );
  const columns = columnGroups.flatMap((group) =>
    shuffle([0, 1, 2]).map((column) => group * BLOCK_SIZE + column)
  );
  const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  return rows.map((row) => columns.map((column) => numbers[pattern(row, column) - 1]));
};

const buildPuzzle = (solution, blanks) => {
  const puzzle = cloneGrid(solution);
  const positions = shuffle(Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => index));
  for (let i = 0; i < blanks; i += 1) {
    const position = positions[i];
    const row = Math.floor(position / GRID_SIZE);
    const column = position % GRID_SIZE;
    puzzle[row][column] = 0;
  }
  return puzzle;
};

const getBlockStart = (index) => Math.floor(index / BLOCK_SIZE) * BLOCK_SIZE;

const isPlacementValid = (grid, row, column, value) => {
  if (value === 0) {
    return true;
  }

  for (let i = 0; i < GRID_SIZE; i += 1) {
    if (i !== column && grid[row][i] === value) {
      return false;
    }
    if (i !== row && grid[i][column] === value) {
      return false;
    }
  }

  const startRow = getBlockStart(row);
  const startColumn = getBlockStart(column);
  for (let r = startRow; r < startRow + BLOCK_SIZE; r += 1) {
    for (let c = startColumn; c < startColumn + BLOCK_SIZE; c += 1) {
      if ((r !== row || c !== column) && grid[r][c] === value) {
        return false;
      }
    }
  }

  return true;
};

const isBoardSolved = (board, solution) =>
  board.every((row, rowIndex) =>
    row.every((value, columnIndex) => value !== 0 && value === solution[rowIndex][columnIndex])
  );

const isValidSolvedGrid = (grid) =>
  grid.length === GRID_SIZE &&
  grid.every(
    (row, rowIndex) =>
      row.length === GRID_SIZE &&
      row.every((value, columnIndex) => isPlacementValid(grid, rowIndex, columnIndex, value))
  );

const getAccuracyRate = (correctMoves, totalMoves) =>
  totalMoves === 0 ? 1 : correctMoves / totalMoves;

const pickNextDifficulty = (currentIndex, accuracy) => {
  if (accuracy >= 0.9) {
    return Math.min(currentIndex + 1, DIFFICULTIES.length - 1);
  }
  if (accuracy < 0.65) {
    return Math.max(currentIndex - 1, 0);
  }
  return currentIndex;
};

const formatSeconds = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const countValuesOnBoard = (board) => {
  const counts = {};
  for (let value = 1; value <= GRID_SIZE; value += 1) {
    counts[value] = 0;
  }

  board.forEach((row) => {
    row.forEach((value) => {
      if (value >= 1 && value <= GRID_SIZE) {
        counts[value] += 1;
      }
    });
  });

  return counts;
};

const isRowSolved = (board, solution, rowIndex) =>
  board[rowIndex].every((value, columnIndex) => value === solution[rowIndex][columnIndex]);

const isColumnSolved = (board, solution, columnIndex) =>
  board.every((row, rowIndex) => row[columnIndex] === solution[rowIndex][columnIndex]);

const isBlockSolved = (board, solution, blockIndex) => {
  const startRow = Math.floor(blockIndex / BLOCK_SIZE) * BLOCK_SIZE;
  const startColumn = (blockIndex % BLOCK_SIZE) * BLOCK_SIZE;

  for (let row = startRow; row < startRow + BLOCK_SIZE; row += 1) {
    for (let column = startColumn; column < startColumn + BLOCK_SIZE; column += 1) {
      if (board[row][column] !== solution[row][column]) {
        return false;
      }
    }
  }

  return true;
};

const getCompletedUnits = (board, solution) => ({
  rows: Array.from({ length: GRID_SIZE }, (_, index) => isRowSolved(board, solution, index)),
  columns: Array.from({ length: GRID_SIZE }, (_, index) => isColumnSolved(board, solution, index)),
  blocks: Array.from({ length: GRID_SIZE }, (_, index) => isBlockSolved(board, solution, index)),
});

const getNewHighlights = (previousUnits, nextUnits) => ({
  rows: nextUnits.rows.map((value, index) => value && !previousUnits.rows[index]),
  columns: nextUnits.columns.map((value, index) => value && !previousUnits.columns[index]),
  blocks: nextUnits.blocks.map((value, index) => value && !previousUnits.blocks[index]),
});

const hasAnyHighlight = (highlights) =>
  highlights.rows.some(Boolean) ||
  highlights.columns.some(Boolean) ||
  highlights.blocks.some(Boolean);

const createGameState = (difficultyIndex) => {
  const solution = generateSolvedGrid();
  const difficulty = DIFFICULTIES[difficultyIndex];
  const puzzle = buildPuzzle(solution, difficulty.blanks);

  if (!isValidSolvedGrid(solution)) {
    throw new Error('Generated Sudoku grid is invalid.');
  }

  return {
    board: cloneGrid(puzzle),
    puzzle,
    solution,
    correctMoves: 0,
    totalMoves: 0,
    difficultyIndex,
    isComplete: false,
    secondsElapsed: 0,
  };
};

export default function App() {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 24, 420);
  const cellSize = Math.floor((boardSize - 6) / GRID_SIZE);
  const resolvedBoardSize = cellSize * GRID_SIZE + 6;

  const [game, setGame] = useState(() => createGameState(0));
  const [message, setMessage] = useState('Fill the grid and let your accuracy guide the next level.');
  const [selectedCell, setSelectedCell] = useState(null);
  const [lastAccuracy, setLastAccuracy] = useState(1);
  const [flashHighlights, setFlashHighlights] = useState({
    rows: Array(GRID_SIZE).fill(false),
    columns: Array(GRID_SIZE).fill(false),
    blocks: Array(GRID_SIZE).fill(false),
  });

  const difficulty = DIFFICULTIES[game.difficultyIndex];
  const accuracy = useMemo(
    () => getAccuracyRate(game.correctMoves, game.totalMoves),
    [game.correctMoves, game.totalMoves]
  );
  const numberCounts = useMemo(() => countValuesOnBoard(game.board), [game.board]);
  const availableNumbers = useMemo(
    () => Array.from({ length: GRID_SIZE }, (_, index) => index + 1).filter((value) => numberCounts[value] < 9),
    [numberCounts]
  );

  useEffect(() => {
    if (game.isComplete) {
      return undefined;
    }

    const timer = setInterval(() => {
      setGame((current) => ({
        ...current,
        secondsElapsed: current.secondsElapsed + 1,
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [game.isComplete]);

  const startNewRound = (difficultyIndex, roundAccuracy) => {
    setGame(createGameState(difficultyIndex));
    setLastAccuracy(roundAccuracy);
    setSelectedCell(null);
    setFlashHighlights({
      rows: Array(GRID_SIZE).fill(false),
      columns: Array(GRID_SIZE).fill(false),
      blocks: Array(GRID_SIZE).fill(false),
    });
    setMessage(
      roundAccuracy >= 0.9
        ? 'Excellent accuracy. You have been promoted to a tougher board.'
        : roundAccuracy < 0.65
          ? 'This round eases up a bit so you can rebuild momentum.'
          : 'Steady solving. You will stay on this level for the next puzzle.'
    );
  };

  const handleEntry = (rawValue) => {
    if (!selectedCell || game.isComplete) {
      setMessage('Select an empty cell first.');
      return;
    }

    const { row, column } = selectedCell;
    if (game.puzzle[row][column] !== 0) {
      setMessage('That cell is fixed. Choose one of the empty cells.');
      return;
    }

    const numericValue = rawValue;
    let nextMessage = 'Keep going.';
    let completionPayload = null;
    let highlightPayload = null;

    setGame((current) => {
      const updatedBoard = cloneGrid(current.board);
      const currentCellValue = updatedBoard[row][column];
      const previousUnits = getCompletedUnits(current.board, current.solution);

      if (numericValue === 0) {
        updatedBoard[row][column] = 0;
        nextMessage = 'Cell cleared. Keep going.';
        return {
          ...current,
          board: updatedBoard,
        };
      }

      const totalMoves = current.totalMoves + 1;
      const isCorrectMove = numericValue === current.solution[row][column];
      const correctMoves = current.correctMoves + (isCorrectMove ? 1 : 0);
      updatedBoard[row][column] = numericValue;
      const nextUnits = getCompletedUnits(updatedBoard, current.solution);
      const newHighlights = getNewHighlights(previousUnits, nextUnits);
      if (hasAnyHighlight(newHighlights)) {
        highlightPayload = newHighlights;
      }

      if (!isCorrectMove) {
        nextMessage = 'That value is not correct for this cell.';
        return {
          ...current,
          totalMoves,
          correctMoves,
          board: updatedBoard,
        };
      }

      const complete = isBoardSolved(updatedBoard, current.solution);

      if (complete) {
        const roundAccuracy = getAccuracyRate(correctMoves, totalMoves);
        const nextDifficulty = pickNextDifficulty(current.difficultyIndex, roundAccuracy);
        nextMessage = `Puzzle solved in ${formatSeconds(current.secondsElapsed)}. Accuracy ${(
          roundAccuracy * 100
        ).toFixed(0)}%`;
        completionPayload = { nextDifficulty, roundAccuracy };
      } else {
        nextMessage =
          currentCellValue === numericValue
            ? 'That cell already has the correct value.'
            : 'Nice move. That entry is correct.';
      }

      return {
        ...current,
        board: updatedBoard,
        totalMoves,
        correctMoves,
        isComplete: complete,
      };
    });

    setMessage(nextMessage);
    if (highlightPayload) {
      setFlashHighlights(highlightPayload);
      setTimeout(
        () =>
          setFlashHighlights({
            rows: Array(GRID_SIZE).fill(false),
            columns: Array(GRID_SIZE).fill(false),
            blocks: Array(GRID_SIZE).fill(false),
          }),
        1600
      );
    }
    if (completionPayload) {
      setTimeout(
        () => startNewRound(completionPayload.nextDifficulty, completionPayload.roundAccuracy),
        1200
      );
    }
  };

  const resetBoard = () => {
    setGame((current) => ({
      ...current,
      board: cloneGrid(current.puzzle),
      correctMoves: 0,
      totalMoves: 0,
      isComplete: false,
      secondsElapsed: 0,
    }));
    setSelectedCell(null);
    setMessage('Board reset. Start fresh on the same level.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Adaptive Sudoku Trainer</Text>
        <Text style={styles.title}>Sharpen your logic, one board at a time.</Text>
        <Text style={styles.subtitle}>
          Higher solve accuracy unlocks harder puzzles. Missing often will gently lower the level.
        </Text>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Level</Text>
            <Text style={[styles.statValue, { color: difficulty.accent }]}>{difficulty.label}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Accuracy</Text>
            <Text style={styles.statValue}>{(accuracy * 100).toFixed(0)}%</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Last Round</Text>
            <Text style={styles.statValue}>{(lastAccuracy * 100).toFixed(0)}%</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Timer</Text>
            <Text style={styles.statValue}>{formatSeconds(game.secondsElapsed)}</Text>
          </View>
        </View>

        <View style={[styles.board, { width: resolvedBoardSize, height: resolvedBoardSize }]}>
          {game.board.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.boardRow}>
              {row.map((value, columnIndex) => {
                const locked = game.puzzle[rowIndex][columnIndex] !== 0;
                const selected =
                  selectedCell &&
                  selectedCell.row === rowIndex &&
                  selectedCell.column === columnIndex;
                const blockIndex =
                  Math.floor(rowIndex / BLOCK_SIZE) * BLOCK_SIZE + Math.floor(columnIndex / BLOCK_SIZE);
                const flashed =
                  flashHighlights.rows[rowIndex] ||
                  flashHighlights.columns[columnIndex] ||
                  flashHighlights.blocks[blockIndex];
                const invalid =
                  value !== 0 &&
                  !locked &&
                  (!isPlacementValid(game.board, rowIndex, columnIndex, value) ||
                    value !== game.solution[rowIndex][columnIndex]);

                return (
                  <TouchableOpacity
                    key={`${rowIndex}-${columnIndex}`}
                    activeOpacity={0.9}
                    onPress={() => setSelectedCell({ row: rowIndex, column: columnIndex })}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        borderRightWidth: columnIndex === 2 || columnIndex === 5 ? 3 : 1,
                        borderBottomWidth: rowIndex === 2 || rowIndex === 5 ? 3 : 1,
                      },
                      rowIndex === 0 && styles.firstRowCell,
                      columnIndex === 0 && styles.firstColumnCell,
                      flashed && styles.cellFlashed,
                      selected && styles.cellSelected,
                      locked && styles.cellLocked,
                      invalid && styles.cellInvalid,
                    ]}
                  >
                    {locked ? (
                      <Text style={styles.givenText}>{value}</Text>
                    ) : (
                      <Text style={value === 0 ? styles.emptyText : styles.inputText}>
                        {value === 0 ? '' : String(value)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.keypad}>
          {availableNumbers.map((value) => (
            <TouchableOpacity
              key={value}
              style={styles.keypadButton}
              onPress={() => handleEntry(value)}
            >
              <Text style={styles.keypadButtonText}>{value}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.keypadClearButton} onPress={() => handleEntry(0)}>
            <Text style={styles.keypadClearText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.message}>{message}</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={resetBoard}>
            <Text style={styles.primaryButtonText}>Reset Puzzle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => startNewRound(game.difficultyIndex, accuracy)}
          >
            <Text style={styles.secondaryButtonText}>New Puzzle</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4efe6',
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 24,
    backgroundColor: '#f4efe6',
  },
  eyebrow: {
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#7b5e57',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#2d3748',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5f6c7b',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16,
    maxWidth: 420,
  },
  statsCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    backgroundColor: '#fffaf0',
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  statItem: {
    width: '48%',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#8d7765',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a202c',
  },
  board: {
    borderWidth: 3,
    borderColor: '#3d2c29',
    backgroundColor: '#fffdf8',
    borderRadius: 18,
    overflow: 'hidden',
  },
  boardRow: {
    flexDirection: 'row',
  },
  cell: {
    borderColor: '#c8b6a6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffdf8',
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  firstRowCell: {
    borderTopWidth: 1,
  },
  firstColumnCell: {
    borderLeftWidth: 1,
  },
  cellSelected: {
    backgroundColor: '#feebc8',
  },
  cellLocked: {
    backgroundColor: '#e6fffa',
  },
  cellInvalid: {
    backgroundColor: '#fed7d7',
  },
  cellFlashed: {
    backgroundColor: '#c6f6d5',
  },
  givenText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#234e52',
  },
  inputText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2d3748',
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#c8b6a6',
  },
  keypad: {
    width: '100%',
    maxWidth: 420,
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    minHeight: 122,
  },
  keypadButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#fffaf0',
    borderWidth: 1,
    borderColor: '#d6bc96',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#744210',
  },
  keypadClearButton: {
    minWidth: 122,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#2d3748',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  keypadClearText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  message: {
    marginTop: 16,
    marginBottom: 18,
    minHeight: 48,
    maxWidth: 420,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    color: '#4a5568',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#2b6cb0',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#fffaf0',
    borderWidth: 1,
    borderColor: '#d6bc96',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
  },
  secondaryButtonText: {
    color: '#744210',
    fontWeight: '700',
    fontSize: 15,
  },
});
