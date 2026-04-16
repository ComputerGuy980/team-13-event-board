export type EventStatus = "draft" | "published" | "cancelled" | "past";

export interface IEventRecord {
    id: number,

    title: string,
    description: string,
    location: string,
    category: string,

    status: EventStatus,

    capacity: number,

    startDatetime: number,
    endDatetime: number,
    
    organizerId: number,

    createdAt: number,
    updatedAt: number
}