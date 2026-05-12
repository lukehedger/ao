#!/usr/bin/env bun
import { watch } from "node:fs";
import { appendFile } from "node:fs/promises";

const [, , cmd, ...args] = Bun.argv;

switch (cmd) {
	case "up":
		await up();
		break;
	case "add":
		await add(args);
		break;
	default:
		usage();
		process.exit(cmd ? 1 : 0);
}

async function up(): Promise<void> {
	const path = `${process.cwd()}/todo.txt`;

	if (!(await Bun.file(path).exists())) {
		await Bun.write(path, "");

		console.log(`created ${path}`);
	}

	let offset = Bun.file(path).size;

	let counter = 0;

	const inTmux = !!process.env.TMUX;

	const spawned = new Set<string>();

	console.log(`watching ${path}`);

	if (!inTmux) {
		console.log("(not inside tmux - agents will run in detached sessions)");
	}

	function cleanup(): void {
		const tmuxCmd = inTmux ? "kill-window" : "kill-session";

		for (const name of spawned) {
			Bun.spawnSync(["tmux", tmuxCmd, "-t", name], {
				stdout: "ignore",
				stderr: "ignore",
			});
		}

		spawned.clear();
	}

	for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
		process.on(sig, () => {
			cleanup();

			process.exit(0);
		});
	}

	process.on("exit", cleanup);

	watch(path, () => {
		tail().catch((err) => console.error("tail failed:", err));
	});

	async function tail(): Promise<void> {
		const file = Bun.file(path);
		const size = file.size;

		if (size < offset) offset = 0;

		if (size <= offset) return;

		const start = offset;

		offset = size;

		const text = await file.slice(start, size).text();

		const prefixFile = Bun.file(`${process.cwd()}/ao.txt`);
		const prefix = (await prefixFile.exists())
			? (await prefixFile.text()).trim()
			: "";

		for (const line of text.split("\n")) {
			if (!line.trim()) continue;

			const name = `ao-${++counter}`;

			const prompt = prefix ? `${prefix}\n\n${line}` : line;
			const shellCmd = `claude '${prompt.replace(/'/g, "'\\''")}'`;

			const args = inTmux
				? ["tmux", "new-window", "-d", "-n", name, shellCmd]
				: ["tmux", "new-session", "-d", "-s", name, "-n", name, shellCmd];

			Bun.spawn(args, { stdout: "inherit", stderr: "inherit" });

			spawned.add(name);

			console.log(
				inTmux
					? `→ ${name}: ${line}`
					: `→ ${name}: ${line}  (attach: tmux attach -t ${name})`,
			);
		}
	}
}

async function add(args: string[]): Promise<void> {
	const task = args.join(" ").trim();

	if (!task) {
		console.error("usage: ao add <task>");
		process.exit(1);
	}

	const path = `${process.cwd()}/todo.txt`;

	await appendFile(path, `${task}\n`);
}

function usage(): void {
	console.log(`usage: ao <command>

commands:
  up           start orchestrator
  add <task>   append task to todo.txt`);
}
