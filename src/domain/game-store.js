import { derived, writable } from 'svelte/store'
import { createGame, createGameFromJSON, createSudoku } from './index.js'

function cloneGrid(grid) {
	return grid.map(row => [...row])
}

function toInvalidCellKeys(invalidCells) {
	return invalidCells.map(({ row, col }) => `${col},${row}`)
}

export function createGameStore(initialGrid) {
	const state = writable(createState(initialGrid))

	function updateGame(mutator) {
		state.update(currentState => {
			const nextGame = restoreGame(currentState)
			mutator(nextGame)
			return createState(currentState.baseGrid, nextGame)
		})
	}

	return {
		subscribe: state.subscribe,

		load(grid) {
			state.set(createState(grid))
		},

		guess(move) {
			updateGame(game => {
				game.guess(move)
			})
		},

		undo() {
			updateGame(game => {
				game.undo()
			})
		},

		redo() {
			updateGame(game => {
				game.redo()
			})
		},
	}
}

function createState(baseGrid, game = createGame({ sudoku: createSudoku(baseGrid) })) {
	const sudoku = game.getSudoku()
	return {
		baseGrid: cloneGrid(baseGrid),
		game: game.toJSON(),
		grid: sudoku.getGrid(),
		invalidCells: toInvalidCellKeys(sudoku.getInvalidCells()),
		canUndo: game.canUndo(),
		canRedo: game.canRedo(),
	}
}

function restoreGame(state) {
	return createGameFromJSON(state.game)
}

export function selectGameGrid(store) {
	return derived(store, $state => $state.grid)
}

export function selectBaseGrid(store) {
	return derived(store, $state => $state.baseGrid)
}

export function selectInvalidCells(store) {
	return derived(store, $state => $state.invalidCells)
}

export function selectCanUndo(store) {
	return derived(store, $state => $state.canUndo)
}

export function selectCanRedo(store) {
	return derived(store, $state => $state.canRedo)
}
