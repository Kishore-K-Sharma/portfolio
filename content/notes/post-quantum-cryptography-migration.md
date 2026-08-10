---
title: "Post-Quantum Cryptography: The Traffic You're Encrypting Today Is Already Being Stolen"
description: "There is no cryptographically-relevant quantum computer yet, and your TLS is already broken for anything with a long shelf life. Adversaries record ciphertext now and decrypt it later, so the clock started years ago. Here's what NIST actually finalized, why key exchange is the urgent fix and signatures are the slow one, and how a backend engineer starts migrating."
date: "2026-08-01"
tags: ["post-quantum-cryptography", "cryptography", "security", "tls", "backend"]
category: "engineering"
---

Here is a claim that should ruin your afternoon: a chunk of the traffic your service encrypted this morning is already compromised. Not "will be." Is. There is no quantum computer capable of breaking it yet — and it doesn't matter, because the attack doesn't require one to be running *now*. It requires one to exist *eventually*, plus a hard drive today. Someone is already recording, and the confidentiality of anything you send with a long shelf life is a bet that quantum computers stay hard forever. That bet is looking worse every year.

This is the strange thing about post-quantum cryptography: most security work is about threats that are live right now, but this one is scheduled. The migration is enormous, the deadline is unknown but real, and the smartest thing you can do is treat it as already passed for your most sensitive data. Let me explain why, and what a backend engineer actually does about it this quarter.

## What quantum computers break, and — crucially — what they don't

The panic gets a lot more manageable once you're precise about the blast radius, because it is much narrower than the headlines suggest.

The whole of practical cryptography splits into two families. **Symmetric** crypto — AES for encryption, SHA-256/512 for hashing — uses one shared key and relies on brute force being infeasible. **Asymmetric** (public-key) crypto — RSA, elliptic-curve Diffie-Hellman, ECDSA — relies on specific math problems (factoring large integers, computing discrete logarithms) being hard. This is what does key exchange and digital signatures: the machinery that lets two strangers agree on a secret over a hostile network and prove who they are.

Quantum computers threaten these two families very differently.

**Shor's algorithm** is the apocalypse, and it is precise about its targets. Given a large enough quantum computer, Shor factors integers and computes discrete logs in polynomial time. That doesn't *weaken* RSA and ECC — it *ends* them. Every RSA key, every ECDH handshake, every ECDSA signature that has ever protected anything becomes forgeable and readable. Asymmetric crypto as deployed isn't "harder in a quantum world"; it's broken in one.

**Grover's algorithm** is the one people over-fear. It gives a quadratic speedup on brute-force search, which sounds scary until you do the arithmetic: it effectively halves your key strength. AES-256 drops to a still-absurd 128 bits. SHA-256 and SHA-512 stay comfortably fine. So the symmetric-side fix is roughly "use AES-256, which you probably already do, and move on." No redesign, no new algorithms, no migration.

Sit with that split, because it's the load-bearing fact of the whole topic: **the crisis is entirely asymmetric.** Key exchange and signatures. Your bulk encryption is fine. What's in danger is the part that establishes the keys and proves identity — which, unfortunately, is the part every secure connection on earth depends on.

## Harvest now, decrypt later: why the clock already started

Here is the mechanism that turns a future threat into a present one, and it deserves its own name because it changes the entire risk calculation. It's called **harvest now, decrypt later** (HNDL).

An adversary with the budget — a nation-state, mostly, but storage is cheap and getting cheaper — does something almost boring today: they record encrypted traffic off the wire and write it to disk. They can't read it; they just keep it. Then they wait. When a cryptographically-relevant quantum computer (a CRQC) finally exists — five years from now, fifteen, nobody knows — they pull the archive off the shelf and decrypt all of it retroactively, using Shor to recover the session keys from the recorded key exchange.

![A left-to-right timeline. Today, an attacker passively captures TLS ciphertext off the network and writes it to cheap long-term storage. The middle of the timeline is a long waiting gap labeled 'years pass — data sits in storage.' At the right, a cryptographically-relevant quantum computer arrives and the attacker runs Shor's algorithm to decrypt the entire archive retroactively. A callout marks that any secret whose confidentiality must outlive the CRQC is already lost the moment it is transmitted today.](/writing/pqc-harvest-now-decrypt-later.svg "The attack needs a hard drive today and a quantum computer someday. Long-lived secrets sent now are already at risk.")

This is why "there's no quantum computer yet" is false comfort. The *capture* happens now, with technology that exists and is cheap. The *decryption* happens later. The only thing that matters is whether your data still needs to be secret when the CRQC arrives.

So do the math on your own data's confidentiality lifetime. A session cookie that expires in an hour? Who cares — it's worthless long before any quantum computer shows up. But health records, financial data, government secrets, source code, long-lived credentials, anything with a legally-mandated retention period — those must stay confidential for years or decades. If a secret you transmit today must remain secret past the CRQC's arrival, then transmitting it under RSA or ECDH today means **you have already lost it.** The breach is just pending decryption.

That's the reframe that should drive your urgency. You are not migrating ahead of a future problem. For your longest-lived secrets, you are already late.

## What NIST actually finalized

Enough dread. In 2024 the standards landed — this stopped being research and became engineering. After nearly a decade of open competition, NIST finalized three post-quantum standards worth knowing by their real names:

- **FIPS 203 — ML-KEM** (Module-Lattice Key Encapsulation Mechanism, derived from CRYSTALS-Kyber). This is the key-exchange replacement — the big one, because key exchange is what HNDL attacks. A KEM differs slightly in shape from Diffie-Hellman: one side encapsulates a secret to the other's public key, the other decapsulates it, and both end up holding the same shared secret. Different mechanics, same job.
- **FIPS 204 — ML-DSA** (Module-Lattice Digital Signature Algorithm, from CRYSTALS-Dilithium). The primary signature replacement, for the identity-and-authenticity side: certificates, code signing, tokens.
- **FIPS 205 — SLH-DSA** (Stateless Hash-based Digital Signature Algorithm, from SPHINCS+). A signature scheme built purely on hash functions. It's slower and larger, but rests on the most conservative, best-understood security assumption we have — the choice when you want maximum confidence and can eat the cost.

All three are lattice- or hash-based, deliberately built on math problems that neither Shor nor any other known quantum algorithm breaks. These are the primitives you will actually deploy. Kyber and Dilithium are the old research code-names; ML-KEM and ML-DSA are the standards.

## Hybrid first: don't bet the connection on a single new primitive

Now, a reasonable objection: these algorithms are new. Battle-tested classical crypto took decades to earn trust, and lattice cryptography is comparatively young. What if ML-KEM has a flaw we haven't found? Ripping out X25519 for a five-year-old primitive trades a known future risk for an unknown present one.

The industry's answer, and the right one, is **hybrid key exchange.** You don't choose. You run a classical algorithm (like X25519) and a post-quantum one (like ML-KEM-768) side by side in the same handshake, derive a shared secret from *each*, and feed both into a key-derivation function that combines them into the one session key you actually use.

![A hybrid key-exchange handshake. Two parallel paths run through a single TLS handshake. The top path is classical: X25519 elliptic-curve Diffie-Hellman produces shared secret A. The bottom path is post-quantum: ML-KEM-768 encapsulation produces shared secret B. Both secrets flow into a single key-derivation function (KDF) that concatenates and hashes them into one final session key. A caption states the connection stays secure as long as at least one of the two primitives holds: classical breaks defend against a quantum computer via ML-KEM, and an ML-KEM flaw is still covered by X25519.](/writing/pqc-hybrid-key-exchange.svg "Combine a classical and a post-quantum secret through one KDF. Safe if either primitive survives.")

The property this buys you is beautiful in its simplicity: **the connection is secure as long as at least one of the two primitives holds.** If quantum computers arrive and break X25519, ML-KEM still protects you. If some cryptographer finds a devastating flaw in ML-KEM tomorrow, X25519 still protects you. You are only exposed if *both* fall — and the odds of a classical break and a lattice break landing simultaneously are what let engineers sleep. Hybrid is a hedge, and hedging is exactly the correct posture when you're forced to deploy young cryptography before it's fully aged.

The genuinely good news: this is already shipping in production, today, not in some roadmap. The `X25519MLKEM768` hybrid group is live in TLS 1.3 across Chrome, Cloudflare, OpenSSL 3.5, and AWS's endpoints. If you run a modern reverse proxy or terminate TLS on a current library, you may be one config flag — or one version bump — away from post-quantum key exchange on your edge. This is the cheapest, highest-value move available, and it directly defuses harvest-now-decrypt-later for your live traffic.

## Why signatures are the harder, less urgent problem

Signatures are a different story: both harder to migrate *and* less of an emergency.

Less urgent first: signatures authenticate things happening *right now*. A TLS certificate proves the server's identity during a handshake occurring today. To forge it, an attacker needs a quantum computer that exists *at the moment of the attack* — you can't retroactively forge a signature for a handshake that already happened and mattered only in that instant. There's no harvest-now-decrypt-later analog for authentication. So the pressure is real but it tracks the CRQC's actual arrival, rather than starting years early. Confidentiality is the thing that leaks backward through time; authenticity isn't.

Harder to migrate, though, on nearly every axis. The post-quantum signatures are *big* — ML-DSA keys and signatures run to kilobytes where ECDSA measured in tens of bytes, and SLH-DSA is larger and slower still. That bloat lands right where it hurts: certificate chains carry multiple signatures and keys, so a handshake can balloon in size, and the whole global PKI — root programs, CAs, every device validating a chain — has to move in lockstep. It's a coordination problem across the internet's entire trust infrastructure, not a flag you flip. Slow by nature — the other reason to do the urgent confidentiality work first and let signatures proceed on their longer clock.

## You can't migrate what you can't find

Here's the operational wall every organization hits, and it's not a math problem — it's an inventory problem. **You cannot migrate cryptography you don't know you have.**

RSA and ECC are not tidily confined to your TLS terminator. They're smeared through the whole stack: JWT signing keys, mTLS between services, code-signing pipelines, VPN tunnels, database and disk encryption, SSH keys, secrets managers, hardware security modules, and — the nasty one — cryptographic assumptions baked deep inside third-party libraries and vendor products you don't control and may not even be able to see into.

So the first real engineering deliverable isn't a code change. It's a **cryptographic bill of materials (CBOM)**: a systematic inventory of every place asymmetric crypto lives in your systems — what algorithm, what key sizes, which library and version, and, most importantly, what data each one protects and for how long that data must stay secret.

![A two-by-two prioritization matrix for a cryptographic inventory. The horizontal axis is exposure, from low to high. The vertical axis is confidentiality lifetime, from short to long. The top-right quadrant, high exposure and long lifetime, is marked in danger color as MIGRATE FIRST and contains long-term archives, health and financial records, and internet-facing TLS carrying sensitive payloads. The top-left, long lifetime but low exposure, is second priority. The bottom-right, short lifetime but high exposure, is third: internet-facing session TLS and ephemeral tokens. The bottom-left, short lifetime and low exposure such as internal short-lived session keys, is lowest priority. Code-signing keys are called out separately as a distinct long-horizon signature concern.](/writing/pqc-crypto-inventory.svg "Rank every crypto asset by confidentiality lifetime times exposure. The long-lived, internet-facing secrets migrate first.")

With the inventory in hand you prioritize by the two axes that actually matter: **confidentiality lifetime × exposure.** A long-lived secret on an internet-facing path is a five-alarm fire — that's your harvest-now-decrypt-later exposure, and it goes first. A short-lived secret on an internal-only path can wait. This is also the moment you'll discover you have far more RSA than you thought, in far more places — which is exactly why the inventory is the thing to start early.

The word for the capability you're actually building is **crypto-agility**: the property that you can swap cryptographic primitives without re-architecting the system around them. Most systems hardcode a specific curve or key size across dozens of call sites, assuming it's permanent. This migration is the last time you want that to be true. Build the abstraction now so that ML-KEM-768 today, and whatever replaces it in 2035, is a configuration change and not a rewrite.

## What a backend engineer does this quarter

Strip away the dread and the standards alphabet soup, and there's a concrete, ordered checklist:

- **Start the inventory now.** Build the CBOM. Find every place RSA and ECC live and tag each with its data's confidentiality lifetime and exposure. This is the long pole and it depends on nothing else, so it starts today.
- **Enable hybrid key exchange wherever your stack supports it.** `X25519MLKEM768` in TLS 1.3 is the single highest-value move — it defuses HNDL for your live traffic. Update your proxies and TLS libraries, check whether it's already available behind a flag, turn it on.
- **Watch your handshake sizes.** ML-KEM keys run around a kilobyte, which can push a TLS or QUIC handshake past the size assumptions in initial packets and MTU-sensitive paths. Test it; don't get surprised by fragmentation or a latency regression in production.
- **Plan the signature migration, but don't rush it.** Track ML-DSA adoption in your PKI and code-signing paths. It's real work on a longer clock, gated by the wider ecosystem, and it's less HNDL-urgent — sequence it after the confidentiality wins.
- **Demand crypto-agility from your vendors.** Every product and library you depend on carries crypto you can't see. Ask them now what their post-quantum roadmap is. The ones without an answer are the risk you can't patch yourself, and you want to know that before the CRQC does.

## The takeaway

Post-quantum migration feels like preparing for an earthquake with no known date, and the instinct is to wait until the ground actually moves. Harvest-now-decrypt-later is why that instinct is wrong: for your most sensitive, longest-lived data, the ground moved years ago and you simply haven't felt it yet. The capture is happening now; only the decryption is deferred.

The standards exist. ML-KEM, ML-DSA, and SLH-DSA are finalized and shipping. Hybrid key exchange is deployed across the tools you already run and hedges against betting the connection on young cryptography. The blast radius is narrower than the headlines — the asymmetric primitives, not your AES-256 — so the problem is large but bounded. Start the inventory, turn on hybrid key exchange, and build crypto-agility so the *next* transition is a config change. The engineers who begin now are protecting data that's being recorded today. The ones who wait for a quantum computer to appear will be protecting data that was already stolen.
