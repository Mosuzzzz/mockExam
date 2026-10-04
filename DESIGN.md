---
name: MockTest
description: A clear exam desk for focused practice.
colors:
  primary: "#24594e"
  primary-hover: "#1b493f"
  paper: "#f5f5f0"
  surface: "#fffefa"
  ink: "#19383f"
  muted: "#566d6e"
  rule: "#d9dfd8"
  focus: "#b3772e"
typography:
  display:
    fontFamily: "DM Sans Variable, DM Sans, sans-serif"
    fontSize: "clamp(39px, 4.2vw, 55px)"
    fontWeight: 560
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "DM Sans Variable, DM Sans, sans-serif"
    fontSize: "30px"
    fontWeight: 560
    letterSpacing: "-0.025em"
  body:
    fontFamily: "DM Sans Variable, DM Sans, sans-serif"
    fontSize: "14px"
    lineHeight: 1.55
  code:
    fontFamily: "SFMono-Regular, Consolas, Liberation Mono, monospace"
    fontSize: "12px"
    lineHeight: 1.65
rounded:
  surface: "13px"
  small: "9px"
  button: "10px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    padding: "0 16px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "0 16px"
    height: "42px"
---

# Design System: MockTest

## Overview

**Creative North Star: "Clear exam desk"**

The user-selected workspace direction is quiet and focused. Paper-like work areas, readable ink hierarchy, restrained green actions, and fine rules give questions room to lead. The existing logo remains the identity asset.

**Key Characteristics:**

- Paper-like backgrounds and flat surfaces.
- Clear question text and compact supporting metadata.
- Green primary actions and visible keyboard focus.

## Colors

Primary green identifies actions and selected states. Paper and surface neutrals separate the page from its working areas; teal ink carries headings and body text. Muted teal supports metadata, and pale rules divide content.

Error and warning treatments retain the existing red and amber variables in the stylesheet. Their exact values remain in the source.

## Typography

DM Sans Variable is loaded by the application and used throughout. Display text is reserved for the homepage; workspace headings are smaller. Code and JSON editors use the existing system monospace stack.

Headings use slightly tight tracking. Supporting text stays compact, with comfortable line spacing. Question text has priority over metadata.

## Layout

The workspace uses a fixed sidebar and a centered content area. At the existing mobile breakpoint, the sidebar gives way to bottom navigation. The homepage uses a centered container with a two-column introduction and question preview; those columns stack below 820 px.

The stylesheet's breakpoints are 1050 px, 820 px, and 600 px. The product supports viewports from 360 px upward. Keep task content and controls readable through responsive reflow.

## Elevation & Depth

Depth comes from surface color and fine borders. The current components use no decorative shadows.

## Shapes

Working surfaces use gently rounded corners. Controls use smaller rounding and thin borders. List rows remain open and separated by rules rather than enclosed individually.

## Components

Primary buttons use green with light text; secondary buttons use a light surface and a border. Hover darkens or adjusts the surface and raises buttons by one pixel. Keyboard focus uses the existing amber outline.

JSON input uses a bordered editor with a monospace textarea. Navigation uses muted text at rest and a green wash for the active route. Small tags describe context, while question choices retain letter labels and clear text.

The homepage question preview is an explicitly labeled example. Its composition belongs to the homepage surface brief, rather than defining every future screen.

## Do's and Don'ts

- Do reuse the existing CSS variables and DM Sans typography.
- Do keep questions and primary actions easy to find.
- Do use the existing logo asset.
- Do keep keyboard focus visible.
- Don't add classroom clip art or fake exam stationery.
- Don't fabricate testimonials or student outcomes.
