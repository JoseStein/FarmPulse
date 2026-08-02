# FarmPulse user guide

This guide explains how administrators and field operators use the current FarmPulse application. In this document, a **blade** means one item in the main navigation menu.

FarmPulse is a shared operational record for the farm. Saved tasks, activities, notes, issues, costs, crop-cycle changes, inventory movements, and maintenance records update the other relevant blades automatically. It is not necessary to enter information that is not yet known: the application deliberately shows values such as **Not assessed**, **Not recorded**, or **Unavailable** instead of inventing them.

## 1. Access, roles, and basic navigation

### Sign in

1. Open the FarmPulse web address.
2. Enter the email address and password assigned to your individual account.
3. Select **Sign in**.

Accounts should not be shared. Every saved record identifies the person who created or completed it. An inactive or removed user cannot sign in, but their historical work remains attributed to them.

### User roles

| Role | Intended user | Access |
| --- | --- | --- |
| **Administrator** | Farm owner, manager, or trusted administrator | All operational blades plus crop-cycle management, expenses, inventory, equipment, reports, farm settings, and user management |
| **Operator** | Person performing or observing field work | Dashboard, Farm Map, Prepare Land, Land Design, Tasks, Irrigation, Activities, Weather, Field Journal, Crop Guide, and My Account |

Permissions are enforced by the server. Opening an administrator-only address directly as an operator redirects back to the dashboard.

### Choose the working sector

The working sector is the part of the current production area where the team is performing work. FarmPulse displays it in the top header so it is visible from every screen.

1. Open **Farm Map** or select the working-sector name in the header.
2. Select a sector directly on the map.
3. Confirm that the details panel labels it **Working sector**.
4. The header updates to `Working sector: [sector name]`.

FarmPulse remembers this choice for the signed-in browser and prefills it in Activities, new Tasks, Field Journal notes/issues, and new Expenses. You can still deliberately choose **All sectors** or a different sector in a form when the record is broader than the current work area. Dashboard totals and alerts continue to cover the current production area so important information is not hidden.

The current farm has one active production area, so FarmPulse does not show the redundant `Field 1 · Corn` label. If multiple production areas are configured later, a separate production-area selector appears in the header.

The crop names shown on the original May 2024 land drawing—Corn and Melon—are examples only. They do not permanently assign a crop to a lot. An administrator chooses the planned crop in **Crop Cycle**, or the person logging planting chooses the crop in **Activities**.

### Desktop and mobile navigation

On a desktop or tablet, the primary operational blades appear in the left sidebar. On a phone, the bottom bar contains **Home**, **Map**, **Tasks**, **Log**, and **More**. To keep navigation compact, **Prepare Land** and **Land Design** are contextual actions inside Farm Map and the Dashboard, while **My Account** opens from the user profile/avatar.

The mobile **Log** button opens shortcuts for:

- Irrigated now
- Field note
- Fertilizer
- Pest inspection
- Upload photo
- Other activity

These shortcuts open the corresponding full form; they do not save anything until the form is completed and submitted.

### Notifications and logout

The bell in the header indicates unread notifications when a count is available. To end a session, use **Log out** in the desktop sidebar or the logout icon in the mobile header. Always log out on a shared device.

## 2. Dashboard blade

**Who can use it:** Administrators and operators.

The Dashboard is the daily overview for the current production area. It brings together current database records and the latest available weather snapshot.

It shows:

- Active crop, variety, field size, growth stage, planting status, crop age, and estimated days remaining.
- Tasks due today, together with overdue and upcoming counts.
- Recent field activities and the person who recorded each one.
- Latest saved weather conditions and rain probability.
- An irrigation recommendation when the crop has been planted and enough evidence exists.
- Operational summaries such as expenses, inventory, or equipment where the signed-in role permits them.

Use **Log activity** or a card under **Quick actions** to go directly to common workflows. Dashboard cards are summaries; edit or create the underlying record in its dedicated blade.

If the crop has not been planted, the dashboard correctly shows **Not planted yet**. Irrigation decision support remains disabled until an actual planting date exists.

## 3. Farm Map blade

**Who can use it:** Administrators and operators.

The Farm Map visualizes the configured sectors and controls the working-sector selection used across FarmPulse. Select a sector on the diagram to update the details panel and save it as the working sector.

For each sector, the map can show:

- Current status, such as Planning, Healthy, Irrigation due, Attention needed, Task overdue, or Critical.
- Number of planned drip lines.
- Last irrigation record.
- Next scheduled task.
- Open alerts and other conditions.
- Current decision-support recommendation.

Use **View sector details** to open the sector timeline. That page combines recent activities, scheduled work, open issues, irrigation history, and sector costs. Use **Log irrigation** or **Quick log** to open an activity form with that sector already selected.

The operational map is a simplified sector view. For the surveyed property boundary, roads, buildings, hydraulic sequence, and drawing discrepancies, use **Land Design**.

## 4. Prepare Land blade

**Who can use it:** Administrators and operators can review it. Only administrators can generate the preparation task plan.

Prepare Land is the pre-planting workspace. It evaluates what FarmPulse can establish from saved records, completed work, inventory, equipment, and weather.

The main sections are:

- **Automatic preparation checks:** each item is labeled Verified, Planned, Needs attention, or Not assessed and includes its evidence source.
- **Current crop plan:** crop, variety, area, and planned planting date currently on record.
- **Material calculations:** calculations appear only when the required inputs, such as a population target, are known.
- **Weather evidence:** forecast rain used as planning context.
- **Smart recommendations:** transparent, rule-based suggestions with priority, reason, and evidence.
- **Preparation task plan:** the suggested setup work and any tasks already generated from it.

Select **Create preparation tasks** to add the standard preparation plan to Tasks. The action is duplicate-safe: running it again does not create a second copy of existing setup tasks.

Important: the evidence-coverage percentage is not a planting-readiness score. It only reports how many conditions the system can support with saved evidence.

## 5. Land Design blade

**Who can use it:** Administrators and operators.

Land Design is the digital reference for the May 2024 adjusted irrigation drawing. It records the design as **planned and not field verified** unless operational evidence later confirms an item.

The blade contains:

- A simplified diagram of the ten-hectare property and four mapped one-hectare production lots.
- For each mapped lot: 100 planned beds of 100 meters and the planned irrigation-zone layout.
- The drawing’s example crop label, clearly marked **not assigned**.
- The crop and growth stage currently saved in FarmPulse, when the lot records have been imported.
- Planned hydraulic sequence from Río Chico through the pumping and filtering system to the lot valves.
- Infrastructure such as the warehouse, workshop, office, tank, pumps, filters, and planned access roads.
- The 15 property-boundary coordinates in UTM WGS84 Zone 17N.
- Conflicts or ambiguities from the source drawing that require field confirmation.
- A field-verification checklist.

Do not treat a planned dimension, flow, component, or crop example as installed or measured. FarmPulse keeps known drawing conflicts out of automatic operational calculations until they are verified. The design currently notes, among other checks, that the drawing declares eight hectares under production but maps four hectares, and that an emitter-count note conflicts with the computed count.

This blade is for reference and verification; it does not itself assign crops or record completed construction.

## 6. Tasks blade

**Who can use it:** Administrators and operators.

Tasks organizes scheduled work for the current production area. Views include **Today**, **Week**, **All tasks**, and **By sector**.

### Create a task

Only administrators can create tasks. Operators can review, start, complete, or skip assigned work. New tasks default to the working sector selected on Farm Map.

1. Select **New task**.
2. Enter a task name.
3. Choose its category and priority: Low, Medium, High, or Critical.
4. Optionally choose a sector and assignee. Leaving the sector empty applies the task to all sectors; leaving the assignee empty makes it unassigned.
5. Set the due date and time.
6. Add a description if useful.
7. Select **Create task**.

### Update a task

- Select the circular completion control or **Complete** to mark work complete.
- Open **Details** to review the task and add completion notes.
- Use **Skip** only when the work was intentionally not performed.
- Completed records display the completion time and the user who completed them.

Overdue status is calculated from the due time. Completing a task preserves it as history; it is not deleted.

## 7. Irrigation blade

**Who can use it:** Administrators and operators.

Irrigation combines the saved system design, irrigation history, rainfall, crop stage, and current weather into sector-level decision support.

It shows:

- Designed flow and target pressure, clearly distinguished from measured values.
- Priority recommendation and the evidence used to produce it.
- Last irrigation, event count, recorded water volume, pressure, recent rainfall, and status by sector.
- Links to each sector’s detailed history.

The recommendation is decision support, not agronomic certainty. Confirm conditions in the field before operating equipment.

### Log irrigation

Irrigation logging becomes available after planting.

1. Select **Log irrigation**.
2. Confirm the field and choose a sector. A sector is required for irrigation.
3. Confirm the date and start time.
4. Enter duration in minutes.
5. Enter measured flow when the planned design has not been field verified. A configured, verified sector flow may be prefilled.
6. Optionally enter measured pressure and notes about leaks, runoff, or pressure changes.
7. Review the estimated water volume and save.

Saving creates both the permanent activity and its irrigation event. The dashboard, map, irrigation history, and recommendations then use that record.

## 8. Activities blade

**Who can use it:** Administrators and operators.

Activities is the permanent crop-cycle work log. Every activity includes the selected field, an optional sector where appropriate, date, time, person recording it, and type-specific details.

Choose one of the main activity buttons or use **More activity types**. The form changes according to the selected activity:

| Activity | Information requested | Important effect |
| --- | --- | --- |
| **Irrigation** | Sector, duration, flow, pressure, notes | Creates an irrigation event and estimated water volume; requires a planted crop and a sector |
| **Planting** | Crop, optional new crop, variety, seed source or lot, quantity and unit, optional inventory use, worker, cost, times, notes | Makes the chosen crop active for that lot, sets the cycle to Planting, and records the actual planting date |
| **Fertilizer application** | Fertilizer or amendment, amount and unit, inventory use, worker, cost, times, notes | Can reduce linked inventory stock |
| **Pesticide application** | Product or active ingredient, amount and unit, inventory use, worker, cost, times, treatment notes | Can reduce linked inventory stock; always follow the label and local rules |
| **Herbicide application** | Product or active ingredient, amount and unit, inventory use, worker, cost, times, treated-area notes | Can reduce linked inventory stock; always follow the label and local rules |
| **Pest inspection** | Pest observed, optional affected count or area, findings | Adds an inspection record without assuming treatment occurred |
| **Disease inspection** | Disease or symptoms, optional affected count or area, findings | Adds an inspection record without assuming a diagnosis is certain |
| **Field observation** | Observation topic and details | Records crop, soil, drainage, wildlife, or general field conditions |
| **Equipment maintenance** | Asset, optional labor or downtime, parts inventory, worker, cost, times, work performed | Records an activity; use Equipment for the asset’s formal maintenance schedule |
| **Rainfall observation** | Measured rainfall in millimeters or inches, gauge and storm notes | Records a field measurement separate from provider weather |
| **Weed control** | Method or product, optional treated area, inventory use, worker, cost, times, notes | Records manual, mechanical, mulch, or product-based control |
| **Soil work** | Operation, optional area or hours, worker, cost, times, soil details | Records tillage, bed forming, leveling, amendment, or similar preparation work |
| **Harvest** | Required harvested quantity and unit, optional grade or batch, worker, cost, times, notes | Adds harvest work history; final crop-cycle yield is managed in Crop Cycle |
| **Other** | Activity name, optional quantity and unit, worker, cost, times, details | Use only when no specific activity type applies |

### Inventory and cost behavior

For forms that support inventory, selecting an item and entering the quantity used reduces stock. The unit shown should match the inventory item’s unit. FarmPulse prevents stock from going below zero unless an administrator deliberately authorizes negative stock.

An activity cost is stored with that activity; the dedicated Expenses blade remains the authoritative place for detailed vendor and financial records. Avoid recording the same purchase twice unless one record intentionally describes field usage and the other describes the actual invoice.

### Planting and crop flexibility

When logging planting, choose any existing crop or select **Add another crop** and enter a new crop name. Saving planting changes the active crop for the current production area, records its variety when supplied, assigns the Planting stage, and sets the actual planting date.

## 9. Crop Cycle blade

**Who can use it:** Administrators only.

Crop Cycle is the formal production plan and outcome record for the current production area. It shows the current stage, crop age, planting and harvest dates, population target, expected yield, actual yield, and the ordered growth stages.

Select **Update crop cycle** to change:

- Planned crop, including adding a new crop.
- Variety.
- Growth stage for the current crop.
- Actual planting date.
- Expected harvest date.
- Population target.
- Expected yield in kilograms.
- Actual harvest date and yield.
- Cycle status: Active or Completed.

Choosing a different planned crop starts it at the Planning stage. It does not mean that crop has been planted. Record the actual planting through the Planting activity when field work occurs, or set the actual planting date deliberately in this blade.

## 10. Weather blade

**Who can use it:** Administrators and operators.

Weather displays live Open-Meteo conditions for the farm coordinates saved in Settings, currently intended for El Cortezo, Coclé, Panama. It includes temperature, apparent temperature, humidity, wind, current precipitation, a seven-day forecast, and operational notices.

The source badge explains the data state:

- **Live:** recently retrieved from the weather provider.
- **Saved fallback:** the provider could not be reached, so FarmPulse is showing the latest saved snapshot.
- **Stale:** the saved observation is older than the normal freshness window.

Use **Refresh live** to request current conditions. The screen also checks automatically every ten minutes while open. If weather is unavailable, field logging continues to work. Provider weather is not a substitute for a local gauge or direct field observation.

## 11. Expenses blade

**Who can use it:** Administrators only.

Expenses & Budget tracks actual costs for the current production area and compares them with its active crop-cycle budget. Summary cards show actual cost, planned budget, remaining budget, percentage used, and cost per hectare and acre. New expenses default to the working sector.

### Set or edit the budget

1. Confirm the current production area and working sector in the header.
2. Select the pencil button on the **Planned budget** card.
3. Enter a recognizable budget name and the planned amount in the farm currency.
4. Select **Save budget**.

FarmPulse immediately recalculates actual cost, remaining budget, percentage used, and the Dashboard budget snapshot. Each active crop cycle has its own budget, so changing production areas does not mix their planned or actual amounts. The budget window shows the current working sector separately: new expenses default to it, while the crop-cycle budget covers all sectors.

Use category, sector, from-date, and to-date filters to narrow the record list. The headline budget calculations continue to represent the complete active crop cycle so filtering the table does not make the overall budget appear to change. Select **CSV** to download the currently filtered expense data.

### Record or edit an expense

1. Select **Expense** or the edit icon on an existing row.
2. Enter date, category, description, and amount.
3. Optionally enter vendor, sector, quantity, unit cost, and notes.
4. Select **Save expense**.

The cost-by-category chart uses active expense records. Removing an expense takes it out of active financial totals but retains its audit history.

## 12. Inventory blade

**Who can use it:** Administrators only.

Inventory lists farm supplies, quantity on hand, unit, minimum threshold, value, supplier, storage location, and recent adjustments. Items at or below their minimum threshold are marked **Low stock**.

### Add or edit an item

Select **Add item** or the edit icon and enter the item name, category, unit, quantity on hand, minimum threshold, optional unit cost, supplier, storage location, and notes. Save the item.

### Adjust stock

1. Select **Adjust** on an item.
2. Enter a positive number to add stock or a negative number to remove stock.
3. Enter a reason.
4. Select **Save adjustment**.

Activity forms can also consume linked inventory automatically. Use direct adjustments for purchases received, counts, spoilage, corrections, or movements that are not already captured by an activity.

## 13. Equipment blade

**Who can use it:** Administrators only from navigation and route access.

Equipment tracks owned or installed assets, runtime, operating status, manufacturer and model, maintenance dates, notes, and service history.

### Add or edit equipment

Use **Add equipment** or **Edit** to maintain the asset identity, status, runtime, service dates, and notes. Planned purchases should remain tasks until an asset is actually purchased or installed.

### Record maintenance

1. Select **Maintenance** on the asset.
2. Enter the performed date and work completed.
3. Optionally update runtime hours, cost, next-maintenance date, and notes.
4. Select **Save maintenance**.

Saving updates the equipment history and also creates the related maintenance activity. The blade highlights an asset when its next-maintenance date has passed.

## 14. Field Journal blade

**Who can use it:** Administrators and operators.

The Field Journal stores narrative observations, photographs, and trackable issues. New records default to the working sector.

### Add a field note

1. Select **Add note**.
2. Choose a sector or leave **All sectors**.
3. Choose a category.
4. Describe the observation.
5. Optionally attach up to five JPEG, PNG, WebP, HEIC, or HEIF photos, no larger than 8 MB each.
6. Select **Save note**.

### Report and manage an issue

1. Select **Report issue**.
2. Choose sector and category, then enter a short title and detailed observation.
3. Choose severity: Low, Medium, High, or Critical.
4. Optionally assign a user.
5. Leave **Create a follow-up task for tomorrow** selected when action is required.
6. Attach photos if useful and save.

Open issues appear in the journal, sector view, map status, and other operational summaries. Use **Start** to mark work in progress and **Resolve** to close the operational problem with optional resolution notes. Notes and photographs form part of the permanent crop-cycle history.

Production photo uploads require the configured private object-storage service. If a photo upload fails after the note is saved, the application reports that distinction so the note is not mistaken as lost.

## 15. Crop Guide blade

**Who can use it:** Administrators and operators.

Crop Guide presents curated educational articles ranked for the current crop, growth stage, open issues, tasks, irrigation history, and saved weather context.

Use the search box or category list to filter articles. Select **Read guidance** to open the complete article, region applicability, source, and review date.

Recommendations are educational decision support. Validate regional applicability and confirm pesticide labels, regulations, and important treatment decisions with a qualified agricultural professional in Panama. Reading or dismissing an article does not currently create a permanent completion record.

## 16. Reports blade

**Who can use it:** Administrators only.

Reports provides farm-scoped CSV exports for:

- Crop-cycle summary
- Activity history
- Irrigation history
- Expense detail
- Cost by category
- Cost by sector
- Inventory status
- Task completion
- Equipment maintenance
- Harvest and profitability

Select the download icon beside a report. CSV files can be opened in Excel, Google Sheets, or another spreadsheet application. Exports contain live records available to the authenticated farm membership. PDF reporting is not yet implemented, and profitability remains incomplete until harvest and sale data are available.

## 17. Settings blade

**Who can use it:** Administrators only.

### Farm profile

The farm profile controls the farm name, weather-location label, country, timezone, currency, display units, latitude, and longitude. These changes apply to every member.

- Choose Metric for hectares, liters, Celsius, millimeters, and metric operational units.
- Choose US customary for acres, gallons, Fahrenheit, inches, and converted display values.
- Weather conditions come from the saved latitude and longitude, so update them only with verified coordinates.
- Use a valid timezone name so task, activity, and weather times display correctly.

Select **Save settings** after making changes.

### Users and access

To create an individual user:

1. Enter full name and email address.
2. Choose Operator or Administrator.
3. Create a temporary password of at least 12 characters.
4. Select **Create user**.
5. Share the temporary password privately and ask the user to change it in My Account.

Administrators can change another user’s role, deactivate or reactivate an account, and remove an inactive user. A user must be deactivated before removal. Historical work remains preserved after removal. The signed-in administrator cannot change or remove their own access from this panel, which helps prevent accidental lockout.

## 18. My Account blade

**Who can use it:** Every signed-in user.

My Account displays the user’s name, email, and role and allows that user to change their own password.

1. Enter the current password.
2. Enter a new password of at least 12 characters.
3. Enter the new password again.
4. Optionally use **Show passwords** to check the entries in a private setting.
5. Select **Update password**.

After a successful change, FarmPulse signs the user out. Sign in again with the new password. Administrators cannot see a user’s password in FarmPulse.

## 19. Recommended operating workflow

### Before planting

1. An administrator confirms the farm coordinates, timezone, currency, and units in Settings.
2. Review Land Design and keep unverified drawing information marked as planned.
3. Review Prepare Land and create the preparation task plan.
4. Complete tasks only as real work occurs; record notes or issues for field evidence.
5. In Crop Cycle, select the planned crop for each lot without entering an actual planting date prematurely.

### On planting day

1. Confirm the working sector in the header and change it on Farm Map if needed.
2. Open Activities and choose Planting.
3. Select or create the actual crop, enter variety and planting-material details, and save.
4. Confirm the Dashboard and Crop Cycle now show the correct crop, Planting stage, and actual planting date.

### During production

1. Start with Dashboard and Tasks.
2. Use Activities for structured field work and Field Journal for observations, evidence photos, and issues.
3. Record measured irrigation rather than treating design values as confirmed.
4. Keep inventory and expenses current when materials are received or purchased.
5. Resolve issues and complete tasks so the map and recommendations reflect current records.
6. Use Weather and Crop Guide as decision support, then verify important actions in the field.

### At harvest and cycle close

1. Record each harvest operation in Activities.
2. Enter final harvest date and actual yield in Crop Cycle.
3. Reconcile costs and inventory.
4. Export reports for the permanent external archive.
5. Set the cycle to Completed only when the production cycle is actually finished.

## 20. Data and safety reminders

- Always confirm the working sector in the header before saving sector-specific work.
- Do not enter estimates as measurements without saying so in the notes.
- A design value is not proof that infrastructure is installed or working.
- Do not enter an actual planting date before planting occurs; it enables crop-age and irrigation logic.
- Use the specific activity type whenever one exists so the correct fields and downstream calculations are used.
- Avoid duplicate cost records when an activity and an expense refer to the same transaction.
- Treat weather, irrigation recommendations, and crop guidance as decision support.
- Use individual accounts so the audit trail remains meaningful.
- Photos are private application records, but avoid including unrelated personal or sensitive information.
- If saving produces an error, keep the screen open, verify required fields and connectivity, and retry once. Check the relevant timeline before retrying repeatedly to avoid an accidental duplicate.

## 21. Current limitations

- The application requires an internet connection; offline synchronization is not yet available.
- The operational map is a simplified sector diagram, not a survey or GPS navigation tool.
- Planned land-design data remains unverified until supported by field evidence.
- Weather depends on a third-party provider and may temporarily fall back to a saved snapshot.
- Guide read or dismiss state is not persisted.
- Reports are CSV only; PDF is planned for a future phase.
- Revenue is not yet modeled, so complete profitability is not available.
- Notifications are visible but are not yet fully configurable.
