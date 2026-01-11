# SafeLink – AI-Powered Public Safety Platform for Sri Lanka 🇱🇰

## Project Overview

**SafeLink** is an AI-powered, multilingual mobile platform designed to enhance public safety and community policing in Sri Lanka. The system addresses critical gaps in existing emergency response and policing solutions by integrating real-time communication, intelligent data analysis, and citizen engagement into a single digital ecosystem.

Traditional SOS and crime-reporting systems often rely on delayed communication, limited context, or manual processing. SafeLink overcomes these limitations by combining **real-time GPS tracking, live audio/video streaming, AI-driven threat detection, automated traffic violation handling, and proactive social media monitoring**. The platform enables law enforcement agencies to respond faster, prioritize critical cases, and make data-driven decisions while empowering citizens to actively participate in community safety.

The solution is designed specifically for the Sri Lankan context, supporting **Sinhala and English**, localized datasets, and region-specific public safety challenges.

---

## System Architecture

SafeLink follows a **modular, service-oriented architecture** that supports scalability, real-time processing, and secure data handling.

### High-Level Architecture
- Citizen Mobile Application (React Native)
- Backend API & Real-Time Communication Layer
- AI/ML Processing Services
- Secure Databases & Media Storage
- Police Monitoring & Analytics Dashboard

### Architecture Flow
1. Users interact with the mobile app to report incidents, activate SOS alerts, or access traffic services.
2. Requests are handled by backend APIs and real-time services.
3. AI pipelines analyze images, videos, audio, text, and location data.
4. Processed results are stored securely and visualized in police dashboards.
5. Authorities receive real-time alerts and insights for rapid response.

📌 **System Architecture Diagram (Figma):**
https://www.figma.com/design/twgRcDduS1NeY4YLBpQNgP/Untitled?node-id=0-1&t=Ok8AVejIuku8hXcr-1

---

## Technologies Used

### Mobile & Frontend
- React Native
- GPS & Location Services
- Camera and Microphone APIs
- WebSockets for real-time updates

### Backend & Infrastructure
- Node.js with Express
- REST APIs
- WebSocket-based real-time communication
- OAuth 2.0 & JWT authentication
- Secure cloud-based storage

### Artificial Intelligence & Machine Learning
- YOLOv11 (object and action detection)
- Whisper / Wav2Vec2 (speech-to-text)
- BERT / RoBERTa / XLM-R (NLP)
- Machine learning models for:
  - Risk prediction
  - Alert validation
  - Traffic pattern analysis

### Data & Security
- GPS and geospatial analysis
- Encrypted data storage
- Role-based access control
- Secure digital transaction handling

---

## System Components

---

## 1. AI-Powered Women and Children Safety Risk Prediction System (INDUDUNU I W O - IT22321054)

### Overview
This component is responsible for analyzing incident data related to women and children using video, audio, and text. It detects women and children from video content, extracts and transcribes audio using speech recognition, and analyzes the resulting text to identify the type of incident. The system filters relevant incidents, stores them with time and location information, and uses this data to support safety risk analysis and prediction. The main purpose of this component is to convert raw multimedia data into meaningful safety insights that can help generate alerts and improve public safety decision-making.

### Workflow
1. Users create a safety alert with text, GPS location, and optional media.
2. The backend validates alerts using NLP and image analysis.
3. Alerts are clustered geographically into neighborhood zones.
4. Verified alerts are shared with nearby users.
5. Gamification mechanisms reward active participation.
6. Police and moderators monitor alerts via dashboards.
7. Push notifications inform users of nearby safety events.

### Technologies Used
- React Native
- GPS-based services
- Node.js & Express
- WebSockets
- NLP-based spam detection
- Image similarity analysis
- Push notification services
- JWT-based authentication

## Future Development & Enhancements (By Next Evaluation)
- Improve Sinhala–English incident dataset and increase NLP accuracy.
- Fuse video + audio + text outputs into one incident decision (confidence-based).
- Store structured incidents in DB (time, location, incident type, confidence).
- Build risk prediction layer (risk zones + time patterns), heatmap + alerts.
- Create APIs (FastAPI) and connect to simple Mobile UI + Police dashboard.

---

## 2. Emergency SOS with Real-Time Location & Live Streaming(AMARADASA S A A M - IT22003096)

### Overview
The Emergency SOS with Real-Time Location & Live Streaming component is designed to improve emergency response by enabling users to send instant SOS alerts with live GPS location, video, and audio. Unlike traditional emergency systems that rely only on voice calls or text messages, this component provides real-time situational awareness to emergency responders.

The system uses AI-based video detection (YOLOv11) to identify threats such as weapons, fire, and accidents, audio analysis (YAMNet) to detect distress sounds, and natural language processing (NLP) to understand the user’s emergency message. All these inputs are combined to assess the severity of the situation and help authorities prioritize responses quickly and accurately.

This component aims to reduce response time, improve decision-making, and enhance public safety through a smart, secure, and user-friendly emergency communication system.

### Workflow
1. User activates SOS with a single tap.
2. Real-time GPS tracking begins.
3. Live video and audio streaming is initiated.
4. AI analyzes video, audio, and location risk.
5. A risk score is calculated to assess severity.
6. High-risk cases are escalated automatically.
7. Police view live streams and AI insights on dashboards.
8. Tracking continues until resolution.

### Technologies Used
- React Native
- Mobile camera & microphone APIs
- GPS tracking
- WebRTC / live streaming protocols
- YOLOv11
- Audio analysis models
- Machine learning risk scoring
- WebSockets

## Future Development & Enhancements (By Next Evaluation)
- **Multimodal Model Integration** - Integrate YOLO-based video detection, YAMNet audio classification, and NLP text analysis into a single real-time SOS processing pipeline.
- **Severity Scoring & Prioritization** - Combine video, audio, and text outputs to calculate a unified emergency severity score for better case prioritization.
- **Enhanced Police Dashboard** - Improve the dashboard to support live video/audio streams, SOS alerts, location tracking, and priority-based case handling.
- **NLP Model Expansion** - Train and fine-tune the NLP model using Sinhala and English emergency text datasets for better intent and distress detection.
- **Performance Optimization** - Reduce end-to-end latency from SOS activation to responder notification.
- **Evaluation & Validation** - Evaluate system performance using accuracy, response time, reliability, and user acceptance metrics.
- **Security & Privacy Enhancements** - Strengthen encryption, secure evidence storage, and role-based access control to protect user data.
- **Deployment & Real-World Testing** - Prepare the system for deployment and conduct real-world testing with simulated emergency scenarios.

---

## 3. Real-Time AI System for Detecting Harmful Social Media Content (FERNANDO P K S - IT22329660)

### Overview
This component uses AI to automatically detect harmful social media content such as harassment, hate speech, abuse, and violent threats. It supports both Sinhala and English, including mixed-language text commonly used in Sri Lanka. The system categorizes harmful messages, displays results with confidence levels on a monitoring dashboard, and helps authorities respond quickly to high-risk content, improving online safety and monitoring efficiency.

1. Public social media content is continuously fetched.
2. Keyword-based pre-filtering selects candidate content.
3. Text, video, and audio are analyzed in parallel.
4. Speech is transcribed and passed to NLP models.
5. Multi-modal predictions are fused into a final decision.
6. High-confidence harmful content triggers alerts.
7. Authorities receive real-time notifications.
8. Confirmed cases are used for continuous model improvement.

### Technologies Used
- Social media APIs - Collect real-time posts, comments, videos, and audio from social media platforms for monitoring.
- YOLOv11 (video action detection) - Detects violent or harmful actions from video content in real time.
- Video processing pipelines - Extract and manage video frames and streams for efficient analysis.
- Whisper / Wav2Vec2 - Convert speech from videos or audio into text for further harmful content analysis.
- BERT / RoBERTa / XLM-R - Analyze text to classify harassment, hate speech, abuse, and violent threats.
- Multilingual NLP (Sinhala & English) - Enables understanding of Sinhala, English, and mixed-language social media content.
- Stream processing frameworks - Process large volumes of content continuously in real time.
- Alerting systems - Trigger alerts for high-risk content to enable quick review or action.

## Future Development & Enhancements (By Next Evaluation)
- **Explainable AI (XAI):** Generate human-readable explanations for model predictions
- **Multimodal Fusion:** Combine text, audio, and video insights for better accuracy
- **Context-Aware Detection:** Improve understanding of sarcasm and local slang
- **Advanced Alerting:** Prioritize alerts based on threat severity

---

## 4. Smart Traffic Violation Detection & Accident Prediction System(JAYAKODY J M P S B - IT22331236)

### Overview
This component focuses on developing an AI-powered system to automatically detect traffic violations and predict accident-prone situations in real time. The system analyzes images and videos captured from CCTV cameras, mobile devices, and user submissions to identify traffic rule violations such as illegal lane crossing, signal violations, and unsafe driving behavior. It also integrates vehicle detection and number plate recognition to support enforcement actions. By providing real-time alerts and risk predictions, the system assists police authorities in improving road safety, reducing manual monitoring effort, and enabling faster response to traffic incidents.


### Workflow
1. Traffic images and videos are collected from CCTV feeds and user-reported submissions.
2. Input data is pre-processed to enhance visibility and remove noise.
3. AI-based object detection identifies vehicles, lanes, traffic signals, and road markings.
4. Traffic violations such as lane violations and illegal movements are detected using rule-based logic combined with AI predictions.
5. Vehicle number plates are automatically detected and extracted for identification.
6. Historical traffic patterns and contextual factors are analyzed to predict accident-prone situations.
7. Detected violations and risk scores are displayed on a police monitoring dashboard.
8. High-risk violations trigger real-time alerts for enforcement or preventive action.

Verified cases are stored to continuously improve model accuracy.
### Technologies Used
- CCTV / Mobile Camera Inputs – Capture real-time traffic images and videos for analysis.
- YOLOv11 (Object Detection) – Detect vehicles, number plates, and traffic-related objects accurately in real time.
- Computer Vision Pipelines – Process video frames and images efficiently for detection and tracking.
- License Plate Detection & OCR – Identify vehicle registration numbers to support enforcement and record keeping.
- Rule-Based Violation Logic – Determine traffic violations based on detected objects and road rules.
- Accident Risk Prediction Models – Analyze traffic density and behavior patterns to estimate accident probability.
- Real-Time Dashboard – Visualize violations, confidence scores, and vehicle details for police monitoring.
- Alerting System – Notify authorities immediately when severe violations or high-risk situations are detected.

---


## Future Development & Enhancements (By Next Evaluation)
- **Violation Logic Implementation:** Implement rule-based logic on top of the trained detection model to automatically classify detected events as valid traffic violations (e.g., lane violations, illegal crossings).
- **End-to-End Testing with Images and Videos:** Test the trained models using real-world images and video inputs to validate detection accuracy and robustness under different traffic conditions.
- **License Plate Recognition Integration:** Integrate license plate detection with OCR to extract vehicle registration numbers from detected violations.
- **Confidence-Based Filtering:** Apply confidence score thresholds to reduce false positives and ensure reliable violation detection results.
- **Dashboard Data Binding:** Connect model outputs (violation type, vehicle number, confidence score) to the police dashboard UI designed in Figma.
- **Performance Evaluation & Visualization:** Analyze precision, recall, mAP, and confusion matrices to evaluate model performance and include these results in the evaluation report.
- **System Demonstration Preparation:** Prepare a working demonstration showing image/video upload, violation detection, and result visualization for the PP2 presentation. Prioritize alerts based on threat severity

---

## Conclusion

SafeLink is a comprehensive AI-driven public safety platform that modernizes community policing in Sri Lanka. By combining real-time communication, advanced AI technologies, and citizen engagement, the system enables faster emergency responses, transparent traffic management, and proactive threat detection. The modular and scalable design ensures that SafeLink can evolve with future public safety needs while building trust between citizens and law enforcement.
