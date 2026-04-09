const GRID_SIZE = 9
const BOX_SIZE = 3

function cloneGrid(grid) {
	return grid.map(row => [...row])
}

function assertGrid(grid) {
	if (!Array.isArray(grid) || grid.length !== GRID_SIZE) {
		throw new Error('Sudoku grid must be a 9x9 array')
	}

	for (const row of grid) {
		if (!Array.isArray(row) || row.length !== GRID_SIZE) {
			throw new Error('Sudoku grid must be a 9x9 array')
		}

		for (const cell of row) {
			if (!Number.isInteger(cell) || cell < 0 || cell > 9) {
				throw new Error('Sudoku cells must be integers between 0 and 9')
			}
		}
	}
}

function normalizeMove(move) {
	if (!move || typeof move !== 'object') {
		throw new Error('Move must be an object')
	}

	const { row, col, value } = move

	if (!Number.isInteger(row) || row < 0 || row >= GRID_SIZE) {
		throw new Error('Move row is out of range')
	}

	if (!Number.isInteger(col) || col < 0 || col >= GRID_SIZE) {
		throw new Error('Move col is out of range')
	}

	if (!Number.isInteger(value) || value < 0 || value > 9) {
		throw new Error('Move value must be an integer between 0 and 9')
	}

	return { row, col, value }
}

function cloneMove(move) {
	return { ...normalizeMove(move) }
}

function hasConflict(grid, row, col) {
	const value = grid[row][col]

	if (value === 0) {
		return false
	}

	for (let index = 0; index < GRID_SIZE; index += 1) {
		if (index !== col && grid[row][index] === value) {
			return true
		}

		if (index !== row && grid[index][col] === value) {
			return true
		}
	}

	const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE
	const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE

	for (let y = boxRow; y < boxRow + BOX_SIZE; y += 1) {
		for (let x = boxCol; x < boxCol + BOX_SIZE; x += 1) {
			if ((y !== row || x !== col) && grid[y][x] === value) {
				return true
			}
		}
	}

	return false
}

function isSudokuLike(value) {
	return Boolean(
		value &&
		typeof value.getGrid === 'function' &&
		typeof value.guess === 'function' &&
		typeof value.clone === 'function' &&
		typeof value.toJSON === 'function' &&
		typeof value.toString === 'function',
	)
}

function cloneSnapshot(snapshot) {
	if (!snapshot || typeof snapshot !== 'object') {
		throw new Error('Invalid Sudoku snapshot')
	}

	return {
		grid: cloneGrid(snapshot.grid),
	}
}

function normalizeSnapshot(snapshot) {
	if (isSudokuLike(snapshot)) {
		return snapshot.toJSON()
	}

	return cloneSnapshot(snapshot)
}

function reviveSudoku(value) {
	if (isSudokuLike(value)) {
		return value.clone()
	}

	if (value && typeof value === 'object' && 'grid' in value) {
		return createSudokuFromJSON(value)
	}

	throw new Error('Game requires a Sudoku-like object')
}

class Sudoku {
	constructor(grid) {
		assertGrid(grid)
		this.#grid = cloneGrid(grid)
	}

	#grid

	getGrid() {
		return cloneGrid(this.#grid)
	}

	guess(move) {
		const { row, col, value } = normalizeMove(move)
		this.#grid[row][col] = value
	}

	getCell(row, col) {
		return this.#grid[row][col]
	}

	isValidMove(move) {
		const { row, col, value } = normalizeMove(move)

		if (value === 0) {
			return true
		}

		const snapshot = this.getGrid()
		snapshot[row][col] = value
		return !hasConflict(snapshot, row, col)
	}

	getInvalidCells() {
		const invalidCells = []

		for (let row = 0; row < GRID_SIZE; row += 1) {
			for (let col = 0; col < GRID_SIZE; col += 1) {
				if (hasConflict(this.#grid, row, col)) {
					invalidCells.push({ row, col })
				}
			}
		}

		return invalidCells
	}

	clone() {
		return new Sudoku(this.#grid)
	}

	toJSON() {
		return {
			grid: this.getGrid(),
		}
	}

	toString() {
		return this.#grid
			.map(row => row.map(cell => (cell === 0 ? '.' : String(cell))).join(' '))
			.join('\n')
	}
}

class Game {
	constructor({ sudoku, history = [], future = [] }) {
		this.#sudoku = reviveSudoku(sudoku)
		this.#history = history.map(entry => this.#normalizeHistoryEntry(entry))
		this.#future = future.map(entry => this.#normalizeHistoryEntry(entry))
	}

	#sudoku
	#history
	#future

	#normalizeHistoryEntry(entry) {
		if (!entry || typeof entry !== 'object') {
			throw new Error('History entry must be an object')
		}

		return {
			before: normalizeSnapshot(entry.before),
			after: normalizeSnapshot(entry.after),
			move: cloneMove(entry.move),
		}
	}

	getSudoku() {
		return this.#sudoku.clone()
	}

	guess(move) {
		const normalizedMove = cloneMove(move)
		const before = this.#sudoku.toJSON()

		this.#sudoku.guess(normalizedMove)

		this.#history.push({
			before,
			after: this.#sudoku.toJSON(),
			move: normalizedMove,
		})
		this.#future = []
	}

	undo() {
		if (!this.canUndo()) {
			return
		}

		const entry = this.#history.pop()
		this.#future.push(this.#normalizeHistoryEntry(entry))
		this.#sudoku = createSudokuFromJSON(entry.before)
	}

	redo() {
		if (!this.canRedo()) {
			return
		}

		const entry = this.#future.pop()
		this.#history.push(this.#normalizeHistoryEntry(entry))
		this.#sudoku = createSudokuFromJSON(entry.after)
	}

	canUndo() {
		return this.#history.length > 0
	}

	canRedo() {
		return this.#future.length > 0
	}

	toJSON() {
		return {
			sudoku: this.#sudoku.toJSON(),
			history: this.#history.map(entry => this.#normalizeHistoryEntry(entry)),
			future: this.#future.map(entry => this.#normalizeHistoryEntry(entry)),
		}
	}

	toString() {
		return [
			'Current Sudoku:',
			this.#sudoku.toString(),
			`Undo: ${this.#history.length}, Redo: ${this.#future.length}`,
		].join('\n')
	}
}

export function createSudoku(input) {
	return new Sudoku(input)
}

export function createSudokuFromJSON(json) {
	if (!json || typeof json !== 'object' || !('grid' in json)) {
		throw new Error('Invalid Sudoku JSON')
	}

	return new Sudoku(json.grid)
}

export function createGame({ sudoku }) {
	return new Game({ sudoku })
}

export function createGameFromJSON(json) {
	if (!json || typeof json !== 'object' || !json.sudoku) {
		throw new Error('Invalid Game JSON')
	}

	return new Game({
		sudoku: json.sudoku,
		history: Array.isArray(json.history) ? json.history : [],
		future: Array.isArray(json.future) ? json.future : [],
	})
}
