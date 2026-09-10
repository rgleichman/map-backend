# Trust system design

Trust is Storymap’s **content moderation strategy**: each user has an effective
trust score `T`. Higher `T` unlocks privileges (world posting, higher rate
limits, approving pending pins, vouching for others). Trust flows from
higher-trust users to lower-trust users when the former **approve** the
latter’s decisions (vouch, pin approve).

This document is the product/math design. Implementation (migrations, APIs,
UI) is a later phase. Where today’s shipped behavior conflicts with this
design, **this document wins**; current code is legacy to replace.

Related: [SPEC.md](../SPEC.md) (world map), [SUB_MAPS.md](SUB_MAPS.md)
(community roles and contribution modes).

---

## 1. Goals and non-goals

### Goals

- Assign each user an effective trust score `T ∈ [0, 1]` (plus debug
  components).
- Gate privileges on `T` (and mute / break-glass admin).
- Emit trust from **vouch** and **pin approve** in v1.
- Satisfy the mathematical properties in §3–4 (monotonic vouch, decay,
  high-trust weight, sybil caps, sequencing invariance when decay is off).
- Keep an append-only ledger so scores are recomputable and auditable.

### Non-goals (this design revision)

- Shipping Elixir/React/migrations in the same change as this doc.
- Peer “star ratings” or turning **hearts** into trust edges (hearts stay
  private saves).
- Full KYC / CAPTCHA / bot-attestation UX (ledger slots reserved; see §8).
- Deleting community `owner` / `moderator` roles — trust **adds** who may
  approve; it does not remove roles.

---

## 2. Breaking changes from current product

| Today (legacy) | Target |
|----------------|--------|
| Any non-muted authenticated user may create **world** pins; status always `:approved` | Direct world create (`:approved`) requires `T ≥ T_world`. Below that, world pins are created `:pending` until a trust-qualified (or role/admin) approver accepts them |
| Flat authenticated rate limits (e.g. `api_writes`) | Rate-limit **bands** from trust tier |
| Only community owner/moderator or site `admin_level ≥ 1` can approve pending pins | Anyone with `T ≥ T_approve` **or** legacy owner/mod/admin may approve pending **world** and **community** pins |
| Site privilege axis ≈ mute + `admin_level` | Effective trust `T` is a first-class privilege axis; mute still hard-blocks writes; `admin_level` is seed + break-glass |
| “Reputation scores” deferred as Tier 3 | Trust is the moderation strategy (this document) |

**Kept (non-conflicting):** hearts are not trust; community
`contribution_mode` still decides whether community creates start pending;
mute supersedes trust.

---

## 3. Threat model

| Threat | Mitigation in this design |
|--------|---------------------------|
| **Sybil / friend clique** all vouch each other | EigenTrust with **pre-trusted seeds**; trust mass outside the seed set cannot grow without a path from seeds (§4.4, §4.7) |
| **Spray vouching** | Cap `k` active vouches per user; **row-normalize** local trust so one user cannot mint unbounded mass |
| **Approve farming** | Diminishing returns on repeated `approver → author` pairs; only actors who passed the approve gate at event time write edges |
| **Self-dealing** | No self-vouch; no self-approve credit |
| **Sequencing games** (verify or vouch in a clever order) | Score is a pure function of the **edge multiset** and timestamps; when social decay is zero, order of insertion does not matter (§4.6) |
| **Identity timing vs decay** | Identity component uses **no decay**; social edges may decay independently |

---

## 4. Mathematics

This section is written for a strong math student who has not used linear
algebra recently. We only need: vectors, matrices as “grids of numbers,”
matrix–vector multiply as “weighted mixing,” and the idea of iterating until
things settle.

### 4.1 Intuition (no matrices yet)

Think of trust as a **fixed amount of “trust mass”** in the system (like a
budget of credibility). Pre-trusted people (site moderators / bootstrap
accounts) start with almost all of it. Everyone else earns a share only when
someone who already has mass **points at them** (vouch or approve).

If ten sockpuppets only point at each other and never get pointed at by
anyone connected to the seeds, they can reshuffle mass *among themselves*
but they cannot mint new mass from nowhere. That is the sybil cap.

Approvals from high-trust users move more mass than approvals from
low-trust users, because the edge is only as useful as the trust already
held by the person casting it.

### 4.2 Score shape

| Symbol | Meaning | Range |
|--------|---------|--------|
| `T_social` | Social / graph trust from EigenTrust | `[0, 1]` after normalization |
| `T_id` | Identity attestations (non-decaying) | `[0, 1]` |
| `T` | Effective trust used for privileges | `[0, 1]` |

\[
T = \mathrm{clamp}\bigl(\alpha\, T_{\mathrm{social}} + \beta\, T_{\mathrm{id}},\, 0,\, 1\bigr)
\]

Default weights (tunable): \(\alpha = 0.85\), \(\beta = 0.15\).

v1 exposes one effective score plus the two components for admin/debug.
Multiple axes (e.g. separate “content” vs “social” privileges) are future
work (§8).

### 4.3 Local trust edges (raw opinions)

Users are nodes \(1 \ldots n\). Directed edges carry non-negative raw weight
\(s_{ij} \ge 0\): “\(i\) endorses \(j\).”

**V1 edge types**

1. **Vouch** \(i \to j\): raw weight \(w_{\mathrm{vouch}}\) (default `1.0`).
   At most one **active** vouch per ordered pair; revoke is a tombstone, not
   a silent delete. Each user may have at most \(k\) active outgoing vouches
   (default `5`).
2. **Pin approve** \(i \to j\) where \(j\) is the pin author: contribute raw
   weight with **diminishing returns** on the count \(m\) of approvals from
   the same \(i\) toward the same \(j\):

\[
s^{\mathrm{approve}}_{ij}
  = 1 - (1 - w_{\mathrm{approve}})^{m}
\]

with default \(w_{\mathrm{approve}} = 1\) so the first approval gives full
credit and further approvals from the same pair add nothing until we lower
\(w_{\mathrm{approve}}\) or change the formula. Prefer documenting
\(w_{\mathrm{approve}} = 0.5\) if multiple approvals per pair should matter
somewhat; **default for v1:** \(w_{\mathrm{approve}} = 0.5\), so
\(m=1 \to 0.5\), \(m=2 \to 0.75\), \(m=3 \to 0.875\), …

Self-edges are forbidden: \(s_{ii} = 0\).

**Time decay (social edges only).** At scoring time \(t\), an edge created at
\(t_e\) is scaled by a half-life \(h\) (default **180 days**):

\[
s_{ij}(t)
  = s_{ij}^{\mathrm{raw}}
    \cdot 2^{-(t - t_e)/h}
\]

If several events contribute to the same pair, decay each event from its own
\(t_e\), then combine (for vouches: single active edge; for approves: apply
diminishing returns on decayed event weights, or decay after aggregation —
pick one and keep it stable; **chosen rule:** decay each approve event, sum
decayed weights as \(m_{\mathrm{eff}}\), then apply diminishing returns using
\(m_{\mathrm{eff}}\) rounded via the continuous form
\(1 - (1-w)^{m_{\mathrm{eff}}}\) with real \(m_{\mathrm{eff}}\)).

**Identity** contributions never use this decay (\(h_{\mathrm{id}} = \infty\)).

### 4.4 Local trust matrix (row normalization)

Raw endorsements are turned into a **local trust matrix** \(C\), an
\(n \times n\) grid. Entry \(c_{ij}\) means: “of all the trust that \(i\)
chooses to hand out, what fraction goes to \(j\)?”

For each user \(i\), let \(S_i = \sum_j s_{ij}(t)\). If \(S_i > 0\),

\[
c_{ij} = \frac{s_{ij}(t)}{S_i}
\]

so each row sums to 1 (a discrete probability distribution over whom \(i\)
trusts). If \(S_i = 0\) (user \(i\) endorses nobody), row \(i\) is replaced by
the **seed prior** row (same as \(\mathbf{p}^\top\) below): someone with no
opinions falls back to “trust the seeds.”

**Linear algebra refresh:** a **vector** \(\mathbf{t} = (t_1,\ldots,t_n)\)
stores one number per user. Multiplying \(C^\top \mathbf{t}\) produces a new
vector whose \(j\)-th entry is \(\sum_i c_{ij} t_i\): each endorser \(i\)
sends fraction \(c_{ij}\) of their current trust mass to \(j\). So one
multiply is one round of “everyone redistributes their trust along their
outgoing edges.”

### 4.5 Pre-trusted seed prior \(\mathbf{p}\)

Let \(P\) be the set of seed users (site `admin_level ≥ 1` and/or a config
list of bootstrap user IDs). Define a probability vector \(\mathbf{p}\)
with \(p_i = 1/|P|\) for \(i \in P\) and \(p_i = 0\) otherwise.
\(\sum_i p_i = 1\).

Seeds are the only place trust mass is injected on every iteration.

### 4.6 EigenTrust iteration (global social trust)

Choose a damping / seed-blend constant \(a \in (0,1)\) (default **\(a = 0.85\)** —
same role as PageRank’s damping). Start from \(\mathbf{t}^{(0)} = \mathbf{p}\).
Iterate:

\[
\mathbf{t}^{(k+1)}
  = (1 - a)\,\mathbf{p}
    + a\, C^\top \mathbf{t}^{(k)}
\]

Stop when \(\lVert \mathbf{t}^{(k+1)} - \mathbf{t}^{(k)} \rVert_1\) is below a
tolerance (e.g. \(10^{-10}\)) or after a max iteration count.

**What this is saying in words**

- With probability-like weight \(a\), trust flows along endorsement edges.
- With weight \(1-a\), trust is pulled back toward the seeds.
- In the limit you get a unique steady distribution \(\mathbf{t}^*\) (for
  connected-enough graphs under standard EigenTrust/PageRank conditions).

Then set

\[
T_{\mathrm{social}}(u) = t^*_u
\]

(already in \([0,1]\) and \(\sum_u t^*_u = 1\)). Privileges compare users on
this scale; absolute values are small when \(n\) is large — thresholds
\(T_{\mathrm{world}}\) etc. must be chosen relative to typical mass, **or**
we re-expose a **percentile / rank-normalized** view for gates.  

**Chosen privilege scaling:** after computing \(\mathbf{t}^*\), define a
**calibrated** social score for gates by rank:

\[
T_{\mathrm{social}}^{\mathrm{cal}}(u)
  = \frac{\mathrm{rank}(t^*_u) - 1}{\max(n - 1, 1)}
\]

so the least-trusted user is `0` and the most-trusted is `1` among current
users (ties: average ranks). Store both raw \(t^*_u\) and
\(T_{\mathrm{social}}^{\mathrm{cal}}\) on the score row; **privileges use
\(T_{\mathrm{social}}^{\mathrm{cal}}\)** inside the \(\alpha,\beta\) mix unless
operators switch to raw mode for experiments.

(If \(n = 1\), \(T_{\mathrm{social}}^{\mathrm{cal}} = 1\).)

### 4.7 Why cliques cannot unbounded-inflate trust

Suppose users \(A,B,C\) only vouch each other and never receive edges from
anyone reachable from seeds. In the iteration, the only mass that enters
\(\{A,B,C\}\) comes from:

- the tiny amount of seed prior if one of them is a seed (they are not), and
- edges from outside.

With no outside edges, each step still mixes in \((1-a)\mathbf{p}\), which
puts **zero** on \(A,B,C\). The \(a C^\top \mathbf{t}\) term only moves mass
that those nodes already hold. Starting from \(\mathbf{p}\), they start at
0 and stay near 0. Mutual vouching rearranges nothing they do not have.

Contrast: if a seed vouches \(A\), then \(A\) receives seed mass and can
pass a **fraction** of it to friends — capped by normalization and by how
much the seed chose to allocate. Network size still bounds growth: a small
seed-connected component cannot claim the whole world’s mass without
outsized seed attention.

### 4.8 Identity component (no decay)

\[
T_{\mathrm{id}}(u)
  = \mathrm{clamp}\Bigl(\sum_{\ell} b_\ell \cdot \mathbf{1}_{u\text{ has attestation }\ell},\, 0,\, 1\Bigr)
\]

| Attestation \(\ell\) | Default bonus \(b_\ell\) | Status |
|----------------------|--------------------------|--------|
| Email confirmed (`confirmed_at`) | `0.2` | Exists today |
| Human verification | `0.5` | Reserved |
| Bot self-identification | `0.4` | Reserved (bots are rewarded for honesty, not for faking human) |

Order of earning attestations does not matter: the sum is commutative.
Because there is no decay, verifying at account creation vs two weeks later
yields the same \(T_{\mathrm{id}}\) (and thus the same contribution to \(T\)
from the identity term). Social decay can still change \(T_{\mathrm{social}}\)
over those two weeks — that is intentional and separate.

### 4.9 Properties checklist

| Property | Status |
|----------|--------|
| My score does not decrease when someone vouches for me | Adding a vouch cannot reduce raw edge weight into me; holding the rest of the graph fixed, that weakly increases my raw \(t^*_u\). Rank-calibrated scores can still move when *other* users’ mass or the population changes — that is a calibration artifact, not “vouch hurt me.” Product copy: vouch improves your standing in the trust graph |
| Decreases with time | Social edges decay; identity does not |
| Increases with valuable content | Pin approve edges from qualified approvers |
| Decreases with crappy content | **Reserved:** pin reject → negative edge (§8). Not in v1 emit set |
| Verified profile info increases trust | \(T_{\mathrm{id}}\) |
| Bot ID / human proof increase trust | Reserved attestations |
| Sequencing invariance when decay = 0 | Ledger + deterministic aggregation; EigenTrust limit unique |
| Fraudulent network capped | Seed-relative EigenTrust + vouch cap + normalize |

**Note:** Percentiles can drift as the user base grows even when your raw
\(t^*_u\) is unchanged. That matches privilege bands meaning “how trusted
are you among users today.” Raw \(t^*_u\) remains available for admin
debugging and experiments.

**v1 privilege input (final):**  
\(T = \mathrm{clamp}(\alpha\, T_{\mathrm{social}}^{\mathrm{cal}} + \beta\, T_{\mathrm{id}}, 0, 1)\).

### 4.10 Worked example (four users)

Users: **Seed** \(S\), honest new user **H**, and sockpuppets **X, Y**.

Edges at scoring time (no decay for simplicity):

- \(S\) vouches \(H\) (weight 1)
- \(X\) vouches \(Y\), \(Y\) vouches \(X\) (weight 1 each)
- No one else vouching

Local rows (normalized):

- \(S\): all outgoing mass to \(H\) → \(c_{SH} = 1\)
- \(H\): no outgoing → use prior (all mass to \(S\))
- \(X\): all to \(Y\); \(Y\): all to \(X\)

Seeds: \(P = \{S\}\), so \(\mathbf{p} = (1,0,0,0)\) in order \((S,H,X,Y)\).

After iteration (qualitatively):

- \(S\) and \(H\) share almost all mass (\(H\) fed by \(S\)’s edge; \(S\) refreshed by prior each step).
- \(X\) and \(Y\) remain near **0** despite mutual vouching.

If later \(H\) (now non-trivial trust) vouches \(X\), a **slice** of mass
reaches \(X\) — but only in proportion to \(H\)’s trust and \(H\)’s
normalized out-edges, not an unbounded clique explosion.

---

## 5. Events and ledger

### 5.1 Append-only `trust_events`

| Column | Type | Notes |
|--------|------|--------|
| `id` | bigserial | PK |
| `type` | enum/string | `vouch`, `vouch_revoke`, `pin_approve` (later: `pin_reject`, identity types) |
| `actor_user_id` | FK users | Who expressed trust |
| `subject_user_id` | FK users | Who received it |
| `pin_id` | FK pins, null | Required for pin approve |
| `payload` | jsonb | Optional metadata (e.g. sub_map_id, gate snapshot) |
| `inserted_at` | utc timestamp | Event time \(t_e\) |

Never update raw events in place; revoke vouch with `vouch_revoke`.

### 5.2 Current-state projection

- `trust_vouches` (or equivalent): active vouch pairs `(actor_user_id,
  subject_user_id)` unique; enforce \(k\) outgoing cap.
- `user_trust_scores`: `user_id`, `t_social_raw`, `t_social_cal`, `t_id`,
  `t_effective`, `computed_at`, `params_version` (hash of half-life, \(a\),
  \(\alpha\), \(\beta\), seed set version).

### 5.3 Emission rules (target)

| Action | Ledger |
|--------|--------|
| User A vouches B (`T(A) ≥ T_vouch`, under budget, A≠B) | `vouch` |
| User A revokes vouch for B | `vouch_revoke` |
| Qualified actor approves pending pin authored by B | `pin_approve` with `pin_id` |

Approver must pass **at event time**: `T ≥ T_approve` **or** community
owner/moderator for that pin’s sub-map **or** site `admin_level ≥ 1`.
Snapshot the gate in `payload` for audits.

### 5.4 Recompute

Batch job (or Oban worker): rebuild local \(s_{ij}(t)\) from events → \(C\) →
EigenTrust → write `user_trust_scores`. Scores are a pure function of
`(events, seed set, params, as_of_time)` for tests.

---

## 6. Privilege ladder and world pending queue

Defaults below are **starting constants** — retune with production data.

| Privilege | Gate | Notes |
|-----------|------|--------|
| Create world pin as `:approved` | `T ≥ T_world` (default `0.55`) | Replaces open world create |
| Create world pin as `:pending` | Authenticated, not muted, `T < T_world` | Optional floor `T ≥ T_world_submit` (default `0`) |
| Approve pending world or community pin | `T ≥ T_approve` (default `0.70`) **or** legacy owner/mod/admin | Expands who clears queues |
| Issue vouch | `T ≥ T_vouch` (default `0.60`) and `< k` active out-vouches | New action |
| Rate-limit band | See §6.1 | Replaces flat authed limits |

**Mute** (`muted_at` set): no writes, no vouch, no approve — trust irrelevant.  
**Admin break-glass:** `admin_level ≥ 1` may always moderate pins; seeds for EigenTrust.

### 6.1 Rate-limit bands (authenticated)

Illustrative `api_writes` per 60s window (IP anon limits unchanged):

| Band | Condition | Limit |
|------|-----------|--------|
| Low | `T < 0.30` | 20 |
| Mid | `0.30 ≤ T < 0.60` | 60 (≈ today’s flat) |
| High | `T ≥ 0.60` | 120 |

Apply the same banding idea to other write buckets as needed.

### 6.2 World pending queue

1. Author with `T < T_world` creates a world pin (`sub_map_id` null) →
   `status: pending` (not on public world list).
2. Approver with trust or admin/mod gate sets `approved` → public +
   `pin_approve` ledger edge toward author.
3. Reject (when wired) → `rejected` + reserved negative edge.

Community `contribution_mode: approval_required` unchanged for *whether*
pins start pending; trust changes *who may approve*.

### 6.3 Vouch API sketch (not implemented here)

- `POST /api/users/:id/vouch` — auth, CSRF, `T ≥ T_vouch`, caps, no self.
- `DELETE /api/users/:id/vouch` — revoke.
- Responses include updated residual vouch budget; not necessarily live
  recomputed `T` (score may lag until job runs).

---

## 7. Target mapping onto Phoenix (legacy → replace)

| Area | Legacy behavior | Target |
|------|-----------------|--------|
| `Pins.create_pin/3` / `Pins.Policy.authorize_create` | Any non-muted user; force `:approved` | Trust gate; pending world path when below `T_world` |
| World listing queries | Approved world pins | Unchanged visibility rules for `:pending` (author + approvers/admins) |
| `SubMaps.approve_pin/3` | `can_moderate?` only | Trust **or** role/admin; emit `pin_approve` |
| New `Pins.approve_world_pin/2` (name TBD) | N/A | Same gate + ledger + broadcast |
| `StorymapWeb.Plugs.RateLimit` | Flat authed limits | Look up band from `user_trust_scores.t_effective` (fallback Mid if missing) |
| Admin users LiveView | mute / admin_level | Show `T`, components, seed flag; trigger recompute |
| Hearts | Private saves | Still not trust edges |

Community membership roles remain for ownership, settings, and
moderation UX; they are no longer the sole approve authority.

---

## 8. Future work

- **Pin reject → negative local trust** (crappy content): signed edges or a
  separate “distrust” channel mixed carefully so griefing is seed-weighted.
- **Peer content evaluation** beyond mod/trust approve (“this pin was
  valuable”) with the same high-trust-weights-more rule.
- **Human / bot attestations** and richer profile verification in \(T_{\mathrm{id}}\).
- **Multi-axis scores** (content vs social) if privileges should diverge.
- **Live incremental EigenTrust** approx. if batch latency becomes painful.
- Optional: map heart → weak edge (explicitly rejected for v1).

---

## 9. Open parameters

| Parameter | Default | Role |
|-----------|---------|------|
| EigenTrust \(a\) | `0.85` | Blend between seed prior and edge flow |
| Social half-life \(h\) | `180` days | Edge decay; `∞` for identity |
| \(\alpha, \beta\) | `0.85, 0.15` | Mix social cal + identity → `T` |
| \(w_{\mathrm{vouch}}\) | `1.0` | Raw vouch weight before normalize |
| \(w_{\mathrm{approve}}\) | `0.5` | Diminishing-returns base for approves |
| \(k\) vouch budget | `5` | Max active out-vouches |
| \(T_{\mathrm{world}}\) | `0.55` | Direct approved world create |
| \(T_{\mathrm{approve}}\) | `0.70` | Trust-qualified approver |
| \(T_{\mathrm{vouch}}\) | `0.60` | May vouch |
| Rate bands | 20 / 60 / 120 | `api_writes` per 60s |
| Email confirmed \(b\) | `0.2` | Identity bonus |

Store `params_version` on materialised scores whenever these change so
admins know whether a row is stale relative to config.

---

## 10. Implementation phases

1. **Ledger + score job + admin readouts** — done (schemas, EigenTrust recompute, admin Users trust column / Recompute trust).
2. **Emit `pin_approve` from existing approve paths;** add world pending + trust-or-role approve.
3. **Gate world create and rate-limit bands on `T`.**
4. **Vouch API + UI;** enforce `T_vouch` and budget \(k\).
5. **Reject / identity attestations** as follow-on signals.

**Ops:** after deploy of the score job, run `mix trust.recompute` once (or use Admin → Recompute trust) so `user_trust_scores` is populated.
