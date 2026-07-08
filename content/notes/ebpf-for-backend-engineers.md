---
title: "What Every Backend Engineer Should Know About eBPF"
description: "There is a way to run your own code inside the Linux kernel — attached to a syscall, a network packet, a function entry — without writing a kernel module and without rebooting. That sounds like it should be impossible or insane, and it's neither. It's eBPF, and it's quietly become the foundation under nearly every observability, networking, and security tool you already use."
date: "2026-07-07"
tags: ["ebpf", "linux", "observability", "networking", "kernel", "backend"]
category: "engineering"
---

Here is a claim that should make you slightly nervous: you can write a small program, hand it to the Linux kernel, and have the kernel run it — inside kernel space, at ring 0, on the hot path of a live production process — without compiling a kernel module and without a single reboot. No `insmod`. No maintenance window. The process you're inspecting doesn't even notice.

For most of Linux's history that sentence was a fantasy. Kernel space was a walled garden. If you wanted to change what the kernel did — trace a syscall, rewrite a packet, watch a function — you wrote a kernel module in C, loaded it into the running kernel, and accepted that a null pointer or an infinite loop wouldn't crash *your program*, it would crash *the machine*. One bad module took down the whole box. So you didn't do it casually, and as an application engineer you basically never did it at all.

eBPF is the thing that changed that, and it changed it so thoroughly that you're almost certainly using it right now without knowing. The name is a historical accident — it stands for "extended Berkeley Packet Filter," which tells you where it came from (packet filtering) and nothing about what it does now. What it does now is let you run sandboxed programs inside the kernel, safely, at production speed. Let's unpack why that's safe, why it's fast, and why it matters to you even though you will probably never write a line of it by hand.

## What "a program in the kernel" actually means

Start with the shape of it. Your eBPF program is a tiny piece of code that gets **attached to a hook** — a specific event inside the kernel. When that event fires, your code runs. The menu of hooks is the whole point:

- **kprobes and tracepoints** — attach to (nearly) any kernel function entry or exit, or to a stable, predefined tracepoint. "Run my code every time the kernel opens a file" or "every time a TCP connection changes state."
- **syscalls** — run when a process makes a specific system call.
- **network hooks** — XDP (at the network driver, before the kernel even builds a socket buffer) and tc (traffic control), where you can inspect, count, drop, or redirect packets.
- **uprobes** — even user-space function entry points, so you can trace a running application binary.

Your program runs at the hook, does a little work, and stores what it learned somewhere. That "somewhere" is the second half of the machinery: an **eBPF map**. A map is a key-value data structure that lives in the kernel but is readable and writable from user space. It's the bridge. Your in-kernel program writes counts, histograms, stack traces, or events into a map; a normal user-space program (your tracing tool) reads them out. The kernel side collects; the user side reports.

![Userspace and kernel are split by the syscall boundary. An eBPF program is attached to kernel hooks — syscalls, network events, tracepoints — runs sandboxed inside the kernel, writes to an eBPF map, and a userspace tool reads results out of that map without any changes to the application being observed.](/writing/ebpf-where-it-runs.svg "The program runs in the kernel at a hook; a map carries the data up to userspace.")

That's the entire mental model. Attach to a hook, run when it fires, write to a map, read the map from user space. No reboot because you're not changing the kernel binary — you're loading a program *into* a kernel that was built to accept programs. No code changes to the target because you attached to a kernel or library hook the target was already going to hit anyway.

## The verifier: why this isn't insane

The obvious objection is the one I opened with. Running arbitrary code in the kernel is exactly how you crash machines. What stops my buggy eBPF program from dereferencing garbage and taking down the host?

The answer, and the single most important idea in eBPF, is the **verifier**. Before the kernel agrees to run your program, it statically analyzes it — walks every possible path through the code — and *proves* a set of safety properties. If it can't prove them, the program is rejected at load time and never runs at all. It doesn't crash later; it simply isn't allowed in.

What the verifier insists on:

- **It must terminate.** No unbounded loops. Historically eBPF banned loops entirely; modern kernels allow them but only when the verifier can prove a bound. A program that might spin forever is refused, because a program that never returns would wedge the kernel.
- **Every memory access must be provably valid.** You can't read past the end of a buffer or follow a pointer the verifier hasn't confirmed is in-bounds and non-null. It tracks the possible range of every value to prove your accesses are safe.
- **No leaking kernel memory.** You can't read uninitialized kernel stack and smuggle it out to user space.

![The load path: your eBPF bytecode goes to the verifier, which statically proves bounded loops, valid memory access, guaranteed termination, and no leaked kernel pointers. If it passes, the program is JIT-compiled to native code and attached to its hook. If it fails, it is rejected and the loaded code never runs.](/writing/ebpf-verifier-gate.svg "The verifier proves your program safe before it's ever allowed to run in-kernel.")

This is the trade you're making, and it's a real one. The safety is bought with a straitjacket. You're not writing general-purpose C; you're writing code restricted enough that a machine can prove it safe. Anyone who has actually written eBPF will tell you about "fighting the verifier" — rewriting perfectly reasonable-looking code because the analyzer couldn't follow your logic and rejected it. It's genuinely frustrating. But it's *why* you can attach a program to a syscall on a production database server and sleep at night: the kernel already proved your program can't hang it or corrupt it.

Once the program passes, the kernel **JIT-compiles** the eBPF bytecode down to native machine instructions for your CPU. So it doesn't run in a slow interpreter — after verification it runs as fast as compiled native code, which is what makes it viable on genuinely hot paths like every packet on a busy NIC.

## Why you, a backend engineer, actually care

You might be thinking this is a kernel-hacker toy. It is exactly the opposite. The reason to understand eBPF is that the tools you already reach for — or will reach for during your next incident — are built on it. There are three big domains.

![Three columns. Observability: bpftrace and Pixie trace a live process with zero code changes, replacing printf-and-redeploy. Networking: Cilium and XDP give a programmable packet path and in-NIC load balancing, replacing iptables chains. Security: Falco and Tetragon watch every syscall and enforce policy at runtime, replacing post-breach guesswork.](/writing/ebpf-three-domains.svg "One kernel feature underneath modern observability, networking, and security.")

**Observability.** This is the one you'll feel first. `bpftrace` lets you ask questions of a running system in a one-liner — "show me a histogram of the latency of every `read()` syscall this process makes," live, right now, with no code change and no restart. A support ticket lands on a Tuesday saying a service is slow, and instead of adding logging and redeploying, you attach to the running process and *measure* it where it stands. Tools like Pixie extend the same idea across a whole Kubernetes cluster: automatic, zero-instrumentation visibility into HTTP calls, database queries, and service-to-service traffic, because eBPF can see the syscalls and network activity without anyone adding a single line to the application.

**Networking.** This is where eBPF quietly ate an entire layer of the stack. For decades, Linux packet filtering and routing meant `iptables` — long, linear chains of rules that got slow and unmanageable at scale. Modern Kubernetes networking (Cilium is the flagship) replaces that with eBPF programs on the packet path: service load balancing, network policy, and observability implemented as verified programs attached at XDP and tc, dropping or redirecting packets at line rate, sometimes before the kernel even allocates a socket buffer. Your cluster's CNI is probably running eBPF underneath whether you configured it or not.

**Security.** Because eBPF can watch every syscall and network event as it happens, it's an ideal foundation for *runtime* security — not "scan the image before deploy" but "watch what the container actually does while it runs." Falco detects suspicious behavior live (a shell spawned inside a container, an unexpected outbound connection). Tetragon goes further and can *enforce* — not just observe a bad syscall but block it. The shift is from reconstructing what happened after a breach to seeing and stopping it as it occurs.

The through-line: in all three domains you get deep, low-overhead visibility or control over a running system **without modifying that system**. That is the superpower, and it's why eBPF went from networking obscurity to the substrate under the modern cloud-native stack in about a decade.

## The honest limits

It is not magic, and pretending otherwise will bite you.

- **It's Linux-only.** eBPF is a Linux kernel technology. There's early work elsewhere, but if your workload runs on other operating systems, this isn't for you.
- **It's kernel-version-dependent.** Available hooks, helpers, and verifier behavior all evolve with the kernel. A program written against a new kernel may not load on an older one. The community's answer is CO-RE ("Compile Once, Run Everywhere"), which uses kernel type information (BTF) to make programs portable across versions — but it's a solution to a real, ongoing pain, not the absence of one.
- **The verifier is a wall.** As above: the safety guarantee costs you flexibility, and writing non-trivial eBPF means periodically losing arguments with a static analyzer.
- **Observability isn't free.** Overhead is low, not zero. A program on a hook that fires millions of times a second is still doing work millions of times a second. Well-built tools are careful about this; a naive one attached to a hot path can cost you real CPU.

## The takeaway

You very likely will never hand-write an eBPF program, and that's fine — most backend engineers won't. But eBPF has become the load-bearing layer under your observability, your cluster networking, and your runtime security, and that changes what you should expect to be *possible*. The next time a production process is misbehaving and you're reaching for "add logging, redeploy, wait," remember there's another move: attach to the running kernel, watch it directly, and read the answer out of a map. You don't have to write the program. You just have to know the door is there — the kernel has been quietly holding it open for you the whole time.
