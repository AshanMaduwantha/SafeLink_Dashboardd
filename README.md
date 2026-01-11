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

## 1. Community Alerts & Neighborhood Watch (INDUDUNU I W O - IT22321054)

### Overview
This component enables citizens to share real-time safety alerts within their local communities while maintaining reliability through AI-based validation.

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

---

## 2. Emergency SOS with Real-Time Location & Live Streaming(AMARADASA S A A M - IT22003096)

### Overview
A one-touch emergency feature designed to provide police with real-time situational awareness during critical incidents.

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

## 4. Traffic Violation Reporting & Fine Payment(JAYAKODY J M P S B - IT22331236)

### Overview
An intelligent digital traffic management system that automates violation detection, fine handling, and dispute resolution.

### Workflow
1. Violations are captured via CCTV, dashcams, or user uploads.
2. AI detects violations and recognizes license plates.
3. Violation records are stored securely.
4. ML models analyze trends and high-risk locations.
5. Users receive fine notifications via the app.
6. Digital payment and dispute options are provided.
7. NLP chatbot handles user queries.
8. Authorities access analytics dashboards.

### Technologies Used
- React Native
- Computer vision (ALPR)
- YOLOv11
- Machine learning analytics
- NLP chatbot
- Secure payment gateways
- Backend APIs & databases

---

## Conclusion

SafeLink is a comprehensive AI-driven public safety platform that modernizes community policing in Sri Lanka. By combining real-time communication, advanced AI technologies, and citizen engagement, the system enables faster emergency responses, transparent traffic management, and proactive threat detection. The modular and scalable design ensures that SafeLink can evolve with future public safety needs while building trust between citizens and law enforcement.
