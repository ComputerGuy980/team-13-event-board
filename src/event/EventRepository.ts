import type { Result } from "../lib/result";
import type { EventError } from "./errors";
import type { EventStatus, IEventRecord } from "./Event";

export interface IEventRepository {
    create_event(event: IEventRecord): Promise<Result<IEventRecord | null, EventError>>
    get_event(id: number): Promise<Result<IEventRecord | null, EventError>>
    edit_event(id: number, event: IEventRecord): Promise<Result<boolean, EventError>>
    set_event_status(id: number, status: EventStatus): Promise<Result<boolean, EventError>>;
    list_events(): Promise<Result<IEventRecord[], EventError>>
}