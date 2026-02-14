# Changelog

All notable changes to this project will be documented in this file.

## 0.0.0 (Unreleased)

### Core (`@datapackages/dataset`)
- Base `Dataset<T>` class with middleware composition
- CLI for updating data sources from remote URLs
- Type inference and code generation from source data

### Plugins
- `@datapackages/plugin-cache` — Memory, LocalStorage, and IndexedDB cache drivers
- `@datapackages/plugin-live-update` — Polling-based data refresh with pause/resume
- `@datapackages/plugin-search` — Full-text search powered by Orama
- `@datapackages/plugin-stream` — NDJSON streaming data loader

### Datasets
- `@datapackages/countries` — 250+ countries with codes, currencies, TLDs, phone codes
- `@datapackages/medical-terminologies` — FHIR-based multi-country terminologies
