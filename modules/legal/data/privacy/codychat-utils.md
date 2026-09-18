---
title: Codychat Utilities - Privacy
created: 14-9-2026
---

## Codychat Extensions' Privacy Policy

### Introduction
We build our browser extensions with a privacy-first mindset. To function properly, our extensions must interact with the content on the websites you visit, which is always indicated by an active settings menu. By default, all data collection and processing—including reading on-screen content and web requests—happens **strictly locally** on your device, keeping web requests to Eridius servers to an absolute minimum.

### Opt-In "Smart" Features
To enhance your experience, you can choose to enable advanced features like **Smart Mode**, **Sauron Intelligence**, or **Reporting**. These opt-in modes download additional data from Eridius servers to improve detection accuracy and unlock extra features. In exchange, detection results are sent back to Eridius for analysis.

When these features are active, the data sent to our servers includes:

* The website URL you are visiting.
* Your username and user ID.
* An automatically generated session ID and your machine's current time.
* Standard web browser information (such as your configured language, browser type, operating system, and IP address).

*Transparency note: You can always see exactly what information is being transmitted by checking the logs in your extension's Dashboard.*

### A Note on "Models" and AI
We believe in absolute transparency about how your data is used. When we refer to detection "models," **we are not using Artificial Intelligence (AI) or generative AI**. Our models are essentially specialized databases of flagged keywords and matching rules that are actively built and managed by our human team. Furthermore, your reported data is **never** used to train AI systems.

### Third-Party Integrations: OpenAI Moderation
While our core infrastructure is entirely AI-free, we do offer a specific, optional feature called "OpenAI Moderation." If you explicitly choose to enable this feature, it leverages a third-party service provided by OpenAI. Any data processed through this specific tool is subject to OpenAI's API Privacy Policy for their Moderation API.

### What Data We Actually Store
We do not store all the information transmitted to us. The data we do retain is strictly limited and divided into two completely separate categories:

* **Detection Data:** This includes the flagged message content, the time it was detected and sent, and the profile details of the message sender (such as their username, age, and gender). This data is preserved solely for refining our human-managed detection models.
* **Security Data:** To prevent abuse of our systems, our security suite separately logs your IP address, browser name, version, and operating system.

### Your Choices and Granular Controls
All reporting features are 100% optional and opt-in. We provide granular settings so you can selectively choose exactly what data you share:

* **Local-Only Mode:** By disabling all "Reporting," "Smart Mode," or "Sauron Intelligence" features, the extension relies entirely on local processing. You can still manually import detection models from our source code repositories, though they will not auto-update.
* **Error Logs Only:** You can opt to submit only error logs, which completely prevents the transmission of any chat message content from the websites you visit.
* **Manual Reporting Only:** You can choose to only forward reports that you manually select using the built-in reporting system, keeping all other message data completely private.

### Data Retention, Deletion, and Your Rights
Eridius internationally respects and complies with GDPR data rights. If you are the subject of a detection, you can request the anonymization of your data by emailing [support@eridi.us](mailto:support@eridi.us) and providing your usernames for the applicable chat sites.

Please note the following legal exceptions to deletion requests:

* **30-Day Mandatory Hold:** For legal and moderation purposes, we cannot delete or anonymize data that is newer than 30 days. This ensures the data remains available if law enforcement or site moderators need to investigate illegal behavior. Once the data is older than 30 days, it is eligible for anonymization.
* **Mandated Reporting:** If, during the processing of a deletion request, we discover data that contains definitively illegal content, Eridius reserves the right to refuse anonymization under GDPR provisions. Because we reside in the United States, we are also required by mandated reporting laws to contact the applicable authorities in these events.
