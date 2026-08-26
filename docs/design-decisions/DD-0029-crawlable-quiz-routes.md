---
id: DD-0029
title: Crawlable quiz routes preserve overlay navigation
status: accepted
date: 2026-08-26
applies_to: app shell, routing, quiz navigation, search discovery, static hosting
supersedes: DD-0019
superseded_by: none
---

# DD-0029: Crawlable quiz routes preserve overlay navigation

## Context

Geoquiz should be discoverable as a collection of distinct geography exercises,
not only as one JavaScript URL whose hash changes. Search crawlers generally do
not treat fragments as separate pages, while GitHub Pages has no application
server that can rewrite arbitrary paths. The existing overlay chooser and
immediate Capital dots landing must remain intact.

## Decision

Capital dots remains the root `/geoquiz/` experience. Each other quiz receives a
descriptive, trailing-slash path below `/geoquiz/` that is emitted as a static
HTML entry by the production build. Quiz choices are native links to those paths;
ordinary same-tab choices use the History API so the overlay interaction remains
fast, while standard link actions such as opening a new tab continue to work.

Every canonical quiz entry includes a unique, descriptive title, meta
description, and absolute canonical URL in its initial HTML response. The
canonical URLs are listed in a static sitemap. Search metadata describes the
exercise without disclosing active answers or adding remotely loaded resources.

Existing hash URLs remain compatible. On load they are replaced by their
canonical path without adding history; `#/quizzes` canonicalizes to the root and
opens the overlay once. The root, overlay accessibility, active-quiz preservation,
lazy quiz boundaries, recoverable Not Found state, and Back/Forward semantics
from DD-0019 are retained.

## Acceptance criteria

- `/geoquiz/` serves Capital dots, and each of Country capitals, Shape capitals,
  Shape neighbours, Shape highest points, Flag countries, and Country borders
  has one distinct static canonical path that responds independently of a
  server rewrite.
- The initial HTML for every quiz has a page-specific title, description, and
  canonical link; the sitemap contains exactly those seven absolute canonical URLs.
- The quiz dialog uses crawlable links, marks the current route, retains native
  modified-link behavior, and otherwise preserves the DD-0019 dialog interaction.
- Same-tab choices and Browser Back/Forward synchronize the quiz, URL, title,
  description, canonical link, dialog state, focus, and lazy loading.
- Legacy hash routes replace themselves with their canonical paths. The former
  chooser hash opens the dialog once over Capital dots, and unknown routes remain
  recoverable without being presented as canonical search pages.
- Production assets and routes remain base-path-safe, static, local, and free of
  new runtime services or dependencies under DD-0013.

## Consequences

The build maintains a small HTML entry for each concrete quiz because GitHub
Pages cannot supply SPA rewrite semantics. Hash links remain supported bookmarks
but are no longer canonical. Search engines receive stronger discovery signals,
but indexing and ranking are still controlled by the search engine. Visitor
analytics remains a separate product and privacy decision.

## Verification

Pure route tests cover canonical paths, legacy hashes, and output URLs.
Application tests cover link semantics, History API navigation, Back/Forward,
metadata synchronization, chooser compatibility, focus, and Not Found recovery.
Production-build inspection verifies every HTML entry, sitemap URL, verification
file, base-path-safe asset, and custom 404. DD-0003 still requires rendered Chrome
review at approximately 1440×900 and 390×844 before publication.
