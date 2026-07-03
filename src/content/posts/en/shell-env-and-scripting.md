---
title: "Using Linux Properly, Part 5: Shell Environment and Scripting"
date: 2026-06-22T15:00:00
summary: "Environment variables and $PATH, when .bashrc gets read, and reading and writing small shell scripts. The entry point to lining up commands and automating them."
tags: ["Linux", "基礎"]
level: beginner
lang: en
translationKey: shell-env-and-scripting
---

> 📚 Series: "Using Linux Properly" (5 / 6)

Time to move from typing commands by hand every time to **collecting them into your environment and automating them**. We'll cover environment variables and `$PATH`, how config files get read, and the basics of small shell scripts.

## Setting and Reading Environment Variables

An environment variable is "a named value that shells and programs read." Set it with `export`, read it with `$NAME`.

```bash
export GREETING="hello"     # set (export passes it to child processes too)
echo "$GREETING"            # read → hello
echo "$HOME"                # a built-in variable (home directory)

GREETING="hi" ./app         # pass temporarily, just for that command
```

> 🧭 [Injecting app config from the outside via environment variables](/en/posts/deploying-go-apps/) is a 12-factor staple. You read the same value with Go's `os.Getenv("PORT")` or C#'s `Environment.GetEnvironmentVariable("PORT")`.

## $PATH — How Commands Get Found

Just typing `ls` works because the shell searches the directories listed in `$PATH` in order and finds the executable.

```bash
echo "$PATH"          # : -separated, like /usr/local/bin:/usr/bin:/bin ...
which go               # show where the go executable lives
export PATH="$HOME/bin:$PATH"   # prepend your own bin
```

> ⚠️ Most "command not found" errors just mean **that directory isn't on `$PATH`**. Check where a command lives with `which`.

## When Config Files Get Read

`export` disappears when you close the shell. **For settings you want every time, write them into `.bashrc` or similar.**

| File | When it's read |
| --- | --- |
| `~/.bashrc` | Every time you open an interactive shell (new terminal/tab) |
| `~/.bash_profile` / `~/.profile` | At login |

```bash
# Write this in ~/.bashrc and it takes effect every time
export PATH="$HOME/bin:$PATH"
alias ll='ls -la'           # an alias for a frequently used command
```

After editing, open a new terminal or run `source ~/.bashrc` to apply it to your current shell.

## Reading and Writing Shell Scripts

Line up commands in a file and you've got a script. At the top, write a **shebang** (`#!`) specifying the shell to run it with.

```bash
#!/bin/bash
set -euo pipefail            # stop immediately on failure, error on undefined vars (safety)

NAME="${1:-world}"           # first argument; "world" if absent
echo "deploying $NAME ..."

for env in staging prod; do  # a loop
  echo " - target: $env"
done

if [ -f "config.yml" ]; then # conditional (if the file exists)
  echo "config found"
fi
```

```bash
chmod +x deploy.sh    # give it execute permission
./deploy.sh prod      # run it ("prod" goes into $1)
```

> 💡 `set -euo pipefail` is practically standard in real-world scripts. It doesn't swallow errors, stops early, and prevents accidents.

## Summary

- Environment variables: **set with `export`, read with `$NAME`**. Used to inject app config
- **`$PATH`** is the list of directories where commands are looked up. For "not found," check the location with `which`
- Write settings you want every time into **`~/.bashrc`** (apply after editing with `source`)
- A script starts with a **shebang `#!/bin/bash`**, and for safety **`set -euo pipefail`**
- Once you can use arguments `$1`, `if`, and `for`, you can quickly write small automations

**← Prev:** [Part 4: Process, Log, and Service Management](/en/posts/linux-process-and-services/)
**→ Next:** [Part 6: SSH Connections and Key Authentication](/en/posts/ssh-and-key-auth/)
