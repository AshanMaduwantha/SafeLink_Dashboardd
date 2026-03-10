# Traffic violation: mobile upload → dashboard

## Flow

1. **Mobile app** (AccidentIQ): User taps "Report traffic violation" → uploads photo/video (and location, vehicle type, category).
2. **Dashboard API** `POST /api/traffic-violation/report`: Receives the file, saves it under the models `data/` folder, runs `python detect_violations.py <file>` (traffic + plate models). If **MongoDB** is configured, the photo is also stored in GridFS and violation records (with `imageId`) are saved to the `traffic_violations` collection. Otherwise results are merged into `public/violations.json`.
3. **Dashboard** at `/dashboard/traffic-violation`: Fetches from `GET /api/traffic-violation/violations` (MongoDB if configured, else `violations.json`). Images are shown from MongoDB via `GET /api/traffic-violation/image/[id]` or from `public/violation-images/`. Refresh the page after a report to see new rows.

## Dashboard setup

1. Copy `.env.example` to `.env` and set:
   - **MODELS_DIR** = absolute path to the **models** folder (the one that contains `detect_violations.py`, `best_traffic.pt`, `best_plate.pt`).
     - Example (Windows): `MODELS_DIR=C:\Users\YourName\Desktop\models`
     - Example (Mac/Linux): `MODELS_DIR=/Users/yourname/Desktop/models`
   - Optional: **PYTHON_PATH** if `python` is not on PATH (e.g. `PYTHON_PATH=C:\Python313\python.exe`).
   - **MongoDB (optional):** Set **MONGODB_URI** (e.g. `mongodb://localhost:27017` or Atlas connection string) to store uploaded photos in GridFS and violation records in MongoDB. The dashboard will then load violations and serve images from MongoDB. If not set, the dashboard uses `public/violations.json` and `public/violation-images/`.

2. The dashboard must run on a machine that has:
   - Python with the models’ dependencies (`ultralytics`, `opencv-python`, etc.).
   - The **models** folder at the path you set in `MODELS_DIR`.

3. Start the dashboard: `npm run dev` (or `yarn dev`). The report API will be at `http://localhost:3000/api/traffic-violation/report`.

## Mobile app setup

1. In the **AccidentIQ** project, set the dashboard URL so the app can reach the API:
   - Create or edit `.env` and add:  
     `EXPO_PUBLIC_DASHBOARD_URL=http://YOUR_PC_IP:3000`  
     Example: `EXPO_PUBLIC_DASHBOARD_URL=http://192.168.1.10:3000`
   - Or change `DASHBOARD_API_URL` in `app/(tabs)/(home)/report-violation.tsx` if you prefer not to use env.

2. Run the app: `npx expo start`. Use a real device or emulator on the same network as the PC running the dashboard so it can reach `YOUR_PC_IP:3000`.

3. Install new dependency: `npx expo install expo-image-picker`.

## Testing

- From the app: open Report violation → Take photo or Choose file → select violation category → Submit. You should see “Report submitted” and, after refreshing the dashboard’s Traffic Violation page, the new result and photo in the table.
- With **MODELS_DIR** unset, the API returns 503 and a message asking you to set it.
