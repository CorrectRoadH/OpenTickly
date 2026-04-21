# Landing

This document defines the target content and information structure of the `OpenToggl` introduction site.

## Goal

The landing page is not part of the in-product workspace, but a public introduction entry point facing first-time visitors, used to answer the following questions:

- What is `OpenToggl`
- Why does it exist
- What is its relationship to `Toggl`
- Why is it worth switching to compared to the official hosted solution
- Where are the code repository and self-hosting entry points
- Where is the online demo

## Page Positioning

The landing page must clearly express the following product positioning:

- `OpenToggl` is not "another time-tracking product inspired by Toggl", but an open-source project implemented according to Toggl's current public product surface.
- `OpenToggl`'s goal is not to list a set of feature checkpoints, but to directly commit to remaining consistent with Toggl's product surface.
- `OpenToggl` supports both cloud SaaS and self-hosting, and both share the same public contract and feature surface.
- `OpenToggl` additionally provides the capability to import Toggl exported data, making it easy to migrate existing data in.
- The landing page needs to clearly state its differentiation rationale: free, private-first, AI-friendly, self-hostable.

## Page Content

The landing page must contain at least the following content sections:

### 1. Hero

The hero must directly state in the first screen:

- `OpenToggl` is a free, private-first, AI-friendly Toggl alternative
- Its goal is to preserve the Toggl workflow while removing price, vendor lock-in, and rate limit constraints
- It supports self-hosting and a public online demo

The hero must provide at least two CTAs:

- Pointing to the demo: `https://track.opentoggl.com`
- Pointing to the GitHub repository: `https://github.com/CorrectRoadH/opentoggl`
- Pointing to the product application entry point or documentation entry point

### 2. What Is OpenToggl

This section must use concise language to explain:

- OpenToggl is directly implemented according to the Toggl public API and product surface
- The goal is not "partial compatibility" but faithfully covering the public definitions
- Apart from import and instance administration, no additional business surface deviating from Toggl is invented

### 3. Capability Surface

This section does not need to write an API version list.

What must be emphasized is:

- The goal is to remain consistent with Toggl's product surface, not to enumerate local capability points
- Users migrating over should not need to re-learn another workflow
- The copy should express "compatibility goal" as product positioning, not a feature checklist

### 4. Why Self-Host

Must explain the value of self-hosting to the user, including but not limited to:

- You can control the deployment, data, and upgrade cadence
- SaaS and self-hosted share the same feature surface
- The repository already provides self-hosting-related documentation and runtime paths

### 5. Why OpenToggl

Must clearly state the reasons for switching, including but not limited to:

- The official Toggl is too expensive for many individuals and teams
- private-first users want time data to remain on infrastructure under their own control
- AI agents and automation require higher HTTP read/write throughput
- Low hourly rate limits are not suitable for use as an agent backend
- Built-in PWA support; on mobile, you can directly add it to the home screen and use it like a native App, without an app store

### 6. Open Source Proof

Must display:

- GitHub repository link
- Repository organization or owner information
- Clear entry points for accessing code, documentation, or deployment instructions

## Copy Constraints

- The tone must be direct, clear, and technically credible; avoid generic marketing language.
- `OpenToggl` is not allowed to be described as a vague promise of "perfect compatibility with all Toggl behavior".
- It is not allowed to imply unimplemented business capabilities that the repository does not prove.
- Do not write the homepage as a feature enumeration page or an API version announcement page.
- The copy should preferentially revolve around `free`, `private-first`, `AI-friendly`, `self-hosting`, `import`, `Toggl alternative`, `mobile PWA`.

## Implementation Constraints

- The introduction site should exist as an independent frontend app under `apps/*`.
- The site implementation should plug into the repository root workspace and root toolchain, not be a disconnected standalone scaffold project.
- If the site provides documentation-style navigation or content pages, its default content must remain consistent with this document and `docs/core/product-definition.md`.
