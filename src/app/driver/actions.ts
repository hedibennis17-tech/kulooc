'use server';

import { GoOnlineBlocker as GoOnlineBlockerType } from "./page";
export type GoOnlineBlocker = GoOnlineBlockerType;

export type GoOnlineResponse = {
    success: true;
    data: {
        allowed: boolean;
        blockers?: GoOnlineBlocker[];
    };
} | {
    success: false;
    error: string;
};

// The API endpoint from the spec
const GO_ONLINE_URL = 'https://api.kulooc.ca/v1/driver/go-online/attempt';

export async function goOnlineAttempt(): Promise<GoOnlineResponse> {
    // In a real app, these values would be dynamic.
    const requestBody = {
        device_id: 'mock-device-id',
        app_version: '1.0.0',
        device_os: 'mock-os-17',
        gps: {
            lat: 45.5019,
            lng: -73.5674
        }
    };

    try {
        // We'll mock the response for now, as the API endpoint is likely not live.
        // In a real scenario, this would be a fetch call:
        /*
        const response = await fetch(GO_ONLINE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Authorization header would be needed
                // 'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }
        const data = await response.json();
        */

        // MOCK RESPONSE aligned with OpenAPI spec
        const mockData = {
            allowed: false,
            blockers: [
                {
                    code: 'DOC_EXPIRED',
                    title: 'Document expiré',
                    action: {
                        cta: 'Téléverser votre assurance',
                        deeplink: '/driver/documents'
                    },
                    detail: 'Votre police d\'assurance a expiré le 15/02/2026. Veuillez en téléverser une nouvelle pour continuer à conduire.',
                }
            ]
        };
        
        // To test the "allowed" state, you can use this mock data instead:
        // const mockData = { allowed: true };

        return { success: true, data: mockData };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error("Go Online Attempt Error:", errorMessage);
        return { success: false, error: errorMessage };
    }
}
