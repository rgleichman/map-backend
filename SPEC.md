# Storymap Specification

## Overview

Storymap is a collaborative map application where users can add location
markers (pins) to a shared world map. Users can view all pins, and
authenticated users can create, edit, and delete their own pins.

## Core Functionality

### Map Viewing

- All users (authenticated and unauthenticated) can view the map
- All users can see all pins on the map
- Pins display title, description, tags, pin type, and optional start/end
  times
- Users can filter pins by tags
- Map includes search functionality for finding locations (geocode)

### Pin Data Model

- **Title** (required)
- **Pin type** (required): `one_time`, `scheduled`, or `food_bank`
- **Location** (required): latitude and longitude
- **Description** (optional, markdown)
- **Tags** (optional, multiple per pin)
- **Icon URL** (optional): image URL for the pin
- **Start time / End time** (optional): for scheduled or time-bounded pins
  (UTC)

### Pin Management

#### Adding Pins

- **Requirement**: Users must be logged in to add pins
- **Behavior**:
  - Logged-in users can click anywhere on the map to add a new pin at that
    location
  - Non-logged-in users who attempt to add a pin will see a notice prompting
    them to log in
- Location can be set or changed by: (1) "Set location on map" then tapping
  the desired point on the map, (2) searching for a place or address and
  selecting a result (geocode), or (3) "Use my location" for current GPS
  position.

#### Editing Pins

- **Requirement**: Users must be logged in to edit pins
- **Behavior**:
  - Only the pin owner can see edit controls for their pins
  - Users can edit title, description, tags, pin type, icon URL, start/end
    times, and location for their own pins
  - Location can be changed by: (1) "Change location on map" and tapping a
    point, (2) searching for a place/address, or (3) "Use my location".
    Changes are saved when the user saves the pin.
  - Non-logged-in users do not see edit controls

#### Deleting Pins

- **Requirement**: Users must be logged in to delete pins
- **Behavior**:
  - Only the pin owner can delete their pins
  - Non-logged-in users do not see delete controls

### Real-time Updates

- When a user adds a new pin, it appears on the map for all users in
  real-time
- When a user edits a pin, the changes are broadcast to all connected users
  in real-time
- When a user deletes a pin, the deletion is broadcast to all connected users
  in real-time
- All users see these changes immediately

### User Authentication

- Users can register for new accounts
- Users can log in and log out
- Users can manage their account settings (requires authentication)
- User profiles are publicly viewable

## Authentication Requirements Summary

| Action | Authentication Required | Owner-Only |
|--------|------------------------|------------|
| View map and pins | No | No |
| Add pin | Yes | No |
| Edit pin | Yes | Yes |
| Delete pin | Yes | Yes |
