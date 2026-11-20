"""Diagnostic Script: Test asyncio event loop and socket operations under current environment."""
import sys
import time
import socket
import asyncio

print(f"DIAG: Python {sys.version} on {sys.platform}")

# Step 1: Basic socket creation and binding
print("DIAG 1: Testing raw socket creation and bind to 127.0.0.1:0...")
try:
    t0 = time.perf_counter()
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(2.0)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    dt = time.perf_counter() - t0
    print(f"DIAG 1 SUCCESS: Raw socket bound and closed in {dt:.3f}s on port {port}")
except Exception as e:
    print(f"DIAG 1 FAILED: {type(e).__name__}: {e}")

# Step 2: socketpair creation (used by asyncio loop for inter-thread wakeups)
print("DIAG 2: Testing socket.socketpair or equivalent loopback connection...")
try:
    t0 = time.perf_counter()
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.bind(("127.0.0.1", 0))
    srv.listen(1)
    cli = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    cli.settimeout(2.0)
    cli.connect(srv.getsockname())
    conn, _ = srv.accept()
    cli.sendall(b"ping")
    msg = conn.recv(1024)
    cli.close()
    conn.close()
    srv.close()
    dt = time.perf_counter() - t0
    print(f"DIAG 2 SUCCESS: Loopback socket connection verified ({msg}) in {dt:.3f}s")
except Exception as e:
    print(f"DIAG 2 FAILED: {type(e).__name__}: {e}")

# Step 3: Default asyncio loop initialization and run
print("DIAG 3: Testing asyncio default event loop...")
try:
    t0 = time.perf_counter()
    async def sample_coro():
        await asyncio.sleep(0.05)
        return "async_ok"

    res = asyncio.run(sample_coro())
    dt = time.perf_counter() - t0
    print(f"DIAG 3 SUCCESS: asyncio.run returned '{res}' in {dt:.3f}s")
except Exception as e:
    print(f"DIAG 3 FAILED: {type(e).__name__}: {e}")

print("DIAG: All diagnostic checks complete.")
