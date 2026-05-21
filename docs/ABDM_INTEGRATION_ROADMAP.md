# Ayushman Bharat Digital Mission (ABDM) Integration Roadmap

This document outlines the complete roadmap and execution steps required to make **Homeo-X** a fully certified and compliant software within India's Ayushman Bharat Digital Mission (ABDM) ecosystem.

---

## 1. Current Progress: Milestone 1 (M1)
**Goal:** Allow clinics to verify patient identity and link their ABHA (Health ID) to their local Homeo-X clinic registration.

### What We Have Implemented (Sandbox Environment)
- **Database Architecture:** Expanded the `patients` schema to store `abha_id` and the encrypted `abha_profile` securely.
- **Integration with ABDM Sandbox API:** Integrated the Gateway and Health ID APIs for searching by Aadhaar/Mobile, generating OTPs, and verifying OTPs to fetch ABHA details.
- **User Interface:** Developed a premium, medical-grade modal UI (glassmorphism design) to seamlessly guide receptionists and doctors through the ABHA linking process.
- **Tenant Isolation:** Ensured all API requests pass through the multi-tenant architecture securely.

### What Is Left for M1 (Next Steps)
- **Error Handling & Edge Cases:** Handle scenarios where the patient Aadhaar is not linked to a mobile number.
- **ABDM Functional Testing:** Record a demonstration of the Homeo-X ABHA linking flow to submit to the National Health Authority (NHA) for Milestone 1 Certification.

---

## 2. Execution Steps for Remaining Features (Milestones 2 & 3)

To become a "Complete ABHA Approved Project," Homeo-X must implement Milestone 2 (HIP) and Milestone 3 (HIU).

### Phase 2: Becoming a Health Information Provider (HIP)
**Goal:** Push prescriptions, diet charts, and lab reports generated in Homeo-X into the patient's personal ABHA app.

1. **FHIR Standard Implementation:**
   - The government requires medical data to be structured in **FHIR R4 (Fast Healthcare Interoperability Resources)** format.
   - **Action:** Build a transformer service in the Node.js API that converts Homeo-X prescriptions (remedies, potencies, dosages) into valid FHIR JSON bundles.
2. **HIP Callback URLs:**
   - **Action:** Expose public webhooks (endpoints) on the Homeo-X API. When a patient opens their ABHA app and asks for their data, the ABDM Gateway will ping your webhook.
3. **Data Push Mechanism:**
   - **Action:** When pinged, the Homeo-X server encrypts the FHIR JSON document and pushes it securely to the ABDM gateway.

### Phase 3: Becoming a Health Information User (HIU)
**Goal:** Allow the Homeopath to request and view the patient's past medical history from other hospitals/clinics.

1. **Consent Management UI:**
   - **Action:** Add a "Request Medical History" button on the Homeo-X Patient Detail page.
   - **Action:** Send a consent request API call to ABDM. This triggers a push notification on the patient's phone asking for permission.
2. **Data Fetching & Decryption:**
   - **Action:** Implement a listener webhook to receive the "Consent Granted" notification.
   - **Action:** Fetch the encrypted medical records from the ABDM gateway, decrypt them using your HIU private keys, and store them temporarily in the Homeo-X database.
3. **Medical History Viewer:**
   - **Action:** Build a "External Medical Records" UI in the Homeo-X frontend to display the fetched FHIR data (blood tests, previous allopathic prescriptions, allergies) in a readable format for the homeopath.

---

## 3. Certification and Go-Live Strategy

Once the code for M1, M2, and M3 is fully implemented in the Sandbox, you must follow these official steps to go live:

1. **Functional Testing (NHA Review):**
   - Record videos of your software demonstrating the ABHA linking, Consent Request, and Prescription Sharing flows.
   - Submit these videos and test logs to the ABDM Sandbox portal.
2. **Information Security (IS) Audit:**
   - Before granting production access, NHA requires an IS Audit.
   - You must hire a CERT-In empaneled auditor to run penetration tests and vulnerability scans on the Homeo-X web application and API.
   - Submit the clean IS Audit report to the NHA.
3. **Production Keys:**
   - Once approved, NHA will issue Production API Keys.
   - Switch out the Sandbox URLs and Keys in your `.env` file with the Production credentials.
4. **Market Launch:**
   - Homeo-X will officially be listed on the ABDM Partners Registry as an approved digital health solution.
   - Clinics using Homeo-X can now claim Digital Health Incentive Scheme (DHIS) rewards from the government.
