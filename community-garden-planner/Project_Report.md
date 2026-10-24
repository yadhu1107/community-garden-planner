# Project Report: Community Garden Planner

## 1. Introduction
Community Garden Planner is a web application designed to help shared gardens coordinate planting activity. It provides a central list of plots, who is tending each plot, which crop is growing, the current growing stage, and the expected harvest amount.

## 2. Problem Statement
Community gardens may coordinate plot assignments and crop information through informal messages or separate spreadsheets. This can make it harder to find plot details, follow growing progress, and estimate upcoming harvests. The application provides one searchable place for these records.

## 3. Objectives
- Store garden plot and crop details in a database.
- Provide a clear overview of active plots and expected harvest.
- Allow users to add, search, update, and remove plot records.
- Provide a responsive interface suitable for desktop and mobile.
- Separate the React frontend from the Express API and MongoDB data layer.

## 4. Scope
The project focuses on plot records and basic growing-status coordination. Authentication, multi-user permissions, notifications, weather integrations, and automated crop recommendations are outside the current version and could be future enhancements.

## 5. Technology Stack
- Frontend: React and Vite
- Backend: Node.js and Express
- Database: MongoDB with Mongoose
- Development: npm and Nodemon

## 6. Main Modules
1. **Dashboard:** summary metrics for total plots, growing plots, and expected harvest.
2. **Plot register:** searchable list of garden plots and crop details.
3. **Plot entry form:** captures plot name, gardener, crop, planting date, status, and expected harvest.
4. **Status management:** updates growing status for an existing plot.
5. **API and persistence:** Express routes validate requests and use Mongoose to store records.

## 7. Data Model
Each plot record includes:
- `plotName` — required plot identifier
- `gardener` — responsible gardener
- `crop` — crop planted
- `plantedOn` — planting date
- `status` — Planned, Growing, Ready to Harvest, or Harvested
- `expectedHarvestKg` — non-negative estimate in kilograms
- `createdAt` and `updatedAt` — timestamps

## 8. Design
The interface uses a sage-green and warm-cream palette with a garden-inspired editorial layout, soft card surfaces, botanical accent shapes, status chips, and responsive form/table behavior.

## 9. Testing Checklist
Run these checks in a local environment before submission:
- [ ] Server starts with a valid MongoDB URI.
- [ ] Health endpoint returns an OK response.
- [ ] Create a garden plot with valid values.
- [ ] New plot appears in the list and dashboard totals update.
- [ ] Search works for plot name, gardener, and crop.
- [ ] Status can be changed from the table.
- [ ] Delete removes a plot after confirmation.
- [ ] Invalid or missing fields produce a readable error.
- [ ] Layout remains usable on a narrow/mobile screen.
- [ ] `.env` and `node_modules` are not committed to Git.

## 10. Limitations and Future Enhancements
Potential extensions include gardener accounts and permissions, seed inventory, recurring garden tasks, harvest history, email reminders, weather data, and CSV export.

## 11. Conclusion
Community Garden Planner demonstrates a practical full-stack CRUD workflow in a community-oriented use case. It combines a responsive React interface with a REST API and MongoDB persistence.
