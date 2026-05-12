# ao

agent orchestrator

> [!IMPORTANT]
> Requires [Bun](https://bun.sh) >= 1.3, [tmux](https://github.com/tmux/tmux), and the [Claude Code CLI](https://docs.claude.com/en/docs/claude-code) on `PATH`.

## Build

Build bin into `~/.bun/bin/ao` (in `PATH` already if Bun is installed):

```sh
bun run build
```

## Usage

Start watcher:

```sh
ao up
```

Add agent tasks (appends to `todo.txt` in the cwd):

```sh
ao add say hello
```

Each new task spawns a tmux pane (or detached session if not already running tmux) running a Claude Code agent.

Optionally, place an `ao.txt` in the cwd to prepend shared context to every task's prompt. The file is read fresh on each spawn, so edits apply to the next task without restarting `ao up`.

![ao demo](https://github.com/user-attachments/assets/cd869c18-1206-43f5-9168-0899f367fb81)

## Development

Run source:

```sh
bun start
```
