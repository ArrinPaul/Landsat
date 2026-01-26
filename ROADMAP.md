# Project Roadmap: Earth Insights Dashboard (NASA Landsat)

This document outlines the current state of the project, identified issues, drawbacks, and a strategic roadmap for future development.

## 📊 Current Analysis

The project is a full-stack AI application built with **Next.js 15**, **Genkit**, and **Google Earth Engine**. It provides environmental insights by analyzing satellite imagery and weather data.

### Key Technologies:
- **Frontend:** Next.js 15, React 19, Tailwind CSS, Lucide Icons, Recharts, Radix UI.
- **Backend:** Next.js Server Actions, Firebase Admin (Firestore for Jobs/History).
- **AI/ML:** Genkit (with Google Gemini), Groq, Mistral, HuggingFace (fallbacks).
- **Data Sources:** Google Earth Engine (Satellite), Open-Meteo (Weather/Soil).

---

## 🚩 Identified Issues & Drawbacks

### 1. Code Quality & Maintenance
- **Testing Coverage:** While utility functions are tested, server actions and complex React hooks lack automated integration tests.
- **Documentation:** More deep-dive technical documentation is needed for the specialized ML models.

---

## 🗺️ Roadmap

### Phase 1: Foundation & Security (High Priority)
- [x] **Persistent Job Store:** Replace in-memory `jobResults` with Firestore or Redis to ensure reliability across restarts and instances.
- [x] **Authentication Integration:** Implemented Firebase Authentication with Google Sign-In and personalized data partitioning.
- [x] **Secure API Calls:** Fix SSL verification in `services/open-meteo.ts` and use proper environment-specific configurations.
- [x] **Next.js/React Alignment:** Upgrade to React 19 to fully leverage Next.js 15 features and ensure stability.

### Phase 2: Refactoring & Optimization
- [x] **Dashboard Decomposition:** Break down `components/dashboard.tsx` into smaller, specialized hooks and sub-components.
- [x] **Earth Engine Optimization:** Optimize initialization and caching of Earth Engine objects to reduce latency in background flows.
- [x] **I18n Enhancement:** Standardized placeholder syntax and improved `useLanguage` hook to support nested keys.
- [x] **Centralized Prompt Management:** Use a template-based system for AI prompts to ensure consistency across Gemini and fallback providers.
- [x] **Config Consolidation:** Merge the two `next.config.ts` files and enable build-time error checking.

### Phase 3: Features & User Experience
- [x] **Historical Data Persistence:** Store user's previous analyses in a database for easy retrieval.
- [x] **Enhanced Visualizations:** Improved Recharts implementation with multi-axis support, interactive brush zooming, and mobile-responsive layouts.
- [x] **Advanced Filtering:** Added support for Sentinel-2, Landsat-8, and Landsat-9 with configurable cloud cover thresholds.
- [x] **Export Capabilities:** Metrics can be exported as CSV or summarized as an AI-generated report.

### Phase 4: Reliability & Monitoring
- [x] **Unit & Integration Tests:** Set up Vitest framework and implemented unit tests for meteorological utilities, scientific calculations, and complex React hooks (`useDashboardMetrics`).
- [x] **Error Tracking:** Implemented a centralized, structured logging service for better production monitoring and error tracing.
- [x] **Rate Limiting Persistence:** Moved rate-limiting logic to Firestore to prevent abuse across multiple instances.
- [x] **Infrastructure Resilience:** Added server-side and client-side fail-safes to prevent app crashes when Firestore or AI APIs are disabled/quota-exceeded.

### Phase 5: Advanced Machine Learning & Science
- [x] **Migrate to Specialized ML:** Replaced LLM-based "heuristic" predictions in `predict-crop-yield.ts` with a hybrid approach using specialized mathematical regression models.
- [x] **GEE ML Classifiers:** Implemented deep-learning-based land cover classification using the **Google Dynamic World V1** dataset (10m resolution).
- [x] **Satellite Object Detection:** Implemented AI-driven infrastructure change detection using Gemini 2.0 Flash multi-modal analysis.
- [x] **Uncertainty Quantification:** Added scientific confidence intervals (95% CI) to all computed spectral indices and visualized them with shaded error margins in charts.

---

## 📈 Future Considerations
- Integration with more satellite data sources (Sentinel-1, etc.).
- Real-time alerts via Web Push notifications for significant environmental changes.
- Mobile application version using Capacitor or React Native.
