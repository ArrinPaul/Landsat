# Gemini Execution Plan: AI-Powered Change Interpretation

## 1. Objective

To implement the AI-driven change interpretation and action guide as defined in `ROADMAP.md`. This will elevate the Earth Insights Dashboard from a data visualization tool to an intelligent monitoring system that provides meaningful, contextualized, and actionable insights on environmental changes.

## 2. Key Features

The implementation will focus on delivering the following key features:

- **Automated Change Detection**: The system will automatically compare newly computed environmental metrics against historical and seasonal baselines to detect significant changes.
- **AI-Powered Change Classification**: A new AI flow will classify detected changes into one of the four categories defined in `ROADMAP.md`: Normal, Transitional, Concerning, or Critical.
- **Contextual Insight Generation**: For each significant change, the AI will generate a human-readable explanation, providing context and potential causes based on the rules and compound logic from `ROADMAP.md`.
- **Actionable Recommendations**: The system will suggest a course of action (e.g., Monitor, Flag, Summarize) corresponding to the classification of the change.

## 3. Proposed Architecture

The new functionality will be integrated into the existing application architecture with the following components:

- **New AI Flow (`analyze-change.ts`):** A new Genkit flow will be created at `src/ai/flows/analyze-change.ts`. This flow will be the core of the new feature.
- **Input to the Flow:** The flow will take a set of computed metrics for a specific location and date range as input, along with historical data for the same location.
- **AI-Powered Reasoning:** The flow will use a powerful AI model (available through the existing multi-provider setup) to perform the reasoning steps outlined in `ROADMAP.md`:
    1.  **Measure**: Calculate change.
    2.  **Contextualize**: Compare with historical/seasonal data.
    3.  **Validate**: Check for ground truth agreement.
    4.  **Correlate**: Look for compound patterns.
    5.  **Classify**: Assign a change category.
    6.  **Explain**: Generate a narrative.
    7.  **Act**: Recommend an action.
- **Output of the Flow:** The flow will return a structured JSON object containing:
    -   `changeClassification`: (e.g., "Concerning")
    -   `confidenceScore`: (e.g., 0.85)
    -   `explanation`: (e.g., "A sustained decline in NDVI outside of the normal seasonal cycle, coupled with an increase in NDBI, suggests potential land-use conversion from vegetation to built-up areas.")
    -   `recommendedAction`: (e.g., "Flag for review and monitor trend over the next quarter.")
- **Dashboard Integration:**
    -   The main dashboard component (`src/components/dashboard.tsx`) will be updated to call the new `analyze-change` flow after metrics are computed.
    -   A new UI component will be created to display the AI-generated insights in a clear and intuitive manner.

## 4. Phased Implementation

The project will be implemented in the following phases to ensure a structured and iterative development process:

- **Phase 1: Foundational Backend Logic**: Focus on creating the core AI flow and the logic for change analysis.
- **Phase 2: Backend Integration**: Integrate the new flow into the existing backend, ensuring it runs as part of the metrics computation process.
- **Phase 3: Frontend - Displaying Insights**: Develop the UI components to present the AI-generated insights to the user on the dashboard.
- **Phase 4: Refinement and User Feedback**: Continuously improve the AI prompts, the UI, and the overall user experience based on testing and feedback.

This phased approach will allow for early testing and validation of the core logic before building out the full user-facing feature.
