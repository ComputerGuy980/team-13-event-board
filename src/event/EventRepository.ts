import type { Result } from "../lib/result";
import type { AuthError } from "../auth/errors";
import type { EventStatus, IEventRecord } from "./Event";

export interface IEventRepository {
    create_event(event: IEventRecord): Promise<Result<IEventRecord | null, AuthError>>
    get_event(id: number): Promise<Result<IEventRecord | null, AuthError>>
    edit_event(id: number, event: IEventRecord): Promise<Result<boolean, AuthError>>
    set_event_status(id: number, status: EventStatus): Promise<Result<boolean, AuthError>>;
    list_events(): Promise<Result<IEventRecord[], AuthError>>
}