export type RSVPError = 
 | { name: "RSVPNotFound"; message: string }
 | { name: "RSVPFailedInstantiation"; message: string }

 export const RSVPNotFound = (message: string): RSVPError => ({
    name: "RSVPNotFound",
    message: message
});

export const RSVPFailedInstantiation = (message: string): RSVPError => ({
    name: "RSVPFailedInstantiation",
    message: message
});
