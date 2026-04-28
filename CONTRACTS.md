Event
    id, title, description, location, category
    status: draft | published | cancelled | past
    capacity (optional — no limit if absent)
    startDatetime, endDatetime
    organizerId (user ID from session)
    createdAt, updatedAt

RSVP
    id, eventId, userId
    status: going | waitlisted | cancelled
    createdAt (determines waitlist order)



**Feature 1 — Event Creation**

What it does. Organizers can fill out a form to create a new event. A newly created event starts in draft status and is not visible to members until it is explicitly published. Members cannot access the creation form.
 
create_event (
    event: Event
)


**Feature 2 — Event Detail Page**

What it does. Any authenticated user can view a page showing the full details of a published event — its title, description, location, category, date and time, organizer name, and how many people are attending relative to the event's capacity. Organizers and admins see controls for editing and cancelling the event. Members see the RSVP button. Draft events are only visible to the organizer who created them and to admins; all other users receive a not-found response.

get_event (
    id: number
)


**Feature 3 — Event Editing**

What it does. Organizers can edit any field of an event they own, provided the event has not already been cancelled or concluded. Admins can edit any event regardless of who created it. Members cannot access the edit form. Attempting to edit a cancelled or past event should be rejected even if the user has the right role.

edit_event(
    id: number,
    event: Event
)


**Feature 4 — RSVP Toggle**

What it does. Members see an RSVP button on each event's detail page that reflects their current status. Clicking it toggles their attendance. If the event is full and the member is not already attending, they are placed on the waitlist instead. The button and attendee count update immediately without reloading the page. Organizers, admins, and anyone RSVPing to a cancelled or past event should be rejected.

get_rsvp_status (
    id: number
)

toggle_rsvp (
    id: number
)


**Feature 5 — Event Publishing and Cancellation**

What it does. From the event detail page, an organizer can publish a draft event or cancel a published one. Once cancelled, an event cannot be restored. Admins can cancel any event regardless of who created it. These transitions should update the page inline without a full reload. Attempting an invalid transition — such as publishing an already published event — should produce a clear error.

publish_event (
    id: number
)

cancel_event (
    id: number
)


**Feature 7 — My RSVPs Dashboard**

What it does. Members can visit a personal dashboard that shows all the events they have RSVPed to. The dashboard groups RSVPs into two sections: upcoming events they plan to attend (or are waitlisted for) and past or cancelled ones. Members can cancel an upcoming RSVP directly from this page without navigating away. Organizers do not attend events, so this page should not be accessible to them.

list_user_rsvp ()


**Feature 10 — Event Search**

What it does. The main event list includes a search input. As the user types, the list updates to show only published upcoming events whose title, description, or location matches the search term. The search is debounced so the server is not hit on every keystroke. Clearing the search restores the full list.

search_events (
    query: string
)


**Feature 11 — Past Event Archiving**

What it does. Events are automatically moved to past status once their end time has passed. This happens on the server — not through any user action. Past events are removed from the main event list and collected on a separate archive page that any authenticated user can browse. The archive can be filtered by category.