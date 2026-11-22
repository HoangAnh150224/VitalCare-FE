export const calls = { connect: 0, disconnect: 0 };
export function connect() { calls.connect++; }
export function disconnect() { calls.disconnect++; }
