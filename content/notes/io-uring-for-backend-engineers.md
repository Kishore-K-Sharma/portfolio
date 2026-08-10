---
title: "io_uring: Why Your Database Got Faster by Making Fewer System Calls"
description: "The classic Linux I/O model costs at least one system call per operation — and every syscall got materially more expensive after the Spectre/Meltdown mitigations. io_uring flips the model: two ring buffers shared between your app and the kernel, batching hundreds of operations into one syscall or, with a polling thread, zero. Here's the mechanism, why true async file I/O finally exists, and the honest security caveats that keep it off some production boxes."
date: "2026-08-04"
tags: ["linux", "performance", "backend", "async-io", "io-uring"]
category: "engineering"
---

Here is a claim that should make you slightly suspicious: a busy Linux server can burn a large fraction of its CPU doing nothing but *crossing a line*. Not computing anything, not moving bytes anyone asked for — just stepping from user space into the kernel and back, over and over, once for every read and every write. For decades that toll was small enough to ignore. Then a family of CPU vulnerabilities made every crossing cost more, and the ignoring stopped being free.

io_uring is the Linux interface built to stop paying that toll. It is why PostgreSQL 18 got a new asynchronous I/O subsystem, why databases like ScyllaDB and TigerBeetle can push a NVMe drive to its limit, and why your language runtime's networking quietly got faster on newer kernels. You will almost certainly never call it by hand. But understanding its shape explains *why* all of those things sped up — and when a system is leaving performance on the table because it hasn't adopted it.

## The tax nobody put on the invoice

Start with the model you already know. To read from a socket or a file, you call `read()`. To write, `write()`. To wait on many sockets at once, `epoll`. Each of these is a **system call** — a request that hands control from your process to the kernel, which does the work and hands control back.

A syscall is not a function call. It is a privileged transition: the CPU switches from user mode to kernel mode, saves and restores register state, and — this is the expensive part now — does the bookkeeping required to keep the kernel's memory safely separated from yours. Historically this was cheap enough that "one syscall per I/O" felt like a law of nature rather than a cost. You did an operation, you paid a syscall, you moved on.

Then Spectre and Meltdown landed, and the mitigations that followed — KPTI, which unmaps kernel page tables while you're in user space, and retpolines, which defang speculative branch prediction — made the user↔kernel boundary materially more expensive to cross. Every transition now does more work. On a server handling hundreds of thousands of small operations per second, that per-crossing cost stops being a rounding error and becomes a line item you can see on a flame graph.

![On the left, the classic model: each of N I/O operations is its own read or write syscall, so N operations means N user-to-kernel mode transitions, each paying the post-Spectre crossing cost. On the right, io_uring batches those same N operations behind a single io_uring_enter syscall — or zero syscalls in SQPOLL mode — collapsing N boundary crossings into roughly one.](/writing/io-uring-syscall-cost.svg "N operations used to mean N mode transitions. io_uring collapses them into one — or none.")

There is a second, quieter problem in the classic model, and it's arguably worse than the syscall tax: **`epoll` only makes sockets asynchronous.** It tells you *when a socket is ready* so you never block waiting on the network. But it has nothing to offer regular file I/O. There is no `epoll` for reading a file off disk. The traditional POSIX async file interface (`aio`) was so limited and quirky that almost nobody used it, so the standard workaround was a lie: you shoved blocking `read()` calls onto a thread pool and pretended the result was async. Threads, context switches, and synchronization — an entire scaffolding erected to fake something the kernel didn't truly offer. For anything disk-heavy, that's a lot of overhead to hide a missing feature.

So the classic model had two holes: it taxed every operation with a syscall, and it had no honest async story for files. io_uring was designed to close both at once.

## Two rings and a shared page

io_uring arrived in Linux 5.1 in 2019 and has matured enormously since. Its core idea is a genuine change of shape, and it's worth slowing down for, because once you see it the performance story becomes obvious.

Instead of calling the kernel every time you want an operation done, you and the kernel **share memory** — a region `mmap`'d so both sides can read and write it directly, no copying, no syscall to reach it. Inside that shared region live two circular buffers, and the whole interface is built on them:

- The **Submission Queue (SQ)** — where *you* place work. Each slot is a **Submission Queue Entry (SQE)**: a small struct describing one operation. "Read this many bytes from this file descriptor into this buffer." "Accept a connection on this socket." "fsync this file." The opcode menu is deep — read, write, accept, connect, send, recv, openat, fsync, close, and more.
- The **Completion Queue (CQ)** — where the *kernel* places results. Each slot is a **Completion Queue Entry (CQE)**: which operation finished (you tag them so you can match), and its return value.

You are the producer on the SQ and the consumer on the CQ. The kernel is the consumer on the SQ and the producer on the CQ. Each ring has a **head** and **tail** index; you advance the SQ tail as you add work, the kernel advances the CQ tail as it finishes, and each side advances the head as it consumes. Because both live in shared memory, adding work and reaping results involve *no system call at all* — you're just writing integers into a page the kernel can also see.

![The shared memory region, mmap'd so it straddles the boundary between your application in user space and the kernel. Inside it sit two circular buffers: the Submission Queue, where the app produces SQEs describing operations, and the Completion Queue, where the kernel produces CQEs holding results. Head and tail indices track each ring. Nothing is copied across the boundary — both sides read and write the same page.](/writing/io-uring-ring-buffers.svg "One shared, mmap'd region. You fill the SQ; the kernel fills the CQ. No copies cross the line.")

That shared-memory design is the whole trick. In the classic model, the operation *is* the boundary crossing — the syscall and the I/O request are the same act. In io_uring, describing the work and asking the kernel to do it are decoupled. You can pile up a hundred SQEs and the kernel hasn't been disturbed once.

## Submit many, cross once — or never

So how does the kernel learn there's work waiting? That's the one syscall left standing: **`io_uring_enter`**. You call it to say "I've queued some operations, go process them." But here's the leverage — *one* `io_uring_enter` can submit an arbitrary number of SQEs. Queue up 200 reads, call `io_uring_enter` once, and you've done 200 operations for a single boundary crossing instead of 200. The syscall tax that scaled with your operation count now amortizes to nearly nothing.

The kernel executes those operations **asynchronously**. It doesn't block you while a disk read completes; it takes the work, returns, and posts CQEs as each finishes. You come back later — at your own pace — and reap completions off the CQ. Submission and completion are fully separated in time, which is what real async has always promised and what the socket-only `epoll` world could never deliver for files.

![A numbered flow. Step one: the app fills one or more SQEs in the submission queue, describing the operations it wants. Step two: it advances the SQ tail to publish them. Step three: it calls io_uring_enter to notify the kernel — or, in SQPOLL mode, a kernel poller thread picks the entries up on its own with no syscall. Step four: the kernel executes the operations asynchronously. Step five: the kernel posts a CQE for each completed operation into the completion queue. Step six: the app reaps CQEs from the CQ head, matching each result to the operation it submitted.](/writing/io-uring-submission-flow.svg "Fill SQEs, publish the tail, notify (or don't), reap completions. Submission and completion, fully decoupled.")

And then the interface takes one more step, into genuinely strange territory. There's a mode called **SQPOLL**, where you ask the kernel to spawn a dedicated thread that *polls* the submission queue on its own. When SQPOLL is on, you place SQEs in the ring and the kernel thread notices them and starts working — and you never call `io_uring_enter` at all. In steady state, under load, your application submits I/O with **zero system calls**. The boundary you were paying to cross hundreds of thousands of times a second simply stops being crossed. You write to memory; a kernel thread reads that memory; work happens. It is about as close to "free I/O" as a general-purpose OS gets.

## Why this is a genuinely big deal

Pull the threads together and io_uring is doing four distinct things, each valuable on its own:

1. **It amortizes or eliminates the syscall cost.** Batching turns N crossings into one; SQPOLL turns them into zero. On syscall-bound workloads — lots of small, fast operations — this alone is transformative.
2. **It offers true async for *everything*.** Not just sockets. Buffered file reads, writes, `fsync`, `openat`, `close` — the operations that used to force you into a thread-pool workaround are now first-class async submissions. This is the part `epoll` could never do, and for storage-heavy systems it's the headline.
3. **Registered (fixed) buffers and files.** You can pre-register a set of buffers and file descriptors with the ring once, and then reference them by index. This skips repeated work the kernel would otherwise redo on every operation — pinning memory pages, resolving and refcounting file descriptors. Pay the setup cost once, save it on every subsequent I/O.
4. **Linked operations.** With `IOSQE_IO_LINK`, you can chain SQEs so one runs only after the previous completes — "read from this file, *then* write what you read to that socket" — expressed as a dependency the kernel enforces internally, without a round trip back to your code between the steps. The dependency lives in the kernel; you don't wake up to orchestrate it.

## Where it already runs (probably in your stack)

You rarely touch io_uring directly. The ergonomic path is **liburing**, a C library that wraps the raw ring mechanics — setup, SQE preparation, submission, completion reaping — behind sane functions so you don't hand-manage memory barriers and index arithmetic. But even liburing is lower-level than most backend engineers ever need, because the systems you *depend on* have adopted it for you:

- **TigerBeetle** — the financial database — leans on io_uring for its I/O path.
- **ScyllaDB**, via the Seastar framework, uses it to drive storage and network at high throughput.
- **PostgreSQL 18** shipped a new asynchronous I/O subsystem that can use io_uring as a backend.
- **Node.js** benefits through **libuv**, which uses io_uring for parts of its file I/O on new-enough kernels — so existing JavaScript got faster with no code change.
- The **Rust** ecosystem has whole runtimes built on it: `tokio-uring`, `glommio`, `monoio`.

Notice the pattern: you get io_uring's wins by *upgrading your database, runtime, or proxy*, not by writing ring code. That's exactly why the mental model matters more than the API. When your Postgres upgrade or your kernel bump makes I/O faster, this is frequently why — and knowing the SQ/CQ shape tells you *which* workloads will benefit (many small operations, disk-bound paths) and which won't (a handful of large sequential transfers were never syscall-bound to begin with).

## The honest caveats

This is where I have to be straight with you, because io_uring is powerful enough to be oversold, and it has real edges.

**Security has been a genuine sore spot.** io_uring's power — a rich, asynchronous, shared-memory interface into the kernel — is also a broad attack surface, and it has had a notable run of kernel CVEs. This isn't hypothetical hand-wringing: Google has restricted or disabled io_uring across ChromeOS, Android, and parts of its production fleet, and hardened distributions gate it behind a sysctl (`kernel.io_uring_disabled`) so operators can turn it off entirely. If you don't control the kernel your code runs on, you may find io_uring simply isn't available to you — by policy, not by accident.

**It's kernel-version-sensitive.** The feature set grew dramatically from 5.x into 6.x. Opcodes, flags, and performance characteristics that exist on a modern kernel may be missing or buggy on an older one. Code that assumes a recent io_uring can fail to load or silently lose capabilities on an LTS kernel a couple of years behind.

**The raw API is easy to misuse.** Asynchrony plus manually managed buffers is a sharp combination. A buffer or file descriptor referenced by an in-flight SQE must stay valid until its completion arrives — free it too early and the kernel writes into memory you've handed back, a use-after-free with the kernel as the writer. This is precisely why liburing and higher-level runtimes exist: to keep application authors away from the footguns.

Put it together and the honest framing is this: io_uring is a spectacular tool for I/O-bound infrastructure where you control the kernel and the workload is full of small operations — databases, storage engines, proxies, high-throughput network services. It is not a free, drop-in "make everything faster" switch, and on a locked-down or security-sensitive platform it may be off the table entirely.

## The takeaway

The classic Linux I/O model made you pay a syscall for every operation and gave you no honest way to do async file I/O at all. Those were tolerable compromises until CPU-mitigation overhead made every boundary crossing pricier and modern services started doing millions of tiny operations a second. io_uring changes the shape of the deal: share a page of memory, describe work as entries in a ring, and let the kernel churn through it asynchronously — batching hundreds of operations into a single syscall, or with a polling thread, none.

You will likely never write ring code by hand. But the next time a database release note says "new async I/O backend," or a kernel upgrade quietly lifts your throughput, you'll know the machinery underneath: two rings, a shared page, and a boundary that finally stopped charging admission on every single crossing.
