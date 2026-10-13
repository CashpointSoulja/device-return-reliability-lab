# Device Return Reliability Lab — brand guide

**Unofficial concept. Synthetic data. No live integrations.**  
**Ayo Ahmed - Independent concept**

I use Deel's current public visual language to make this independent return workflow feel relevant to Deel IT. This is not an official Deel product, endorsement, or claim of access to its internal UI. My evidence is Deel's live public website and publicly displayed product illustrations, not customer account screens.

## Official evidence, observed 13 October 2026

All five page requests below returned HTTP 200. Browser observations use a 1440 × 1000 desktop viewport; the phone reference is 390 × 844. The source JSON records computed styles, element geometry, visible source text, images and links. Screenshots were visually inspected. An initial full-page capture repeated the first viewport during scrolling; it was replaced with a truthful viewport capture.

| Source | What it supports | Saved evidence |
| --- | --- | --- |
| [Official press page](https://www.deel.com/press/) | Live logo, layout, fonts, colours, pill actions and press-kit source | `brand-evidence/press.json`, `press-details.json`, `press-desktop.png`, `press-phone.png`, `press-kit-desktop.png` |
| [Official rebrand](https://www.deel.com/blog/weve-got-a-new-look/) | Bagoss; blue/purple/yellow; warm, optimistic identity; chunky abstract shapes | `brand-evidence/rebrand.json`, `rebrand-desktop.png` |
| [Staff Product Manager, Deel IT role](https://www.deel.com/careers/job/607441dd-c469-43d1-b2cf-5e0c6b7ec20b/) | Operations automation, supplier expansion, labels, tracking, condition documentation, support routing, early SLA warnings | `brand-evidence/role.json`, `role-desktop.png` |
| [One Year of Deel IT](https://www.deel.com/blog/one-year-of-deel-it/) | Official context on onboarding delays, customs/vendor complexity, idle/missing equipment | `brand-evidence/oneYear.json`, `oneYear-desktop.png` |
| [Borderless IT](https://www.deel.com/blog/borderless-it/) | Official return/reuse and automated offboarding context; current yellow/blue tokens | `brand-evidence/borderless.json`, `borderless-desktop.png` |

The press page's **Download** control links to [Deel's own press-kit folder](https://drive.google.com/drive/folders/1CAqVgkHZmzGb85hdTllE8tEK-Ktge9OO?usp=share_link). Its accompanying copy says official logos, product screenshots and team photos are royalty free for online or print use. I have preserved the actual live logo, not recreated its lettering: [`../public/brand/deel-logo.svg`](../public/brand/deel-logo.svg), downloaded from [this official SVG](https://website-media.deel.com/logo_revamp_164ddaed0c.svg). It is 78 × 27, has `fill="none"` on the root and no opaque background rectangle. All source images remain evidence; they are not synthetic people or assets in the app.

## Measured colour tokens

These are current computed CSS values, not a palette guessed from an unrelated brand PDF. Website imagery can contain additional colours; the app uses the restrained subset below.

| Token | Current value | Observed role / evidence |
| --- | --- | --- |
| Ink | `#1B1B1B` / `rgb(27,27,27)` | Press headings, copy, dark offer strip, dark CTA, footer |
| White | `#FFFFFF` | Press navigation, hero and section surfaces |
| Warm cream | `#FAF4EE` | Inverse text / global surface token |
| Pale cream | `#FFFBF4` | Press enclosing surface token |
| Quiet card | `#F7F5F2` | Press newsroom cards; 12px radius |
| Border | `#D9D0CA` | Press neutral border colour |
| Sky blue | `#B1D8FC` | Current offer label / global blue token |
| Light blue | `#DBEEFF` | Borderless IT token |
| Purple | `#5938B7` | Press customer-story pill |
| Deep purple | `#381F89` | Press illustration SVG/UI colour |
| Lilac | `#C4B1F9` | Press illustration accent |
| Yellow | `#FFE27C` | Current Borderless IT computed token |
| Soft yellow | `rgba(254,240,216,.5)` | Borderless IT support surface |

Pixel inspection confirmed near-black strips/buttons, white ground, purple illustration framing and the blue offer label. The yellow and lilac tokens come from computed styles; I do not claim every token appeared as a large solid area in the first viewport. Some computed colours are browser defaults or hidden elements and are deliberately excluded.

## Fonts and actual geometry

| Element | Measured live press style |
| --- | --- |
| Desktop h1 | `BagossCondensedFont`, 56px, weight 500, line height 58.8px, letter spacing −0.28px |
| Desktop h2 | `BagossCondensedFont`, 44px, weight 500, line height 46.2px, letter spacing −0.22px |
| Card h3 | `BagossCondensedFont`, 24px, weight 500, line height 27.6px |
| Main body | `Inter`, 18px, weight 400, line height 28.8px, letter spacing −0.09px |
| Navigation | `BagossStandardVF`, 15px, weight 500, line height 24px |
| Header CTA | `BagossStandardVF`, 14px, weight 500, 40px high, padding 8px 16px, radius 200px |
| Download CTA | `BagossStandardVF`, 16px, weight 500, 51px high, padding 12px 16px, radius 200px |

The observed browser reported the Inter Latin, Bagoss Condensed and Bagoss Standard font faces **loaded**. The font rules come from [live typography CSS](https://website-media.deel.com/_next/static/css/68721580174141e5.css) and [live Inter CSS](https://website-media.deel.com/_next/static/css/af7dfb2d62188beb.css). Exact official assets:

- [Bagoss Condensed](https://website-media.deel.com/_next/static/media/cd977f37204bcfbc-s.p.woff2)
- [Bagoss Standard variable](https://website-media.deel.com/_next/static/media/fad621f95e01987c-s.p.woff2)
- [Inter Latin variable](https://website-media.deel.com/_next/static/media/e4af272ccee01ff0-s.p.woff2)

Download inspection succeeded for these three files. Public availability does not establish permission to redistribute Bagoss font files. The visual guide references the official hosted fonts, with Arial/Helvetica fallbacks; the repository does not bundle commercial font binaries. A release owner should verify font terms before changing this to self-hosting. The press-kit royalty-free copy concerns logos, screenshots and photos, not fonts.

At 1440px, desktop content has 64px outer gutters and a 1312px usable width. The press hero starts around y=262px, with a 540px text column at x=64 and a broad illustrated right column starting at x=644. The promotional strip is 64px high and navigation is 80px high. The phone capture uses 24px outer gutters, a single stacked column and a visible menu control. Cards are spacious, quiet, and lightly rounded; primary actions are dark pills. The public hero illustration shows small white workflow cards, status labels and a cursor layered over a human photo within a chunky purple frame. This provides public UI evidence for compact actions/status labels, not proof of Deel's authenticated application design.

## Applying this to the lab

I carry forward the typography, generous spacing, warm neutral surfaces, purposeful blue/purple/yellow sections, dark pill actions and a small authentic logo. I design one working return flow, using broad editorial headings and visible supplier/action ownership instead of a dense generic dashboard grid. The hero's blue ground and workflow framing are adaptations of the measured palette, not a claim that the press hero has a blue background.

- Keep the unofficial/synthetic/no-integration statement prominent above the working flow; retain the exact independent credit in the app and documents.
- Use colour to distinguish action/attention/evidence, with readable text labels. A missing prerequisite must remain visibly blocked.
- Keep status, owner, next action and deadline together. A missed pickup is supplier-owned.
- Show synthetic evidence labels, simulated wipe attestation and synthetic notification outbox in plain language.
- Preserve useful 44px minimum interactive targets in the app, visible dialog close/submit controls and a single-column phone layout. These are lab accessibility decisions, not measured claims about the source site.
- Do not reuse official human photography as synthetic employee records, manufacture a connected badge, or copy official contact forms into this lab.

[Open the visual guide](brand-guide.html). It contains the logo, colour swatches, type specimens, component examples and viewport evidence references. Official role/blog language is source context; this independent concept does not assert current Deel failures, fabricated savings, employment experience or internal involvement.
