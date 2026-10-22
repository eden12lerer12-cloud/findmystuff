# FindMyStuff – Project Vision & Development Instructions

## 1. Project Overview

I'm developing FindMyStuff, an open-source application designed to help people remember, organize, and find personal belongings inside their homes.

The goal is to solve a common everyday problem: people frequently forget where they placed their keys, passport, documents, tools, electronics, or other household items.

FindMyStuff should act as a personal AI-powered memory assistant for physical objects.

**Important:** This is an existing project. First, analyze the current codebase, architecture, technologies, and implemented features. Preserve existing functionality and build on the current implementation rather than starting over.

## 2. Core Functionality

### A. Smart Item Memory

Users should be able to record where they placed an object using natural language.

Example:

User: "I put my passport in the second drawer of my bedroom."

The application should understand and save:

- Item: Passport
- Room: Bedroom
- Storage location: Drawer
- Specific location: Second drawer
- Date and time recorded

Later, the user can ask:

"Where is my passport?"

The application should retrieve the stored location and respond:

"Your passport was last recorded in the second drawer of your bedroom."

Support natural-language queries, spelling variations, synonyms, and multiple languages, including English and Hebrew.

### B. AI-Powered Photo Recognition

Allow users to photograph rooms, drawers, shelves, and storage areas.

The application should eventually support:

- Identifying recognizable objects in uploaded images.
- Suggesting item names automatically.
- Associating identified objects with locations.
- Searching for objects based on previously uploaded photos.
- Showing the photograph associated with an item's location.

Example:

A user photographs a shelf containing headphones, sunglasses, and a wallet.

The AI identifies these objects and suggests adding them to the inventory.

The user confirms the suggestions before saving them.

**Important:** AI image recognition can be inaccurate. Clearly distinguish between confirmed item locations and AI-generated suggestions.

### C. Natural Language Search

Users should be able to search conversationally.

Examples:

- "Where did I put my car keys?"
- "Show everything stored in my bedroom."
- "Where are my travel documents?"
- "What items did I save yesterday?"
- "Find my black headphones."

Search should work even when the query does not exactly match the stored item name.

Initially, implement reliable structured search with synonyms and fuzzy matching. Add AI-based semantic search only when it provides a measurable improvement.

### D. Home Organization

Create a hierarchical home organization system.

Example:

Home → Bedroom → Closet → Upper shelf → Passport

Users should be able to:

- Create rooms.
- Add furniture and storage areas.
- Create nested storage locations.
- Move items between locations.
- See all items in a particular room.
- Search by item name, category, or location.

### E. Voice Input

Allow users to record item locations through speech.

Example:

"I left my wallet on the table next to the entrance."

The application should convert speech into text, interpret it, and ask the user to confirm the item and location before saving.

Design the architecture so voice recognition can be optional and expanded later.

### F. Item History

Maintain an optional history of location changes.

For example:

Passport:
- October 10: Bedroom drawer.
- October 15: Travel backpack.
- October 20: Bedroom closet.

The latest confirmed location should be displayed as the current known location.

Do not falsely claim to know an object's physical location if it has moved without being recorded.

## 3. User Experience & Interface

The application should feel modern, lightweight, intuitive, and accessible.

Design principles:

- Clean and minimal interface.
- Mobile-first responsive design.
- Fast navigation.
- Easy item registration.
- Prominent search bar.
- Clear room and storage hierarchy.
- Support for Hebrew and English.
- Full right-to-left support for Hebrew.
- Accessible colors, labels, and keyboard navigation.
- Friendly empty states and useful error messages.

The primary action should be extremely simple:

**"Remember where I put something."**

A user should be able to add an item in just a few seconds.

### Suggested Main Screens

1. Dashboard – Recent items, rooms, and quick actions.
2. Search – Natural-language item search.
3. Add Item – Manual entry, photograph, or voice input.
4. My Home – Rooms and storage locations.
5. Item Details – Photos, location, notes, and history.
6. Settings – Language, data management, privacy, and backup.

## 4. Privacy & Security

Privacy must be a core feature because the application may contain sensitive information about people's homes and belongings.

Requirements:

- Prefer local-first data storage for the initial version.
- Do not require account registration for basic functionality.
- Never upload household photographs to third-party AI services without clear user consent.
- Explain when cloud-based AI processing is used.
- Provide functionality to export personal data.
- Allow users to permanently delete their data.
- Never expose private user inventories through public API endpoints.
- Store API credentials securely; never embed secrets in frontend code.
- Avoid collecting unnecessary personal information.

If AI requires external API access, make it an optional feature.

Users must still be able to use the basic application without AI or paid API services.

## 5. Open-Source Requirements

FindMyStuff should become a genuinely useful open-source project.

Prepare the repository for public contributions.

Include:

- A professional README.md.
- Clear installation instructions.
- Local development instructions.
- A description of the architecture.
- Screenshots or demonstrations.
- An appropriate open-source license.
- CONTRIBUTING.md.
- A code of conduct.
- Issue and pull request templates.
- Automated tests.
- A documented roadmap.
- Clear documentation of optional API dependencies.

The application should be usable by developers without requiring paid services.

Make the code readable, modular, maintainable, and easy for contributors to understand.

Do not include proprietary assets, secret keys, or personal user data in the public repository.

## 6. Development Priorities

Do not attempt to implement every feature simultaneously.

### Phase 1 – Reliable MVP

Prioritize:

1. Adding items manually.
2. Creating rooms and storage locations.
3. Saving and updating item locations.
4. Searching for saved objects.
5. Viewing and editing item details.
6. Persistent local storage.
7. Responsive interface.
8. Hebrew and English support.
9. Basic automated tests.

The MVP should be stable, functional, and easy to use.

### Phase 2 – Smart Features

After the MVP is working:

1. Natural-language item registration.
2. Smarter search with synonyms.
3. Optional voice input.
4. Photo uploads.
5. AI-assisted object recognition.
6. Item location history.

### Phase 3 – Community & Advanced Features

Potential future developments:

1. Optional encrypted synchronization between devices.
2. Household sharing with explicit permissions.
3. Offline-first support.
4. Data import and export.
5. QR labels for storage containers.
6. Improved multilingual support.
7. Accessibility improvements.
8. Community-requested features.

## 7. Technical Expectations

Analyze the existing technologies before suggesting changes.

Prefer reusing the current stack unless there is a compelling technical reason to change it.

Follow these principles:

- Modular architecture.
- Clear separation of UI, data storage, search, and AI functionality.
- Well-defined data models.
- Input validation.
- Secure data handling.
- Automated testing for critical functionality.
- Minimal unnecessary dependencies.
- Good performance on mobile devices.
- Graceful handling of missing AI services.
- No unnecessary paid infrastructure.

Do not introduce complicated infrastructure before it is needed.

## 8. Product Limitations & Accuracy

The application must never suggest that it can magically locate lost objects.

It can retrieve previously recorded locations and analyze photographs that users have uploaded.

Without external tracking hardware, it cannot determine the real-time physical location of an object.

Use accurate wording such as:

"Last recorded location"

Instead of:

"Current location"

Unless the user has explicitly confirmed that the item remains there.

## 9. Long-Term Vision

FindMyStuff should become an accessible and privacy-focused open-source household memory assistant.

Its purpose is to help people:

- Save time searching for belongings.
- Organize their homes.
- Reduce everyday frustration.
- Remember where rarely used objects are stored.
- Manage household inventories more efficiently.

The project should be useful to ordinary people, including those with limited technical experience.

## 10. Your Immediate Task

Before implementing anything:

1. Inspect the existing project and identify its current functionality.
2. Compare the current implementation against this vision.
3. Identify missing features, bugs, architectural weaknesses, and potential security issues.
4. Create a prioritized development roadmap.
5. Recommend the smallest practical next implementation milestone.
6. Preserve all existing functionality and user data.
7. Explain your proposed changes before making major architectural decisions.
8. Implement improvements incrementally, with tests after each milestone.

Do not rewrite the entire application unnecessarily.

Focus on creating a real, trustworthy, useful product that people would voluntarily use and contribute to.

The goal is long-term value and an active open-source community, not merely meeting the minimum requirements for an OpenAI promotional program.
