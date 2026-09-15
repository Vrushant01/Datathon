import { Request, Response } from 'express';

interface SSEClient {
    id: string;
    res: Response;
    role: string;
    stationId?: number;
    employeeId?: number;
}

class SSEService {
    private clients: SSEClient[] = [];

    public connectClient(req: Request, res: Response) {
        // Headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        // Disable proxy/Nginx response buffering so events are streamed immediately
        res.setHeader('X-Accel-Buffering', 'no');
        // Flush headers immediately so the browser recognises this as an event stream
        res.flushHeaders();

        // Write an initial SSE comment to flush the response buffer through any intermediary
        // (some reverse proxies buffer until the first byte is received)
        res.write(': connected\n\n');

        // Extract user context from auth middleware
        const user = (req as any).user;
        const role = user?.role || 'Guest';

        const clientId = Date.now().toString() + Math.random().toString(36).slice(2);

        const client: SSEClient = {
            id: clientId,
            res,
            role,
            stationId: user?.unitId || undefined,
            employeeId: user?.employee_id ? Number(user.employee_id) : undefined
        };

        this.clients.push(client);
        console.log(`[SSE] Client connected: ${clientId} (${role})`);

        // Send initial connection success event
        this.sendEventToClient(client, 'CONNECTED', { message: 'SSE Connection Established', time: new Date().toISOString() });

        // Keep-alive heartbeat (every 25s) — must be shorter than any proxy idle timeout.
        // Uses a named HEARTBEAT event so it is a real HTTP data chunk (not just a comment)
        // ensuring the proxy does not close an "idle" connection.
        const heartbeat = setInterval(() => {
            try {
                this.sendEventToClient(client, 'HEARTBEAT', { time: Date.now() });
                if (typeof (client.res as any).flush === 'function') {
                    (client.res as any).flush();
                }
            } catch (err) {
                // The client response stream is closed — clean up
                clearInterval(heartbeat);
                this.clients = this.clients.filter(c => c.id !== clientId);
            }
        }, 25000);

        // Handle client disconnect
        req.on('close', () => {
            clearInterval(heartbeat);
            this.clients = this.clients.filter(c => c.id !== clientId);
            console.log(`[SSE] Client disconnected: ${clientId}`);
        });
    }

    private sendEventToClient(client: SSEClient, eventType: string, data: any) {
        try {
            client.res.write(`event: ${eventType}\n`);
            client.res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (err) {
            // Silently ignore — client already disconnected; heartbeat interval will clean up
        }

    }

    /**
     * Broadcast an event to all connected clients that are authorized to receive it.
     */
    public broadcast(eventType: string, data: any, options?: { stationId?: number, officerId?: number }) {
        console.log(`[SSE] Broadcasting ${eventType}`);
        
        this.clients.forEach(client => {
            let authorized = false;

            // Admin receives everything
            if (client.role === 'Admin' || client.role === 'SuperAdmin') {
                authorized = true;
            } else if (client.role === 'Station' || client.role === 'Analytics') {
                // Station/Analytics: receive FIR events only for their own station
                if (['FIR_CREATED', 'FIR_UPDATED', 'FIR_DELETED'].includes(eventType)) {
                    if (options?.stationId && client.stationId === options.stationId) authorized = true;
                } else {
                    // Non-FIR events (station/officer changes) broadcast to all Station users
                    authorized = true;
                }
            } else if (client.role === 'Officer') {
                // Officers: receive FIR events only for their own assigned FIRs
                if (['FIR_CREATED', 'FIR_UPDATED', 'FIR_DELETED'].includes(eventType)) {
                    if (options?.officerId && client.employeeId === options.officerId) authorized = true;
                    // Also receive if it's their station (for new FIRs at their station)
                    if (options?.stationId && client.stationId === options.stationId) authorized = true;
                } else {
                    // Non-FIR events broadcast to all authenticated Officers
                    authorized = true;
                }
            } else {
                // Globally broadcastable events (station/officer CRUD) reach all authenticated users
                if (['STATION_CREATED', 'STATION_UPDATED', 'STATION_DELETED', 'OFFICER_CREATED', 'OFFICER_UPDATED', 'OFFICER_DELETED', 'ASSIGNMENT_UPDATED'].includes(eventType)) {
                    authorized = true;
                }
            }

            if (authorized) {
                this.sendEventToClient(client, eventType, data);
            }
        });
    }
}

export const sseService = new SSEService();
