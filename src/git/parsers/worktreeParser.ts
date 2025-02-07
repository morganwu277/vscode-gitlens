import { Uri } from 'vscode';
import { debug } from '../../system/decorators/log';
import { normalizePath } from '../../system/path';
import { getLines } from '../../system/string';
import { GitWorktree } from '../models/worktree';

interface WorktreeEntry {
	path: string;
	sha?: string;
	branch?: string;
	bare: boolean;
	detached: boolean;
	locked?: boolean | string;
	prunable?: boolean | string;
}

export class GitWorktreeParser {
	@debug({ args: false, singleLine: true })
	static parse(data: string, repoPath: string): GitWorktree[] {
		if (!data) return [];

		if (repoPath != null) {
			repoPath = normalizePath(repoPath);
		}

		const worktrees: GitWorktree[] = [];

		let entry: Partial<WorktreeEntry> | undefined = undefined;
		let line: string;
		let index: number;
		let key: string;
		let value: string;
		let locked: string;
		let prunable: string;
		let main = true; // the first worktree is the main worktree

		for (line of getLines(data)) {
			index = line.indexOf(' ');
			if (index === -1) {
				key = line;
				value = '';
			} else {
				key = line.substring(0, index);
				value = line.substring(index + 1);
			}

			if (key.length === 0 && entry != null) {
				worktrees.push(
					new GitWorktree(
						main,
						entry.bare ? 'bare' : entry.detached ? 'detached' : 'branch',
						repoPath,
						Uri.file(entry.path!),
						entry.locked ?? false,
						entry.prunable ?? false,
						entry.sha,
						entry.branch,
					),
				);

				entry = undefined;
				main = false;
				continue;
			}

			if (entry == null) {
				entry = {};
			}

			switch (key) {
				case 'worktree':
					entry.path = value;
					break;
				case 'bare':
					entry.bare = true;
					break;
				case 'HEAD':
					entry.sha = value;
					break;
				case 'branch':
					// Strip off refs/heads/
					entry.branch = value.substr(11);
					break;
				case 'detached':
					entry.detached = true;
					break;
				case 'locked':
					[, locked] = value.split(' ', 2);
					entry.locked = locked?.trim() || true;
					break;
				case 'prunable':
					[, prunable] = value.split(' ', 2);
					entry.prunable = prunable?.trim() || true;
					break;
			}
		}

		return worktrees;
	}
}
