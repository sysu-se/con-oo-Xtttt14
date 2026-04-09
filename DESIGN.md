# DESIGN

## 1. View 层真正消费的是什么？

View 层现在直接消费的是一个基于领域对象的 Svelte adapter：

- 领域对象定义在 [src/domain/index.js](/C:/Users/Xtttt/OneDrive/Desktop/软工/con-oo-Xtttt14/src/domain/index.js)
- Svelte 适配层定义在 [src/domain/game-store.js](/C:/Users/Xtttt/OneDrive/Desktop/软工/con-oo-Xtttt14/src/domain/game-store.js)
- 现有组件继续通过 [src/node_modules/@sudoku/stores/grid.js](/C:/Users/Xtttt/OneDrive/Desktop/软工/con-oo-Xtttt14/src/node_modules/@sudoku/stores/grid.js) 消费这个 adapter 暴露出的响应式数据

也就是说，组件不再直接持有和修改旧的二维数组状态，而是通过 store adapter 间接消费 `Game` / `Sudoku`。

## 2. `Sudoku` / `Game` 的职责边界

`Sudoku` 负责“当前盘面是什么”：

- 持有当前 `grid`
- 提供 `guess(move)`
- 提供 `isValidMove()` / `getInvalidCells()`
- 提供 `clone()` / `toJSON()` / `toString()`

`Game` 负责“一局游戏经历了什么”：

- 持有当前 `Sudoku`
- 管理 `history` 和 `future`
- 提供 `guess()` / `undo()` / `redo()`
- 提供 `canUndo()` / `canRedo()`
- 提供整局游戏的序列化能力

这次相比 HW1 的实质性改进是：我新增了 store adapter，把领域对象放进了真实 Svelte 流程里，而不是只在测试中可用。

## 3. 用户操作如何进入领域对象

开始新游戏时：

- [src/node_modules/@sudoku/game.js](/C:/Users/Xtttt/OneDrive/Desktop/软工/con-oo-Xtttt14/src/node_modules/@sudoku/game.js) 调用 `grid.generate()` 或 `grid.decodeSencode()`
- `grid` store 再调用 `gameStore.load(...)`
- adapter 内部创建新的 `Game(createSudoku(...))`

用户输入数字时：

- [src/components/Controls/Keyboard.svelte](/C:/Users/Xtttt/OneDrive/Desktop/软工/con-oo-Xtttt14/src/components/Controls/Keyboard.svelte) 调用 `userGrid.set(...)`
- `userGrid.set(...)` 会转成 `grid.guess({ row, col, value })`
- 最终进入 `Game.guess(...)` 和 `Sudoku.guess(...)`

撤销与重做时：

- [src/components/Controls/ActionBar/Actions.svelte](/C:/Users/Xtttt/OneDrive/Desktop/软工/con-oo-Xtttt14/src/components/Controls/ActionBar/Actions.svelte) 调用 `userGrid.undo()` / `userGrid.redo()`
- 最终进入 `Game.undo()` / `Game.redo()`

所以关键交互已经不在 `.svelte` 组件里直接操作数组，而是通过领域对象完成。

## 4. UI 里拿到的数据是什么

组件渲染时拿到的是 adapter 对外暴露的响应式视图状态：

- `grid`：题目初始盘面
- `userGrid`：当前局面
- `invalidCells`：冲突格子列表
- `canUndo` / `canRedo`：撤销与重做按钮状态

其中：

- `baseGrid` 是 UI 判断给定数字和用户数字所需的视图状态
- `grid`、历史记录等核心状态仍然保留在领域对象内部
- UI 只消费 adapter 提取出的只读快照

## 5. 为什么 Svelte 会更新

我依赖的是 Svelte 3 的 `store` 机制。

`createGameStore()` 内部维护一个 `writable(state)`。每次用户操作时：

1. 先从当前快照恢复 `Game`
2. 调用 `game.guess()` / `game.undo()` / `game.redo()`
3. 重新生成一个新的 plain state 对象
4. 通过 `state.update(...)` 把新状态发给订阅者

Svelte 组件通过 `$userGrid`、`$invalidCells`、`$canUndo`、`$canRedo` 消费这些 store。因为 adapter 每次都会发出新的状态对象，所以订阅会触发，界面会刷新。

## 6. 如果直接 mutate 内部对象，会有什么问题

如果让组件直接改 `Game` 或 `Sudoku` 的内部字段，而不通过 store 更新：

- Svelte 不一定知道对象内部已经变了
- `$store` 的订阅不会自动触发
- 界面可能出现“数据变了但视图没刷新”
- Undo / Redo 历史也可能被绕过或污染

这也是为什么我没有把内部 `Sudoku` 实例直接暴露给组件，而是通过 adapter 对外暴露新快照。

## 7. 相比 HW1，我改进了什么

相比 HW1，这次主要改进有三点：

- 增加了 `createGameStore()`，明确把领域层和 Svelte 响应式边界分开
- `invalidCells` 不再由组件或旧数组逻辑推导，而是直接来自 `Sudoku.getInvalidCells()`
- Undo / Redo 真正接进了真实界面按钮，不再只是测试里可用

## 8. 这种设计的 trade-off

优点：

- 领域对象职责清楚
- UI 不直接依赖 `Game` 的内部实现
- Svelte 响应式边界明确，更新路径可解释

代价：

- adapter 里需要维护领域对象和视图快照之间的转换
- 每次操作都会重新外表化一份状态，代码比“直接改数组”稍多一点

但这份额外适配层换来了更清晰的架构，也更符合这次作业“让 View 真正消费领域对象”的要求。
