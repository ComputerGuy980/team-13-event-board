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
    
    organizerId: string,

    createdAt: number,
    updatedAt: number
}