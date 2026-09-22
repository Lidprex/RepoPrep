#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Json-lines server over stdio. Requests in, replies (and log/progress events)
out, one JSON object per line.

In:  {"id": 1, "cmd": "scan", "source": "...", "include_images": false}
     {"id": 2, "cmd": "run", "source": "...", "target": "...",
      "mode": "clean|flatten", "include_images": false}
     {"id": 3, "cmd": "ping"}

Out: {"id": 1, "type": "scan", "result": {...}}
     {"id": 2, "type": "log", "level": "INFO", "msg": "..."}
     {"id": 2, "type": "progress", "pct": 40}
     {"id": 2, "type": "done", "ok": true, "result": {"copied": 5, "skipped": 2}}
     {"id": 0, "type": "pong", "version": "2.2.1"}
"""

import json
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stdin, "reconfigure"):
    sys.stdin.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import core  # noqa: E402

VERSION = "2.2.1"


def emit(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=True) + "\n")
    sys.stdout.flush()


def handle(req):
    rid = req.get("id", 0)
    cmd = str(req.get("cmd", "")).lower()
    try:
        if cmd == "ping":
            emit({"id": rid, "type": "pong", "version": VERSION})
        elif cmd == "detect":
            emit({"id": rid, "type": "detect",
                  "result": core.detect_type(req["source"])})
        elif cmd == "scan":
            res = core.scan_project(
                req["source"], bool(req.get("include_images", False)),
                req.get("keep_files") or [])
            emit({"id": rid, "type": "scan", "result": res})
        elif cmd == "run":

            def log(msg, level="INFO"):
                emit({"id": rid, "type": "log", "level": level, "msg": msg})

            def prog(pct):
                emit({"id": rid, "type": "progress", "pct": pct})

            res = core.run_operation(
                req["source"], req["target"],
                mode=str(req.get("mode", "clean")),
                include_images=bool(req.get("include_images", False)),
                log_cb=log, progress_cb=prog,
                keep_files=req.get("keep_files") or [])
            emit({"id": rid, "type": "done",
                  "ok": bool(res), "result": res})
        else:
            emit({"id": rid, "type": "error",
                  "msg": "unknown command: " + cmd})
    except Exception as e:
        emit({"id": rid, "type": "error", "msg": str(e)})


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except Exception:
            emit({"id": 0, "type": "error", "msg": "invalid JSON line"})
            continue
        handle(req)


if __name__ == "__main__":
    main()