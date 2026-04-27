# Humor Caption Workflow

A multi-app system for creating, testing, rating, and analyzing humor caption flavors.

This project includes three connected applications:

1. **Caption Creation and Rating App**  
   Generates or displays captions for users to evaluate and vote on.

2. **Admin Dashboard**  
   Shows caption rating statistics and system-level performance insights.

3. **Prompt Chain / Humor Flavor Tool**  
   Lets admins manage humor flavors and their related prompt steps, including duplication for fast iteration.

---

## Overview

The goal of this project is to support an end-to-end humor caption workflow:

- define humor flavors
- configure prompt steps
- test and generate captions
- collect user votes on captions
- analyze rating outcomes in an admin dashboard

The system is designed to make humor iteration easier by connecting prompt design, user feedback, and admin-side analytics.

---

## Features

### Humor Flavor Management
- Create and edit humor flavors
- Configure linked humor flavor steps
- Duplicate a humor flavor with all related steps
- Automatically generate a unique name for duplicated flavors

### Caption Generation and Testing
- Test flavors against the caption generation flow
- Show visible loading states during generation
- Improve usability of editing prompt steps and temperature values

### Caption Rating
- Users can vote on captions
- Vote data is stored and used for downstream analytics

### Admin Statistics Dashboard
- Displays meaningful statistics about captions being rated
- Uses live vote and score data
- Includes:
  - total votes
  - total scored captions
  - average caption score
  - vote sentiment breakdown
  - top captions
  - bottom captions

---

## Apps

### 1. Caption Creation and Rating App
This app is used to generate or review captions and collect user votes.

Main responsibilities:
- present captions to users
- support voting interactions
- persist vote data for analytics

### 2. Admin Dashboard
This app provides an analytics view into caption performance.

Main responsibilities:
- summarize rating activity
- display key admin metrics
- surface strongest and weakest performing captions

### 3. Prompt Chain / Flavor Tool
This app is used to manage humor flavors and prompt-step workflows.

Main responsibilities:
- manage humor flavor definitions
- edit prompt steps
- duplicate existing flavors for experimentation
- test flavor output

---

## Data Sources

The admin statistics view is powered by confirmed live Supabase data sources:

- `caption_votes` for raw vote activity
- `caption_scores` for aggregated caption score data

Flavor management uses:
- `humor_flavors`
- `humor_flavor_steps`

---

## Testing Summary

The system was tested end-to-end across all three applications.

Tested workflows included:
- duplicating humor flavors and confirming linked steps were copied correctly
- editing humor flavor steps and temperature inputs
- generating captions and verifying loading states
- rating captions with positive and negative votes
- confirming admin statistics updated correctly from live data
- verifying top and bottom caption sections rendered accurately
- checking blocked delete behavior when linked steps still exist
- re-running the full workflow multiple times after fixes to confirm demo readiness

---

## Key Fixes Made

During testing and final polish, the following issues were identified and fixed:

- Fixed humor flavor duplication to correctly copy related steps with a unique new name
- Improved the admin stats page to use real vote and score data
- Fixed editing issues where humor step inputs and temperature fields were resetting unexpectedly
- Added visible loading states during caption generation/testing
- Improved deletion UX for humor flavors with linked steps
- Refined the flavor detail layout so the testing panel is more prominent

---

## Running the Project

Because this project consists of multiple apps, each app may be run separately depending on your repo structure.

Typical local workflow:

```bash
npm install
npm run dev